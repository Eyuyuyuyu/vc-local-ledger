import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { getInitialTheme, setTheme, toggleTheme } from './ui/theme'
import type { Category, RecordItem, DateRange } from './data/types'
import { createStorage } from './data/storage'

function todayIso(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function App() {
  const [theme, setThemeState] = useState(getInitialTheme())
  const [date, setDate] = useState<string>(todayIso())
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<string>('')
  const [amountInput, setAmountInput] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')

  // list view states
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('day')
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all')
  const [searchText, setSearchText] = useState<string>('')
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loadingList, setLoadingList] = useState<boolean>(false)
  const [listError, setListError] = useState<string>('')
  const [pageSize] = useState<number>(50)
  const [visibleCount, setVisibleCount] = useState<number>(50)

  useEffect(() => {
    setTheme(theme)
  }, [theme])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const storage = await createStorage()
      // seed default categories if none
      const list = await storage.listCategories()
      if (!cancelled && list.length === 0) {
        const defaults: Category[] = [
          { id: 'food', name: '餐饮', icon: '🍚', color: '#FF7F50', sort: 1 },
          { id: 'transport', name: '交通', icon: '🚌', color: '#1E90FF', sort: 2 },
          { id: 'shopping', name: '购物', icon: '🛍️', color: '#8A2BE2', sort: 3 },
          { id: 'entertain', name: '娱乐', icon: '🎮', color: '#32CD32', sort: 4 },
          { id: 'other', name: '其他', icon: '📦', color: '#708090', sort: 99 },
        ]
        for (const c of defaults) await storage.upsertCategory(c)
      }
      const latest = await storage.listCategories()
      if (!cancelled) {
        setCategories(latest)
        if (latest.length > 0) setCategoryId((v) => v || latest[0].id)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  // compute current range by mode
  const range: DateRange = useMemo(() => {
    const base = new Date(date + 'T00:00:00')
    const toIso = (d: Date) => {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
    if (mode === 'day') {
      const iso = toIso(base)
      return { start: iso, end: iso }
    }
    if (mode === 'week') {
      const day = base.getDay() || 7
      const monday = new Date(base)
      monday.setDate(base.getDate() - (day - 1))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { start: toIso(monday), end: toIso(sunday) }
    }
    const first = new Date(base.getFullYear(), base.getMonth(), 1)
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0)
    return { start: toIso(first), end: toIso(last) }
  }, [date, mode])

  // load records for range + filters
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingList(true)
      setListError('')
      try {
        const storage = await createStorage()
        const res = await storage.queryRecordsByDate(range)
        let items = res.items
        if (filterCategoryId !== 'all') items = items.filter((r) => r.categoryId === filterCategoryId)
        if (searchText.trim()) {
          const q = searchText.trim().toLowerCase()
          items = items.filter((r) => (r.note ? r.note.toLowerCase().includes(q) : false))
        }
        if (!cancelled) {
          setRecords(items)
          setVisibleCount(pageSize)
        }
      } catch (err) {
        if (!cancelled) setListError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [range, filterCategoryId, searchText, pageSize])

  // group by date and compute totals
  const grouped = useMemo(() => {
    const map = new Map<string, { total: number; items: RecordItem[] }>()
    for (const r of records.slice(0, visibleCount)) {
      const g = map.get(r.date) || { total: 0, items: [] }
      g.total += r.amount
      g.items.push(r)
      map.set(r.date, g)
    }
    const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a))
    return keys.map((d) => ({ date: d, total: map.get(d)!.total, items: map.get(d)!.items }))
  }, [records, visibleCount])

  const amountNumber = useMemo(() => {
    const n = parseFloat(amountInput)
    return Number.isFinite(n) ? n : 0
  }, [amountInput])

  function handleKeypad(key: string) {
    if (key === 'del') {
      setAmountInput((s) => s.slice(0, -1))
      return
    }
    if (key === '.' && amountInput.includes('.')) return
    // prevent multiple leading zeros like 00
    if ((key >= '0' && key <= '9') || key === '.') {
      setAmountInput((s) => (s === '0' && key !== '.' ? key : s + key))
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !categoryId || amountNumber <= 0) {
      setMessage('请填写完整信息（日期、分类、金额>0）')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const storage = await createStorage()
      const now = Date.now()
      const record: RecordItem = {
        id: crypto.randomUUID(),
        date,
        categoryId,
        amount: amountNumber,
        note: note || undefined,
        createdAt: now,
        updatedAt: now,
        version: 1,
      }
      await storage.upsertRecord(record)
      setMessage('已保存')
      // reset amount and note, keep date/category for fast entry
      setAmountInput('')
      setNote('')
    } catch (err) {
      setMessage('保存失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1 style={{ marginBottom: 12 }}>Local Ledger</h1>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setThemeState(toggleTheme())}>
          切换主题（当前：{theme}）
        </button>
      </div>

      {/* List view controls */}
      <section style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div role="tablist" aria-label="区间">
            {(['day','week','month'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                style={{ marginRight: 8, fontWeight: mode === m ? 700 : 400 }}
              >
                {m === 'day' ? '日' : m === 'week' ? '周' : '月'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => {
              const d = new Date(date + 'T00:00:00')
              if (mode === 'day') d.setDate(d.getDate() - 1)
              else if (mode === 'week') d.setDate(d.getDate() - 7)
              else d.setMonth(d.getMonth() - 1)
              const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0')
              setDate(`${yyyy}-${mm}-${dd}`)
            }}>◀</button>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button type="button" onClick={() => {
              const d = new Date(date + 'T00:00:00')
              if (mode === 'day') d.setDate(d.getDate() + 1)
              else if (mode === 'week') d.setDate(d.getDate() + 7)
              else d.setMonth(d.getMonth() + 1)
              const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0')
              setDate(`${yyyy}-${mm}-${dd}`)
            }}>▶</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
            <option value="all">全部分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{`${c.icon} ${c.name}`}</option>
            ))}
          </select>
          <input
            type="search"
            placeholder="搜索备注"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </section>

      {/* List view */}
      <section style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
        {loadingList && <div>加载中…</div>}
        {listError && <div role="alert">加载失败：{listError}</div>}
        {!loadingList && !listError && grouped.length === 0 && (
          <div>暂无记录</div>
        )}
        {!loadingList && !listError && grouped.map((g) => (
          <div key={g.date} style={{ border: '1px solid var(--border, #ddd)', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>{g.date}</strong>
              <span>合计：{g.total.toFixed(2)}</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              {g.items.map((r) => (
                <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    {categories.find((c) => c.id === r.categoryId)?.icon || ''}
                    <span style={{ marginLeft: 6 }}>{categories.find((c) => c.id === r.categoryId)?.name || r.categoryId}</span>
                    {r.note ? <span style={{ marginLeft: 8, opacity: 0.7 }}>· {r.note}</span> : null}
                  </span>
                  <strong>{r.amount.toFixed(2)}</strong>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!loadingList && !listError && visibleCount < records.length && (
          <button type="button" onClick={() => setVisibleCount((v) => v + pageSize)}>加载更多</button>
        )}
      </section>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>日期</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>分类</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{`${c.icon} ${c.name}`}</option>
            ))}
          </select>
        </label>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span>金额</span>
            <strong style={{ fontSize: 24 }}>{amountInput || '0'}</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {['1','2','3','4','5','6','7','8','9','.','0','del'].map((k) => (
              <button type="button" key={k} onClick={() => handleKeypad(k)} disabled={saving}>
                {k === 'del' ? '⌫' : k}
              </button>
            ))}
          </div>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>备注</span>
          <input type="text" placeholder="可选" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <button type="submit" disabled={saving || !categoryId || amountNumber <= 0}>保存</button>
        {message && <div aria-live="polite">{message}</div>}
      </form>
    </>
  )
}

export default App
