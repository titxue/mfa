import { afterAll, afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import { Window } from 'happy-dom'
import React, { act } from 'react'
import { useAccounts } from '../src/hooks/useAccounts'
import { useTOTP } from '../src/hooks/useTOTP'
import { TOTP } from '../src/utils/totp'
import type { VaultSnapshot } from '../src/utils/vault'
import type { VaultRequest } from '../src/utils/vault-client'
import { I18nProvider } from '../src/contexts/I18nContext'
import { AccountItem } from '../src/components/AccountItem'
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext'
import { StorageManager } from '../src/utils/storage'

const browser = new Window({ url: 'http://localhost/' })
const globals = ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT', 'chrome']
const originals = globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)
for (const key of globals.filter(key => !['chrome', 'IS_REACT_ACT_ENVIRONMENT'].includes(key))) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: (browser as any)[key] })
}
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true })
const { createRoot } = await import('react-dom/client')
let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
const initial = [
  { name: 'Alpha', secret: 'JBSWY3DPEHPK3PXP' },
  { name: 'Beta', secret: 'GEZDGNBVGY3TQOJQ' },
  { name: 'Gamma', secret: 'JBSWY3DPEHPK3PXP' },
]
let state: ReturnType<typeof useAccounts>
let stored: VaultSnapshot
let listeners: Set<(event: unknown) => void>
let saves: { message: VaultRequest; finish: (ok?: boolean, afterCommit?: () => void) => void }[]
let revision: number
const notify = (invalidate = false) => listeners.forEach(listener => listener({ type: 'VAULT_CHANGED', invalidate }))

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  stored = { accounts: initial, revision: 'r0', locked: false, protected: false }
  saves = []; revision = 0; listeners = new Set()
  Object.defineProperty(globalThis, 'chrome', { configurable: true, writable: true, value: {
    runtime: {
      id: 'test', onMessage: { addListener: (fn: any) => listeners.add(fn), removeListener: (fn: any) => listeners.delete(fn) },
      sendMessage: (message: VaultRequest) => {
        if (message.action === 'snapshot') return Promise.resolve({ ok: true, value: structuredClone(stored) })
        return new Promise(resolve => saves.push({ message, finish: (ok = true, afterCommit) => {
          if (!ok) return resolve({ ok: false, error: 'quota' })
          expect(message.revision).toBe(stored.revision)
          stored = { ...stored, accounts: message.accounts!, revision: `r${++revision}` }
          notify()
          afterCommit?.()
          resolve({ ok: true, value: structuredClone(stored) })
        } }))
      },
    },
  } })
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
afterAll(() => {
  browser.happyDOM.abort()
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(globalThis, key)
  }
})
function Accounts() { state = useAccounts(); return <p>{state.accounts.map(a => a.name).join(',')}</p> }
const mount = async (element: React.ReactNode) => { await act(async () => { root.render(element) }) }

test('rapid reorders merge waiting saves and retain the latest optimistic order', async () => {
  await mount(<Accounts />)
  let first!: Promise<boolean>, second!: Promise<boolean>, third!: Promise<boolean>
  const final = [initial[2], initial[1], initial[0]]
  await act(async () => {
    first = state.updateAccounts([initial[1], initial[0], initial[2]])
    second = state.updateAccounts([initial[1], initial[2], initial[0]])
    third = state.updateAccounts(final)
  })
  expect(saves.length).toBe(1)
  expect(host.textContent).toBe('Gamma,Beta,Alpha')
  await act(async () => saves[0].finish())
  expect(host.textContent).toBe('Gamma,Beta,Alpha')
  expect(saves.length).toBe(2)
  expect(saves[1].message.accounts).toEqual(final)
  expect(saves[1].message.revision).toBe('r1')
  await act(async () => saves[1].finish())
  expect(await Promise.all([first, second, third])).toEqual([true, true, true])
  expect(stored.accounts).toEqual(final)
  expect(state.revision).toBe('r2')
})

for (const update of ['add', 'edit', 'delete'] as const) {
  test(`queued reorders preserve an external account ${update} arriving between commit and response`, async () => {
    await mount(<Accounts />)
    let first!: Promise<boolean>, second!: Promise<boolean>
    await act(async () => {
      first = state.updateAccounts([...initial].reverse())
      second = state.updateAccounts([initial[1], initial[2], initial[0]])
    })
    await act(async () => saves[0].finish(true, () => {
      const accounts = update === 'add'
        ? [...stored.accounts, { name: 'Remote account', secret: initial[0].secret }]
        : update === 'edit'
          ? stored.accounts.map(account => account.name === initial[0].name
            ? { ...account, secret: initial[1].secret, website: 'remote.example.test', type: 'steam' as const } : account)
          : stored.accounts.filter(account => account.name !== initial[0].name)
      stored = { ...stored, revision: 'remote-r2', accounts }
      notify()
    }))
    const remote = structuredClone(stored)
    expect(await Promise.all([first, second])).toEqual([false, false])
    expect(saves).toHaveLength(1)
    expect(state.accounts).toEqual(remote.accounts)
    expect(state.revision).toBe('remote-r2')
    expect(state.error).toBe('conflict')
    expect(state.isSaving).toBe(false)
    let retry!: Promise<boolean>
    await act(async () => { retry = state.updateAccounts([...state.accounts].reverse()) })
    await act(async () => saves[1].finish())
    expect(await retry).toBe(true)
    expect([...stored.accounts].reverse()).toEqual(remote.accounts)
    expect(state.error).toBe('')
  })
}

test('failed saves reject waiting operations, restore persisted data, and allow retry', async () => {
  await mount(<Accounts />)
  let first!: Promise<boolean>, second!: Promise<boolean>
  await act(async () => {
    first = state.updateAccounts([...initial].reverse())
    second = state.updateAccounts([initial[1], initial[2], initial[0]])
  })
  await act(async () => saves[0].finish(false))
  expect(await Promise.all([first, second])).toEqual([false, false])
  expect(state.accounts).toEqual(initial)
  expect(state.error).toBe('quota')
  let retry!: Promise<boolean>
  await act(async () => { retry = state.updateAccounts([...initial].reverse()) })
  await act(async () => saves[1].finish())
  expect(await retry).toBe(true)
  expect(state.error).toBe('')
})

test('invalidation during saving keeps the vault locked and cancels queued writes', async () => {
  await mount(<Accounts />)
  let first!: Promise<boolean>, second!: Promise<boolean>
  await act(async () => {
    first = state.updateAccounts([...initial].reverse())
    second = state.updateAccounts([initial[1], initial[2], initial[0]])
    stored = { ...stored, accounts: [], locked: true }
    notify(true)
  })
  expect(state.locked).toBe(true)
  await act(async () => saves[0].finish())
  expect(await Promise.all([first, second])).toEqual([false, false])
  expect(state.locked).toBe(true)
  expect(saves.length).toBe(1)
})

test('focus resumes TOTP immediately and an older generation cannot overwrite it', async () => {
  let now = 59000
  const clock = spyOn(Date, 'now').mockImplementation(() => now)
  const pending: ((code: string) => void)[] = []
  const generation = spyOn(TOTP, 'generateTOTP').mockImplementation(() => new Promise(resolve => pending.push(resolve)))
  let result!: ReturnType<typeof useTOTP>
  function Codes() { result = useTOTP([initial[0]]); return <p>{result.codes.Alpha}</p> }
  try {
    await mount(<Codes />)
    now = 60000
    await act(async () => window.dispatchEvent(new Event('focus')))
    expect(pending.length).toBe(2)
    await act(async () => pending[1]('222222'))
    expect(result.remaining).toBe(30)
    await act(async () => pending[0]('111111'))
    expect(host.textContent).toBe('222222')
  } finally { clock.mockRestore(); generation.mockRestore() }
})

test('click generates a fresh code instead of copying the displayed cached code', async () => {
  Object.defineProperty(globalThis, 'chrome', { configurable: true, writable: true, value: undefined })
  let copied = ''
  let copiedDone!: () => void
  const copying = new Promise<void>(resolve => { copiedDone = resolve })
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { copied = text; copiedDone() } } })
  const clock = spyOn(Date, 'now').mockReturnValue(60000)
  try {
    await mount(<I18nProvider><AccountItem name="Example" secret="GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ" code="287082" remaining={1} onDelete={() => {}} onEdit={() => {}} /></I18nProvider>)
    await act(async () => {
      host.querySelector('.account-card')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await copying
    })
    expect(copied).toBe('359152')
    await act(async () => host.querySelector('.account-card')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  } finally { clock.mockRestore() }
})

test('reorder and storage readback never clear existing TOTP codes or restart generation', async () => {
  const generate = spyOn(TOTP, 'generateTOTP').mockImplementation(async () => '123456')
  const frames: string[] = []
  function Codes({ accounts }: { accounts: typeof initial }) {
    const { codes } = useTOTP(accounts)
    const text = accounts.map(account => codes[account.name] ?? '------').join(',')
    frames.push(text)
    return <p>{text}</p>
  }
  try {
    await mount(<Codes accounts={initial} />)
    expect(host.textContent).toBe('123456,123456,123456')
    frames.length = 0
    await mount(<Codes accounts={[...initial].reverse()} />)
    await mount(<Codes accounts={initial.map(account => ({ ...account, website: 'example.test' }))} />)
    expect(frames.length).toBeGreaterThan(0)
    expect(frames.every(frame => !frame.includes('------'))).toBe(true)
    expect(generate).toHaveBeenCalledTimes(3)
    await mount(<Codes accounts={[]} />)
    expect(host.textContent).toBe('')
  } finally { generate.mockRestore() }
})

test('visibility resume refreshes immediately and listeners are removed on unmount', async () => {
  let now = 59000
  const clock = spyOn(Date, 'now').mockImplementation(() => now)
  const generate = spyOn(TOTP, 'generateTOTP').mockImplementation(async () => now < 60000 ? '111111' : '222222')
  function Codes() { return <p>{useTOTP([initial[0]]).codes.Alpha}</p> }
  try {
    await mount(<Codes />)
    now = 60000
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    expect(host.textContent).toBe('222222')
    const calls = generate.mock.calls.length
    await mount(null)
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(generate).toHaveBeenCalledTimes(calls)
  } finally { clock.mockRestore(); generate.mockRestore() }
})

test('saved theme restores on reopening and changes persist immediately', async () => {
  let theme!: ReturnType<typeof useTheme>
  function Theme() { theme = useTheme(); return <p>{theme.resolvedTheme}</p> }
  localStorage.setItem('theme', JSON.stringify('dark'))
  await mount(<ThemeProvider initialTheme={await StorageManager.getTheme()}><Theme /></ThemeProvider>)
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(document.documentElement.style.colorScheme).toBe('dark')
  await act(async () => { await theme.setTheme('light') })
  expect(document.documentElement.classList.contains('dark')).toBe(false)
  expect(await StorageManager.getTheme()).toBe('light')
  await mount(null)
  await mount(<ThemeProvider initialTheme={await StorageManager.getTheme()}><Theme /></ThemeProvider>)
  expect(host.textContent).toBe('light')
})

test('system theme follows changes, explicit choice overrides them, and failed saves roll back', async () => {
  const media = Object.assign(new window.EventTarget(), { matches: false })
  const matchMedia = spyOn(window, 'matchMedia').mockReturnValue(media as unknown as MediaQueryList)
  let theme!: ReturnType<typeof useTheme>
  function Theme() { theme = useTheme(); return <p>{theme.resolvedTheme}</p> }
  try {
    await mount(<ThemeProvider initialTheme="system"><Theme /></ThemeProvider>)
    expect(host.textContent).toBe('light')
    await act(async () => { media.matches = true; media.dispatchEvent(new Event('change')) })
    expect(host.textContent).toBe('dark')
    await act(async () => { await theme.setTheme('light') })
    await act(async () => media.dispatchEvent(new Event('change')))
    expect(host.textContent).toBe('light')
    const save = spyOn(StorageManager, 'saveTheme').mockRejectedValue(new Error('disk full'))
    try {
      await act(async () => { await expect(theme.setTheme('dark')).rejects.toThrow('disk full') })
      expect(host.textContent).toBe('light')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(theme.saving).toBe(false)
    } finally { save.mockRestore() }
  } finally { matchMedia.mockRestore() }
})
