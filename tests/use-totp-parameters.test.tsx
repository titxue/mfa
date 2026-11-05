import { afterAll, afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import { createHmac } from 'node:crypto'
import { Window } from 'happy-dom'
import React, { act } from 'react'
import { useTOTP } from '../src/hooks/useTOTP'
import { TOTP } from '../src/utils/totp'
import type { Account } from '../src/types'

const browser = new Window({ url: 'http://localhost/' })
const names = ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event', 'IS_REACT_ACT_ENVIRONMENT', 'crypto']
const original = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const)
for (const name of names.filter(name => !['IS_REACT_ACT_ENVIRONMENT', 'crypto'].includes(name))) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: (browser as any)[name] })
}
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true })
// Deterministic real fallback computation; expected codes below use independent Node HMAC.
Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { subtle: undefined } })
const { createRoot } = await import('react-dom/client')
const key = new TextEncoder().encode('synthetic parameter test key only')
const secret = TOTP.base32Encode(key)
let root: ReturnType<typeof createRoot>
let host: HTMLDivElement
let now: number
let timer: () => void
let result: ReturnType<typeof useTOTP>
let clock: ReturnType<typeof spyOn>
let scheduler: ReturnType<typeof spyOn>

function Codes({ accounts }: { accounts: Account[] }) {
  result = useTOTP(accounts)
  return <output>{JSON.stringify(result.codes)}</output>
}
const render = async (accounts: Account[]) => { await act(async () => root.render(<Codes accounts={accounts} />)) }
const tick = async (seconds: number) => { now = seconds * 1000; await act(async () => timer()) }
function expected(account: Account, seconds: number): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(seconds / (account.period ?? 30))))
  const digest = createHmac((account.algorithm ?? 'SHA1').toLowerCase(), key).update(counter).digest()
  const offset = digest[digest.length - 1] & 15
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** (account.digits ?? 6)).toString().padStart(account.digits ?? 6, '0')
}
beforeEach(() => {
  now = 59_000
  clock = spyOn(Date, 'now').mockImplementation(() => now)
  scheduler = spyOn(window, 'setTimeout').mockImplementation(((callback: () => void) => { timer = callback; return 100_000 }) as typeof window.setTimeout)
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove(); clock.mockRestore(); scheduler.mockRestore()
})
afterAll(() => {
  browser.happyDOM.abort()
  for (const [name, descriptor] of original) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else Reflect.deleteProperty(globalThis, name)
  }
})

test('15, 30, 45 and 120 second accounts roll over independently with matching codes and countdowns', async () => {
  const accounts: Account[] = [15, 30, 45, 120].map(period => ({ name: String(period), secret, period, digits: 8, algorithm: 'SHA512' }))
  await render(accounts)
  for (const seconds of [59, 60, 61, 89, 90, 119, 120]) {
    if (seconds !== 59) await tick(seconds)
    for (const account of accounts) {
      expect(result.codes[account.name]).toBe(expected(account, seconds))
      expect(result.remainings[account.name]).toBe(account.period! - seconds % account.period!)
    }
  }
})

for (const change of [{ algorithm: 'SHA256' as const }, { digits: 8 as const }, { period: 45 }]) {
  test(`${Object.keys(change)[0]} editing refreshes the existing account without waiting for a time boundary`, async () => {
    now = 89_000
    const account: Account = { name: 'Editable', secret }
    await render([account])
    const previous = result.codes.Editable
    const edited = { ...account, ...change }
    await render([edited])
    expect(result.codes.Editable).toBe(expected(edited, 89))
    expect(result.codes.Editable).not.toBe(previous)
    expect(result.remainings.Editable).toBe((edited.period ?? 30) - 89 % (edited.period ?? 30))
  })
}

test('invalid secrets show 6/8/Steam-sized placeholders without suppressing healthy accounts', async () => {
  const healthy: Account = { name: 'Healthy', secret, algorithm: 'SHA256', digits: 8 }
  await render([healthy, { name: 'Six', secret: '!' }, { name: 'Eight', secret: '!', digits: 8 }, { name: 'Steam', secret: '!', type: 'steam' }])
  expect(result.codes).toEqual({ Healthy: expected(healthy, 59), Six: '------', Eight: '--------', Steam: '-----' })
})

test('focus after a parameter edit rejects delayed old codes and preserves the new account countdown', async () => {
  const pending: ((code: string) => void)[] = []
  const generation = spyOn(TOTP, 'generateTOTP').mockImplementation(() => new Promise(resolve => pending.push(resolve)))
  try {
    await render([{ name: 'Edited', secret, period: 30 }])
    await render([{ name: 'Edited', secret, algorithm: 'SHA512', digits: 8, period: 45 }])
    now = 90_000
    await act(async () => window.dispatchEvent(new Event('focus')))
    expect(pending).toHaveLength(3)
    await act(async () => pending[2]('33333333'))
    expect(result.codes.Edited).toBe('33333333')
    expect(result.remainings.Edited).toBe(45)
    await act(async () => { pending[1]('22222222'); pending[0]('111111') })
    expect(result.codes.Edited).toBe('33333333')
    expect(result.remainings.Edited).toBe(45)
  } finally { generation.mockRestore() }
})
