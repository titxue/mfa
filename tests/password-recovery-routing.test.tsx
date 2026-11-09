import { afterAll, afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import { Window } from 'happy-dom'
import React, { act } from 'react'
import type { VaultRequest } from '../src/utils/vault-client'
import type { VaultSnapshot } from '../src/utils/vault'

// Exercise the actual service -> background response -> client -> rendered popup.
// Only Chrome APIs and storage are synthetic; none of these four layers is mocked.
const browser = new Window({ url: 'https://popup.example.test/' })
const globals = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement',
  'HTMLButtonElement', 'Node', 'NodeFilter', 'Event', 'CustomEvent', 'MouseEvent',
  'MutationObserver', 'getComputedStyle', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT', 'chrome']
const originals = globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)
for (const key of globals.filter(key => !['chrome', 'IS_REACT_ACT_ENVIRONMENT'].includes(key))) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true,
    value: key === 'getComputedStyle' ? browser.getComputedStyle.bind(browser) : (browser as any)[key] })
}
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true })
const { createRoot } = await import('react-dom/client')
const { PasswordProtection } = await import('../src/components/PasswordProtection')
const { I18nProvider } = await import('../src/contexts/I18nContext')
const { securityError, securityStrings } = await import('../src/locales/security')
const { vaultRequest } = await import('../src/utils/vault-client')
const { vault } = await import('../src/utils/vault')
const { deriveKey, encryptAccounts, newSalt } = await import('../src/utils/vault-crypto')
const { RECOVERY_KEY } = await import('../src/utils/vault-sync')
const { toast } = await import('sonner')
const password = 'synthetic-current-password'
const replacement = 'synthetic-replacement-password'
const accounts = [{ name: 'Synthetic account', secret: 'A'.repeat(32) }]
const salt = newSalt()
const history = await encryptAccounts([{ name: 'Synthetic history', secret: 'B'.repeat(32) }],
  await deriveKey('synthetic-unrelated-history-password', salt), salt)
type Reply = { ok: boolean; error?: string; value?: unknown }
type Handler = (message: VaultRequest, sender: unknown, respond: (reply: Reply) => void) => boolean
let handler: Handler
let sync: Record<string, any>, local: Record<string, any>, session: Record<string, any>
let writes: number, reloads: number
let replies: Reply[]
let root: ReturnType<typeof createRoot>, host: HTMLDivElement
let success: ReturnType<typeof spyOn>, failure: ReturnType<typeof spyOn>

beforeEach(async () => {
  localStorage.clear()
  sync = { accounts: structuredClone(accounts), language: 'en-US' }; local = {}; session = {}
  writes = 0; reloads = 0; replies = []
  const area = (data: Record<string, any>) => ({
    setAccessLevel: async () => {}, getBytesInUse: async () => 0,
    get: async (keys: string | string[] | null) => structuredClone(keys === null ? data
      : Object.fromEntries((typeof keys === 'string' ? [keys] : keys).filter(key => key in data).map(key => [key, data[key]]))),
    set: async (values: Record<string, any>) => { writes++; Object.assign(data, structuredClone(values)) },
    remove: async (keys: string | string[]) => { writes++; for (const key of typeof keys === 'string' ? [keys] : keys) delete data[key] },
  })
  Object.defineProperty(globalThis, 'chrome', { configurable: true, writable: true, value: {
    runtime: {
      id: 'synthetic-extension', getURL: (path: string) => `chrome-extension://synthetic-extension/${path}`,
      onMessage: { addListener: (listener: Handler) => { handler = listener } },
      sendMessage: (message: VaultRequest) => {
        if (message.type !== 'MFA_VAULT') return Promise.resolve()
        return new Promise<Reply>(resolve => {
          handler(message, { id: 'synthetic-extension', url: 'chrome-extension://synthetic-extension/popup.html' }, reply => {
            replies.push(reply); resolve(reply)
          })
        })
      },
    },
    tabs: { query: async () => [] },
    storage: { sync: area(sync), local: area(local), session: area(session), onChanged: { addListener: () => {} } },
  } })
  // The module installs the real listener. A unique URL avoids a cached listener
  // from another test, an earlier Chrome instance, or Bun's --rerun-each mode.
  await import(`../src/vault-background.ts?password-recovery-routing=${crypto.randomUUID()}`)
  success = spyOn(toast, 'success').mockImplementation(() => 0)
  failure = spyOn(toast, 'error').mockImplementation(() => 0)
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove(); success.mockRestore(); failure.mockRestore()
})
afterAll(() => {
  browser.happyDOM.abort()
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(globalThis, key)
  }
})

async function click(button: HTMLButtonElement | null) {
  expect(button).not.toBeNull()
  await act(async () => button!.click())
}
function button(text: string) {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === text) ?? null
}
async function fill(id: string, value: string) {
  const input = document.getElementById(id) as HTMLInputElement
  expect(input).not.toBeNull()
  await act(async () => {
    Object.getOwnPropertyDescriptor(browser.HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit() {
  const previousReplies = replies.length
  await act(async () => {
    document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  for (let i = 0; i < 200 && replies.length === previousReplies; i++) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
  }
  expect(replies.length).toBe(previousReplies + 1)
}

for (const action of ['enable', 'change'] as const) for (const locale of ['en-US', 'zh-CN'] as const) {
  test(`${action}: recovery preflight error reaches the ${locale} popup without writes or false success`, async () => {
    sync.language = locale
    const initial = await vaultRequest('snapshot')
    let snapshot: VaultSnapshot = await vaultRequest('migrate', { revision: initial.revision })
    if (action === 'change') snapshot = await vaultRequest('enable', { nextPassword: password, revision: snapshot.revision })
    local[RECOVERY_KEY].conflicts.push({ id: 'unrelated-history', vector: { historyDevice: 1 }, recoveryOnly: true,
      record: { version: 2, revision: 'unrelated-history', mode: 'encrypted', data: structuredClone(history) } })
    snapshot = await vaultRequest('snapshot')
    const stored = structuredClone({ sync, local, session })
    writes = 0; replies = []
    await act(async () => root.render(<I18nProvider><PasswordProtection protected={action === 'change'}
      revision={snapshot.revision} reload={async () => { reloads++ }} /></I18nProvider>))
    const strings = securityStrings(locale)
    const expected = securityError(locale, new Error('recoveryPasswordRequired'))
    await click(host.querySelector('button'))
    if (action === 'change') await click(button(strings.change))

    // Repeated attempts must keep the explanation and never claim success.
    for (let attempt = 0; attempt < 2; attempt++) {
      if (action === 'change') await fill('current-password', password)
      await fill('new-password', replacement); await fill('confirm-password', replacement)
      await submit()
      expect(replies.at(-1)).toEqual({ ok: false, error: 'recoveryPasswordRequired' })
      expect(document.querySelector('[role="dialog"]')).not.toBeNull()
      expect(document.querySelector('[role="alert"]')?.textContent).toBe(expected)
      expect(document.querySelector('[role="alert"]')?.textContent).not.toBe(strings.storageError)
      expect(failure).toHaveBeenLastCalledWith(expected)
      expect(success).not.toHaveBeenCalled(); expect(reloads).toBe(0)
      expect(writes).toBe(0); expect({ sync, local, session }).toEqual(stored)
      for (const input of document.querySelectorAll<HTMLInputElement>('input[type="password"]')) expect(input.value).toBe('')
      expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false)
    }
    await click(button(strings.cancel))
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await click(host.querySelector('button'))
    expect(document.querySelector('[role="alert"]')).toBeNull()
    expect(success).not.toHaveBeenCalled(); expect(reloads).toBe(0)
  }, 10_000)
}

test('background still redacts unknown errors before the popup client receives them', async () => {
  const operation = spyOn(vault, 'protect').mockRejectedValue(new Error('synthetic-private-internal-detail'))
  try {
    await expect(vaultRequest('change', { password, nextPassword: replacement, revision: 'synthetic-revision' }))
      .rejects.toThrow('storageError')
    expect(replies).toEqual([{ ok: false, error: 'storageError' }])
    expect(JSON.stringify(replies)).not.toContain('synthetic-private-internal-detail')
  } finally { operation.mockRestore() }
})
