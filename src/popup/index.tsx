import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { I18nProvider } from '@/contexts/I18nContext'
import { Toaster } from 'sonner'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import { StorageManager } from '@/utils/storage'
import '@/styles/globals.css'

const root = document.getElementById('root')

function Popup() {
  const { resolvedTheme } = useTheme()
  return <><App /><Toaster position="bottom-center" theme={resolvedTheme} /></>
}

if (root) {
  void StorageManager.getTheme().then(initialTheme => {
    createRoot(root).render(
      <React.StrictMode>
        <ThemeProvider initialTheme={initialTheme}>
          <I18nProvider><Popup /></I18nProvider>
        </ThemeProvider>
      </React.StrictMode>
    )
  })
}
