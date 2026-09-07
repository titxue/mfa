import { afterEach, expect, test } from 'bun:test'
import { handleSiteContextClick, ENABLE_SITE_MENU, DISABLE_SITE_MENU } from '../src/utils/site-context-menu'
const original = globalThis.chrome
afterEach(() => { globalThis.chrome = original })
function setup(allowed = true) {
  const calls: unknown[][] = []
  globalThis.chrome = {
    permissions: {
      request: (value: unknown) => { calls.push(['request', value]); return Promise.resolve(allowed) },
      remove: (value: unknown) => { calls.push(['remove', value]); return Promise.resolve(true) },
    },
    scripting: { executeScript: async (value: unknown) => { calls.push(['inject', value]) } },
    tabs: { sendMessage: async () => { calls.push(['notify']) } },
    action: { setBadgeText: async () => {} },
  } as unknown as typeof chrome
  return { calls, reconcile: async () => { calls.push(['sync']) } }
}
const tab = { id: 42 } as chrome.tabs.Tab
function info(menuItemId: string, extras = {}) {
  return { menuItemId, editable: true, pageUrl: 'https://example.com/login', ...extras }
}
test('enable requests permission synchronously before reconciliation and injects only after grant', async () => {
  const { calls, reconcile } = setup()
  const work = handleSiteContextClick(info(ENABLE_SITE_MENU), tab, reconcile)
  expect(calls).toEqual([['request', { origins: ['https://example.com/*'] }]])
  await work
  expect(calls.map(c => c[0])).toEqual(['request', 'sync', 'inject', 'notify'])
})
test('denial does not register or inject', async () => {
  const { calls, reconcile } = setup(false)
  await handleSiteContextClick(info(ENABLE_SITE_MENU), tab, reconcile)
  expect(calls.map(c => c[0])).toEqual(['request'])
})
test('disable removes only the selected site and reconciles', async () => {
  const { calls, reconcile } = setup()
  await handleSiteContextClick(info(DISABLE_SITE_MENU), tab, reconcile)
  expect(calls).toEqual([['remove', { origins: ['https://example.com/*'] }], ['sync']])
})
test('iframe click requests the frame host rather than the containing page', async () => {
  const { calls, reconcile } = setup()
  await handleSiteContextClick(info(ENABLE_SITE_MENU, { frameUrl: 'https://auth.example.net/form', frameId: 7 }), tab, reconcile)
  expect(calls[0]).toEqual(['request', { origins: ['https://auth.example.net/*'] }])
  expect(calls[2]).toEqual(['inject', { target: { tabId: 42, frameIds: [7] }, files: ['content-script.js'] }])
})
test('restricted pages and unrelated menu items are ignored', async () => {
  const { calls, reconcile } = setup()
  await handleSiteContextClick(info(ENABLE_SITE_MENU, { pageUrl: 'chrome://settings' }), tab, reconcile)
  await handleSiteContextClick(info('other'), tab, reconcile)
  expect(calls).toEqual([])
})
