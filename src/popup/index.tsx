import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { I18nProvider } from '@/contexts/I18nContext'
import { Toaster } from 'sonner'
import '@/styles/globals.css'

const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <I18nProvider>
        <App />
        <Toaster position="bottom-center" />
      </I18nProvider>
    </React.StrictMode>
  )
}
