import { useCallback, useState, type ReactNode } from 'react'
import { ThemeContext, type Theme } from './useTheme'

const STORAGE_KEY = 'sf-theme'

function initialTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const initial = initialTheme()
    applyTheme(initial)
    return initial
  })

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      window.localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
