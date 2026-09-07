import { sitePattern } from './site-access'

export const ENABLE_SITE_MENU = 'mfa-enable-site-menu'
export const DISABLE_SITE_MENU = 'mfa-disable-site-menu'
const titles: Record<string, [string, string]> = {
  'zh-CN': ['在此网站启用自动菜单', '在此网站禁用自动菜单'],
  'zh-TW': ['在此網站啟用自動選單', '在此網站停用自動選單'],
  'en-US': ['Enable automatic menu on this site', 'Disable automatic menu on this site'],
  'es-ES': ['Activar menú automático en este sitio', 'Desactivar menú automático en este sitio'],
  'fr-FR': ['Activer le menu automatique sur ce site', 'Désactiver le menu automatique sur ce site'],
  'pt-BR': ['Ativar menu automático neste site', 'Desativar menu automático neste site'],
  'de-DE': ['Automatisches Menü auf dieser Website aktivieren', 'Automatisches Menü auf dieser Website deaktivieren'],
  'ru-RU': ['Включить автоматическое меню на этом сайте', 'Отключить автоматическое меню на этом сайте'],
  'ar-SA': ['تفعيل القائمة التلقائية لهذا الموقع', 'تعطيل القائمة التلقائية لهذا الموقع'],
  'ja-JP': ['このサイトの自動メニューを有効にする', 'このサイトの自動メニューを無効にする'],
  'ko-KR': ['이 사이트에서 자동 메뉴 사용', '이 사이트에서 자동 메뉴 사용 안 함'],
  'hi-IN': ['इस साइट पर स्वचालित मेनू चालू करें', 'इस साइट पर स्वचालित मेनू बंद करें'],
}

// Callback wrappers keep compatibility with Chrome 96 (Promise support arrived later).
export async function createSiteContextMenus(): Promise<void> {
  const { language } = await chrome.storage.sync.get('language')
  const lang = typeof language === 'string' ? language : chrome.i18n.getUILanguage()
  const text = titles[lang] ?? (String(lang).startsWith('zh') ? titles['zh-CN'] : titles['en-US'])
  for (const [index, id] of [ENABLE_SITE_MENU, DISABLE_SITE_MENU].entries()) {
    await new Promise<void>(resolve => chrome.contextMenus.remove(id, () => {
      void chrome.runtime.lastError
      resolve()
    }))
    await new Promise<void>((resolve, reject) => {
      chrome.contextMenus.create({
        id, title: text[index], contexts: ['page', 'editable', 'frame', 'selection'],
        documentUrlPatterns: ['http://*/*', 'https://*/*'],
      }, () => {
        const error = chrome.runtime.lastError
        if (error) reject(new Error(error.message))
        else resolve()
      })
    })
  }
}

export async function handleSiteContextClick(
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab | undefined,
  reconcile: () => Promise<void>,
): Promise<void> {
  if (info.menuItemId !== ENABLE_SITE_MENU && info.menuItemId !== DISABLE_SITE_MENU) return
  // In an iframe the explicitly clicked frame is the website being authorized.
  const pattern = sitePattern(info.frameUrl ?? info.pageUrl ?? tab?.url ?? '')
  if (!pattern || tab?.id === undefined) return
  const tabId = tab.id
  if (info.menuItemId === DISABLE_SITE_MENU) {
    if (!await chrome.permissions.remove({ origins: [pattern] })) throw new Error('Unable to revoke site access')
    await reconcile()
  } else {
    // Must run synchronously from onClicked, before any other awaited API.
    if (!await chrome.permissions.request({ origins: [pattern] })) return
    await reconcile()
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [info.frameId ?? 0] }, files: ['content-script.js'],
    })
    // Covers an existing script originally injected through activeTab.
    await chrome.tabs.sendMessage(tabId, { type: 'SITE_ACCESS_CHANGED' }).catch(() => {})
  }
  await chrome.action.setBadgeText({ tabId, text: '' })
}
