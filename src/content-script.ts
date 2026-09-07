/**
 * 内容脚本 - 在页面中检测 OTP 字段、提供内联菜单与消息驱动填充
 * 编译为 IIFE 后注入页面（manifest content_scripts + executeScript 兜底注入共用同一 bundle）
 */

import type { Account } from '@/types'
import { StorageManager, DEFAULT_AUTOFILL_SETTINGS, type AutofillSettings } from '@/utils/storage'
import { isOTPField, isSegmentedInput, findSegmentedGroupFor, findOTPField, findSegmentedGroup, fillCode } from '@/utils/otp-field'
import { showInlineUI, hideInlineUI, showFilledFeedback, matchAccountsForSite, type MenuAccount, type MenuStrings } from '@/content-script-menu'

declare global {
  interface Window {
    __MFA_CS_INITIALIZED__?: boolean
  }
}

/** 菜单文案（12 语言，与 popup 国际化一致） */
const MENU_STRINGS: Record<string, MenuStrings> = {
  'zh-CN': { fill: '填充', noAccounts: '暂无账户，请先在扩展中添加' },
  'zh-TW': { fill: '填充', noAccounts: '尚無帳戶，請先在擴充功能中新增' },
  'en-US': { fill: 'Fill', noAccounts: 'No accounts yet, add one in the extension' },
  'es-ES': { fill: 'Rellenar', noAccounts: 'No hay cuentas, añada una en la extensión' },
  'fr-FR': { fill: 'Remplir', noAccounts: 'Aucun compte, ajoutez-en un dans l\'extension' },
  'pt-BR': { fill: 'Preencher', noAccounts: 'Nenhuma conta, adicione uma na extensão' },
  'de-DE': { fill: 'Ausfüllen', noAccounts: 'Keine Konten, fügen Sie eines in der Erweiterung hinzu' },
  'ru-RU': { fill: 'Заполнить', noAccounts: 'Нет учетных записей, добавьте в расширении' },
  'ar-SA': { fill: 'تعبئة', noAccounts: 'لا توجد حسابات، أضف واحدًا في الامتداد' },
  'ja-JP': { fill: '入力', noAccounts: 'アカウントがありません。拡張機能で追加してください' },
  'ko-KR': { fill: '채우기', noAccounts: '계정이 없습니다. 확장 프로그램에서 추가하세요' },
  'hi-IN': { fill: 'भरें', noAccounts: 'कोई खाता नहीं, कृपया एक्सटेंशन में जोड़ें' },
}

/** 按浏览器语言推断菜单语言（用于首次使用、未设置语言时） */
function detectMenuLanguage(): string {
  const lang = (navigator.language || 'en').toLowerCase()
  if (lang.startsWith('zh')) return lang.startsWith('zh-tw') || lang.startsWith('zh-hk') ? 'zh-TW' : 'zh-CN'
  if (lang.startsWith('en')) return 'en-US'
  if (lang.startsWith('es')) return 'es-ES'
  if (lang.startsWith('fr')) return 'fr-FR'
  if (lang.startsWith('pt')) return 'pt-BR'
  if (lang.startsWith('de')) return 'de-DE'
  if (lang.startsWith('ru')) return 'ru-RU'
  if (lang.startsWith('ar')) return 'ar-SA'
  if (lang.startsWith('ja')) return 'ja-JP'
  if (lang.startsWith('ko')) return 'ko-KR'
  if (lang.startsWith('hi')) return 'hi-IN'
  return 'en-US'
}

/** 获取已存储语言（区别于 StorageManager 的默认值） */
function getStoredLanguage(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get('language', (result) => {
        resolve(typeof result?.language === 'string' ? result.language : null)
      })
    } catch {
      resolve(null)
    }
  })
}

/** 防止 executeScript 兜底注入时重复初始化 */
if (!(globalThis as typeof window).__MFA_CS_INITIALIZED__) {
  ;(globalThis as typeof window).__MFA_CS_INITIALIZED__ = true

  let accounts: Account[] = []
  let settings: AutofillSettings = DEFAULT_AUTOFILL_SETTINGS
  let menuStrings: MenuStrings = MENU_STRINGS['en-US']
  let lastAnchor: HTMLInputElement | null = null

  /** 重新加载状态（存储变化时调用） */
  async function reloadState(): Promise<void> {
    try {
      accounts = await StorageManager.getAccounts()
    } catch {
      accounts = []
    }
    try {
      settings = await StorageManager.getSettings()
    } catch {
      settings = DEFAULT_AUTOFILL_SETTINGS
    }
    const stored = await getStoredLanguage()
    menuStrings = MENU_STRINGS[stored || detectMenuLanguage()] || MENU_STRINGS['en-US']
  }

  // 存储变化时同步状态（popup 增删账户/修改设置后无需刷新页面）
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && (changes['accounts'] || changes['autofillSettings'] || changes['language'])) {
      reloadState()
    }
  })

  // 消息处理：弹窗点击账户卡片时驱动填充
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!message || typeof message !== 'object') return false
    const msg = message as Record<string, unknown>

    if (msg.type === 'PING') {
      let hasField = false
      try {
        hasField = !!findOTPField() || !!findSegmentedGroup()
      } catch {
        hasField = false
      }
      sendResponse({ ok: true, hasField })
      return false
    }

    if (msg.type === 'FILL_CODE' && typeof msg.code === 'string') {
      hideInlineUI()
      const result = fillCode(msg.code)
      if (result.status === 'filled' && lastAnchor && lastAnchor.isConnected) {
        showFilledFeedback(lastAnchor)
      }
      if (result.status === 'no-field') {
        // 延迟响应：若本帧无字段，让其他帧（iframe）优先返回 filled 结果
        window.setTimeout(() => {
          try {
            sendResponse(result)
          } catch {
            // 消息通道已关闭则忽略
          }
        }, 300)
        return true
      }
      sendResponse(result)
      return false
    }

    return false
  })

  // 焦点进入 OTP 字段/分段组时显示内联菜单
  document.addEventListener(
    'focusin',
    (e) => {
      const target = e.target
      if (!(target instanceof HTMLInputElement)) return
      if (!settings.autofillInlineMenu) return
      const isOtp = isOTPField(target)
      const segmentedGroup = isSegmentedInput(target) ? findSegmentedGroupFor(target) : null
      if (!isOtp && !segmentedGroup) return
      lastAnchor = target
      const menuAccounts: MenuAccount[] = accounts.map((a) => ({
        name: a.name,
        secret: a.secret,
        website: a.website,
      }))
      // 自动识别当前网站：过滤出匹配的账户
      const matches = matchAccountsForSite(menuAccounts, window.location.hostname)
      // 1Password 风格：字段右侧显示填充按钮，点击弹出菜单选择填充（有匹配时菜单只显示匹配项）
      // 不做聚焦即自动填充——始终由用户点击按钮后填充
      showInlineUI(target, {
        accounts: matches.length > 0 ? matches : menuAccounts,
        strings: menuStrings,
        onFill: (account, code) => {
          hideInlineUI()
          const result = fillCode(code, target)
          if (result.status === 'filled') {
            showFilledFeedback(target)
          }
        },
      })
    },
    true
  )

  reloadState()
}

export {}