import { afterEach, expect, test } from 'bun:test'
import { exactSitePatterns, sitePattern, reconcileSiteScripts, SITE_SCRIPT_ID } from '../src/utils/site-access'

const original = globalThis.chrome
afterEach(() => { globalThis.chrome = original })

test('only HTTP(S) exact host patterns; never implicitly grant subdomains', () => {
  expect(sitePattern('https://login.example.com/path?q=1')).toBe('https://login.example.com/*')
  expect(sitePattern('http://localhost:3000/login')).toBe('http://localhost/*')
  for (const url of ['chrome://settings', 'file:///tmp/a', 'about:blank', 'bad']) expect(sitePattern(url)).toBeNull()
  expect(exactSitePatterns(['<all_urls>', '*://*/*', 'https://*/*', 'https://*.example.com/*',
    'https://example.com/*', 'https://example.com/*'])).toEqual(['https://example.com/*'])
})

function mockSites(origins: string[], registered: boolean) {
  const operations: unknown[][] = []
  globalThis.chrome = {
    permissions: { getAll: async () => ({ origins }) },
    scripting: {
      getRegisteredContentScripts: async () => registered ? [{ id: SITE_SCRIPT_ID }] : [],
      registerContentScripts: async (scripts: unknown) => { operations.push(['register', scripts]) },
      updateContentScripts: async (scripts: unknown) => { operations.push(['update', scripts]) },
      unregisterContentScripts: async (filter: unknown) => { operations.push(['unregister', filter]) },
    },
  } as unknown as typeof chrome
  return operations
}

test('no host grant (including activeTab only) does not register automatic scripts', async () => {
  const operations = mockSites([], false)
  await reconcileSiteScripts()
  expect(operations).toEqual([])
})

test('registers only granted sites and persists across sessions', async () => {
  const operations = mockSites(['https://example.com/*'], false)
  await reconcileSiteScripts()
  expect(operations).toEqual([['register', [{
    id: SITE_SCRIPT_ID, matches: ['https://example.com/*'], js: ['content-script.js'],
    allFrames: true, runAt: 'document_idle', persistAcrossSessions: true,
  }]]])
})

test('revoking one site removes it from the next registration', async () => {
  const operations = mockSites(['https://remaining.example/*'], true)
  await reconcileSiteScripts()
  expect(operations[0][0]).toBe('update')
  expect((operations[0][1] as any)[0].matches).toEqual(['https://remaining.example/*'])
})

test('revoking the final site unregisters; old broad grants never register scripts', async () => {
  const operations = mockSites(['<all_urls>'], true)
  await reconcileSiteScripts()
  expect(operations).toEqual([['unregister', { ids: [SITE_SCRIPT_ID] }]])
})

test('manifest has optional host permissions only and includes worker', async () => {
  const manifest = await Bun.file('public/manifest.json').json()
  expect(manifest.content_scripts).toBeUndefined()
  expect(manifest.host_permissions).toBeUndefined()
  expect(manifest.optional_host_permissions).toEqual(['https://*/*', 'http://*/*'])
  expect(manifest.permissions).toEqual(['storage', 'activeTab', 'scripting', 'contextMenus'])
  expect(manifest.background.service_worker).toBe('background.js')
})
