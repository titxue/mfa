import { grantedSites, reconcileSiteScripts, sitePattern } from './utils/site-access'
import { createSiteContextMenus, handleSiteContextClick } from './utils/site-context-menu'

// Serialize permission changes so an older reconciliation cannot restore revoked sites.
let pending = Promise.resolve()
function reconcile() {
  pending = pending.catch(() => {}).then(async () => {
    await reconcileSiteScripts()
    // Unregistering does not remove an already running script. Notify it to hide its UI.
    const tabs = await chrome.tabs.query({})
    await Promise.all(tabs.map(tab => tab.id === undefined ? Promise.resolve() :
      chrome.tabs.sendMessage(tab.id, { type: 'SITE_ACCESS_CHANGED' }).catch(() => {})))
  })
  return pending
}
const refresh = () => { void reconcile().catch(console.error) }
let menuPending = Promise.resolve()
const refreshMenus = () => {
  menuPending = menuPending.catch(() => {}).then(createSiteContextMenus)
  void menuPending.catch(console.error)
}
chrome.runtime.onInstalled.addListener(refreshMenus)
chrome.runtime.onStartup.addListener(refreshMenus)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.language) refreshMenus()
})
chrome.contextMenus.onClicked.addListener((info, tab) => {
  void handleSiteContextClick(info, tab, reconcile).catch(error => {
    console.error('Site menu operation failed', error)
    if (tab?.id !== undefined) {
      void chrome.action.setBadgeText({ tabId: tab.id, text: '!' })
    }
  })
})
refreshMenus()
chrome.runtime.onInstalled.addListener(refresh)
chrome.runtime.onStartup.addListener(refresh)
chrome.permissions.onAdded.addListener(refresh)
chrome.permissions.onRemoved.addListener(refresh)
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === 'SITE_ACCESS_CHECK') {
    const pattern = sitePattern(sender.url ?? '')
    void grantedSites().then(sites => respond({ allowed: !!pattern && sites.includes(pattern) }),
      () => respond({ allowed: false }))
    return true
  }
  if (message?.type === 'SITE_ACCESS_SYNC' && !sender.tab) {
    void reconcile().then(() => respond({ ok: true }), () => respond({ ok: false }))
    return true
  }
  return false
})
refresh()
