import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Language } from '@/types'
import type { Translations } from '@/locales/zh-CN'
import { zhCN } from '@/locales/zh-CN'
import { enUS } from '@/locales/en-US'
import { StorageManager } from '@/utils/storage'

interface I18nContextValue {
  locale: Language
  t: (key: keyof Translations, params?: Record<string, string | number>) => string
  setLocale: (locale: Language) => Promise<void>
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

const translations: Record<Language, Translations> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

/**
 * 检测系统语言
 */
function detectSystemLanguage(): Language {
  const systemLang = navigator.language || 'zh-CN'

  const langMap: Record<string, Language> = {
    'zh': 'zh-CN',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-CN',
    'zh-HK': 'zh-CN',
    'en': 'en-US',
    'en-US': 'en-US',
    'en-GB': 'en-US',
  }

  // 首先尝试完整匹配
  if (langMap[systemLang]) {
    return langMap[systemLang]
  }

  // 然后尝试语言代码匹配
  const langCode = systemLang.split('-')[0]
  if (langMap[langCode]) {
    return langMap[langCode]
  }

  // 默认返回中文
  return 'zh-CN'
}

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
      if (savedLanguage && (savedLanguage === 'zh-CN' || savedLanguage === 'en-US')) {
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

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
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
