export type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'theme'

export function detectPreferredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function getInitialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
    return stored ?? detectPreferredTheme()
  } catch {
    return detectPreferredTheme()
  }
}

export function setTheme(theme: ThemeMode): void {
  const root = document.documentElement
  root.dataset.theme = theme
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // ignore storage errors
  }
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = (document.documentElement.dataset.theme as ThemeMode) === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

