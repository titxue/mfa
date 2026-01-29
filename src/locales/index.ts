import type { Translations } from './zh-CN'
import { zhCN } from './zh-CN'
import { zhTW } from './zh-TW'
import { enUS } from './en-US'
import { esES } from './es-ES'
import { frFR } from './fr-FR'
import { ptBR } from './pt-BR'
import { deDE } from './de-DE'
import { ruRU } from './ru-RU'
import { arSA } from './ar-SA'
import { jaJP } from './ja-JP'
import { koKR } from './ko-KR'
import { hiIN } from './hi-IN'

/**
 * 语言配置接口
 */
export interface LanguageConfig {
  code: string              // 语言代码（如 'zh-CN'）
  nativeName: string        // 原生显示名称（如 '中文'）
  translations: Translations // 翻译对象
  detectCodes: string[]     // 用于自动检测的语言代码列表
}

/**
 * 语言配置注册表
 * 添加新语言时，只需在此数组中添加配置即可
 */
export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    code: 'zh-CN',
    nativeName: '中文',
    translations: zhCN,
    detectCodes: ['zh', 'zh-CN'],
  },
  {
    code: 'zh-TW',
    nativeName: '繁體中文',
    translations: zhTW,
    detectCodes: ['zh-TW', 'zh-HK'],
  },
  {
    code: 'en-US',
    nativeName: 'English',
    translations: enUS,
    detectCodes: ['en', 'en-US', 'en-GB'],
  },
  {
    code: 'es-ES',
    nativeName: 'Español',
    translations: esES,
    detectCodes: ['es', 'es-ES', 'es-MX', 'es-AR'],
  },
  {
    code: 'fr-FR',
    nativeName: 'Français',
    translations: frFR,
    detectCodes: ['fr', 'fr-FR', 'fr-CA', 'fr-BE'],
  },
  {
    code: 'pt-BR',
    nativeName: 'Português',
    translations: ptBR,
    detectCodes: ['pt', 'pt-BR', 'pt-PT'],
  },
  {
    code: 'de-DE',
    nativeName: 'Deutsch',
    translations: deDE,
    detectCodes: ['de', 'de-DE', 'de-AT', 'de-CH'],
  },
  {
    code: 'ru-RU',
    nativeName: 'Русский',
    translations: ruRU,
    detectCodes: ['ru', 'ru-RU'],
  },
  {
    code: 'ar-SA',
    nativeName: 'العربية',
    translations: arSA,
    detectCodes: ['ar', 'ar-SA', 'ar-EG', 'ar-AE'],
  },
  {
    code: 'ja-JP',
    nativeName: '日本語',
    translations: jaJP,
    detectCodes: ['ja', 'ja-JP'],
  },
  {
    code: 'ko-KR',
    nativeName: '한국어',
    translations: koKR,
    detectCodes: ['ko', 'ko-KR'],
  },
  {
    code: 'hi-IN',
    nativeName: 'हिन्दी',
    translations: hiIN,
    detectCodes: ['hi', 'hi-IN'],
  },
]

/**
 * 从配置生成 Language 类型的联合类型
 */
export type Language = typeof LANGUAGE_CONFIGS[number]['code']

/**
 * 生成语言代码到翻译对象的映射
 */
export const translations: Record<Language, Translations> = LANGUAGE_CONFIGS.reduce(
  (acc, config) => {
    acc[config.code as Language] = config.translations
    return acc
  },
  {} as Record<Language, Translations>
)

/**
 * 生成语言代码到原生名称的映射
 */
export const languageNames: Record<Language, string> = LANGUAGE_CONFIGS.reduce(
  (acc, config) => {
    acc[config.code as Language] = config.nativeName
    return acc
  },
  {} as Record<Language, string>
)

/**
 * 生成检测代码到语言代码的映射
 */
const detectionMap: Record<string, Language> = LANGUAGE_CONFIGS.reduce(
  (acc, config) => {
    config.detectCodes.forEach(code => {
      acc[code] = config.code as Language
    })
    return acc
  },
  {} as Record<string, Language>
)

/**
 * 获取所有支持的语言代码
 */
export const supportedLanguages: Language[] = LANGUAGE_CONFIGS.map(
  config => config.code as Language
)

/**
 * 检测系统语言
 */
export function detectSystemLanguage(): Language {
  const systemLang = navigator.language || 'zh-CN'

  // 首先尝试完整匹配
  if (detectionMap[systemLang]) {
    return detectionMap[systemLang]
  }

  // 然后尝试语言代码匹配
  const langCode = systemLang.split('-')[0]
  if (detectionMap[langCode]) {
    return detectionMap[langCode]
  }

  // 默认返回第一个语言（中文）
  return LANGUAGE_CONFIGS[0].code as Language
}
