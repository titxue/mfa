import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { StorageManager, type ThemePreference } from '@/utils/storage'

interface ThemeContextValue {
  theme: ThemePreference
  resolvedTheme: 'light' | 'dark'
  saving: boolean
  setTheme: (theme: ThemePreference) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children, initialTheme }: {
  children: React.ReactNode
  initialTheme: ThemePreference
}) {
  const [theme, setPreference] = useState(initialTheme)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const setTheme = async (next: ThemePreference) => {
    if (savingRef.current || next === theme) return
    savingRef.current = true
    setSaving(true)
    setPreference(next)
    try {
      await StorageManager.saveTheme(next)
    } catch (error) {
      setPreference(theme)
      throw error
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return <ThemeContext.Provider value={{ theme, resolvedTheme, saving, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
