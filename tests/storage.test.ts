import { afterEach, expect, test } from 'bun:test'
import { StorageManager, DEFAULT_AUTOFILL_SETTINGS } from '../src/utils/storage'

const originalChrome = Object.getOwnPropertyDescriptor(globalThis, 'chrome')
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
afterEach(() => {
  for (const [name, descriptor] of [['chrome', originalChrome], ['localStorage', originalLocalStorage]] as const) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else Reflect.deleteProperty(globalThis, name)
  }
})

test('Chrome settings and language write failures reach callers', async () => {
  const failure = new Error('quota exceeded')
  Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { storage: { sync: {
    set: async () => { throw failure }, remove: async () => { throw failure },
  } } } })
  await expect(StorageManager.saveSettings(DEFAULT_AUTOFILL_SETTINGS)).rejects.toThrow('quota exceeded')
  await expect(StorageManager.saveLanguage('en-US')).rejects.toThrow('quota exceeded')
  await expect(StorageManager.removeLanguage()).rejects.toThrow('quota exceeded')
})

test('localStorage failures are not reported as successful writes', async () => {
  Object.defineProperty(globalThis, 'chrome', { configurable: true, value: undefined })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    setItem: () => { throw new Error('disk full') },
    removeItem: () => { throw new Error('denied') },
  } })
  await expect(StorageManager.saveSettings(DEFAULT_AUTOFILL_SETTINGS)).rejects.toThrow('disk full')
  await expect(StorageManager.removeLanguage()).rejects.toThrow('denied')
})

test('settings round trip preserves the unchanged option', async () => {
  const data: Record<string, unknown> = {}
  Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { storage: { sync: {
    set: async (value: object) => { Object.assign(data, value) },
    get: async () => data,
  } } } })
  await StorageManager.saveSettings({ ...DEFAULT_AUTOFILL_SETTINGS, clipboardFallback: false })
  expect(await StorageManager.getSettings()).toEqual({ autofillInlineMenu: true, clipboardFallback: false })
})
