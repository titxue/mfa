import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Language } from '@/types'
import type { Translations } from '@/locales/zh-CN'
import { translations, detectSystemLanguage, supportedLanguages } from '@/locales'
import { StorageManager } from '@/utils/storage'

interface I18nContextValue {
  locale: Language
  t: (key: keyof Translations, params?: Record<string, string | number>) => string
  setLocale: (locale: Language) => Promise<void>
  resetLanguage: () => Promise<void>
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

/**
 * 格式化翻译文本，替换参数占位符
 */
function formatMessage(
  message: string,
  params?: Record<string, string | number>
): string {
  if (!params) {
    return message
  }

  let result = message
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
  }
  return result
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Language>('zh-CN')

  useEffect(() => {
    // 初始化语言设置
    async function initLanguage() {
      const savedLanguage = await StorageManager.getLanguage()
      if (savedLanguage && supportedLanguages.includes(savedLanguage as Language)) {
        setLocaleState(savedLanguage as Language)
      } else {
        const detected = detectSystemLanguage()
        setLocaleState(detected)
        await StorageManager.saveLanguage(detected)
      }
    }

    initLanguage()
  }, [])

  const t = (
    key: keyof Translations,
    params?: Record<string, string | number>
  ): string => {
    const translation = translations[locale][key]
    return formatMessage(translation, params)
  }

  const setLocale = async (newLocale: Language) => {
    setLocaleState(newLocale)
    await StorageManager.saveLanguage(newLocale)
  }

  const resetLanguage = async () => {
    await StorageManager.removeLanguage()
    const detected = detectSystemLanguage()
    setLocaleState(detected)
  }

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, resetLanguage }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
