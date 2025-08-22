import { CURRENT_SCHEMA_VERSION } from '../types';
import type { Category, DataSnapshot, DateRange, PaginatedResult, Pagination, RecordItem, StorageProviderInfo } from '../types';
import type { StorageAPI } from '../storage';

const KEY = 'local-ledger:data:v1';

interface State {
  categories: Category[];
  records: RecordItem[];
}

function load(): State {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { categories: [], records: [] };
  try { return JSON.parse(raw) as State; } catch { return { categories: [], records: [] }; }
}

function save(state: State): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function paginateArray<T>(items: T[], pagination?: Pagination): PaginatedResult<T> {
  const limit = pagination?.limit ?? 50;
  const start = pagination?.cursor ? Number(pagination.cursor) : 0;
  const page = items.slice(start, start + limit);
  const nextCursor = items.length > start + limit ? String(start + limit) : undefined;
  return { items: page, nextCursor };
}

export function createLocalStorageProvider(): StorageAPI {
  const api: StorageAPI = {
    async info(): Promise<StorageProviderInfo> {
      return { name: 'localStorage', ready: true, schemaVersion: CURRENT_SCHEMA_VERSION };
    },
    async upsertCategory(category: Category): Promise<void> {
      const s = load();
      const i = s.categories.findIndex((x) => x.id === category.id);
      if (i >= 0) s.categories[i] = category; else s.categories.push(category);
      save(s);
    },
    async deleteCategory(categoryId: string): Promise<void> {
      const s = load();
      s.categories = s.categories.filter((x) => x.id !== categoryId);
      save(s);
    },
    async listCategories(): Promise<Category[]> {
      const s = load();
      return [...s.categories].sort((a, b) => a.sort - b.sort);
    },
    async upsertRecord(record: RecordItem): Promise<void> {
      const s = load();
      const i = s.records.findIndex((x) => x.id === record.id);
      if (i >= 0) s.records[i] = record; else s.records.push(record);
      save(s);
    },
    async deleteRecord(recordId: string): Promise<void> {
      const s = load();
      s.records = s.records.filter((x) => x.id !== recordId);
      save(s);
    },
    async getRecord(recordId: string): Promise<RecordItem | undefined> {
      const s = load();
      return s.records.find((r) => r.id === recordId);
    },
    async queryRecordsByDate(range: DateRange, pagination?: Pagination): Promise<PaginatedResult<RecordItem>> {
      const s = load();
      const items = s.records.filter((r) => r.date >= range.start && r.date <= range.end);
      items.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date.localeCompare(b.date)));
      return paginateArray(items, pagination);
    },
    async queryRecordsByCategory(categoryId: string, range?: DateRange, pagination?: Pagination): Promise<PaginatedResult<RecordItem>> {
      const s = load();
      let items = s.records.filter((r) => r.categoryId === categoryId);
      if (range) items = items.filter((r) => r.date >= range.start && r.date <= range.end);
      items.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date.localeCompare(b.date)));
      return paginateArray(items, pagination);
    },
    async exportSnapshot(): Promise<DataSnapshot> {
      const s = load();
      return { version: { schemaVersion: CURRENT_SCHEMA_VERSION, migratedAt: Date.now() }, categories: s.categories, records: s.records };
    },
    async importSnapshot(data: DataSnapshot, mode: 'merge' | 'replace'): Promise<void> {
      const s = load();
      if (mode === 'replace') {
        save({ categories: [...data.categories], records: [...data.records] });
        return;
      }
      const merged: State = {
        categories: [...s.categories],
        records: [...s.records],
      };
      for (const c of data.categories) {
        const i = merged.categories.findIndex((x) => x.id === c.id);
        if (i >= 0) merged.categories[i] = c; else merged.categories.push(c);
      }
      for (const r of data.records) {
        const i = merged.records.findIndex((x) => x.id === r.id);
        if (i >= 0) merged.records[i] = r; else merged.records.push(r);
      }
      save(merged);
    },
  };
  return api;
}


