import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { getInitialTheme, setTheme, toggleTheme } from './ui/theme'

function App() {
  const [count, setCount] = useState(0)
  const [theme, setThemeState] = useState(getInitialTheme())

  useEffect(() => {
    setTheme(theme)
  }, [theme])

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Local Ledger</h1>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setThemeState(toggleTheme())}>
          切换主题（当前：{theme}）
        </button>
      </div>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
