import { afterAll, afterEach, beforeEach, expect, test } from 'bun:test'
import { Window } from 'happy-dom'
import React, { act } from 'react'
import { I18nProvider, useI18n } from '../src/contexts/I18nContext'
import { StorageManager } from '../src/utils/storage'

const browser = new Window({ url: 'http://localhost/' })
const keys = ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event', 'CustomEvent', 'localStorage', 'chrome', 'IS_REACT_ACT_ENVIRONMENT']
const originals = keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)
for (const key of keys.filter(key => !['chrome', 'IS_REACT_ACT_ENVIRONMENT'].includes(key))) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (browser as any)[key] })
}
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true })
Object.defineProperty(navigator, 'language', { configurable: true, value: 'en-US' })
const { createRoot } = await import('react-dom/client')
let root: ReturnType<typeof createRoot>, host: HTMLDivElement
let language: ReturnType<typeof useI18n>
function Language() { language = useI18n(); return <p>{language.locale}</p> }
const mount = () => act(async () => { root.render(<I18nProvider><Language /></I18nProvider>) })
async function reopen() {
  await act(async () => root.unmount())
  root = createRoot(host)
  await mount()
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'chrome', { configurable: true, value: undefined })
  localStorage.clear()
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
afterAll(async () => {
  await browser.happyDOM.abort()
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(globalThis, key)
  }
})

test('an unset language follows the browser, while explicit Chinese survives reopening', async () => {
  await mount()
  expect(host.textContent).toBe('en-US')
  expect(await StorageManager.getLanguage()).toBeUndefined()
  await act(async () => { await language.setLocale('zh-CN') })
  await reopen()
  expect(host.textContent).toBe('zh-CN')
  expect(await StorageManager.getLanguage()).toBe('zh-CN')
})

test('resetting the language keeps following the browser after reopening', async () => {
  await StorageManager.saveLanguage('zh-CN')
  await mount()
  expect(host.textContent).toBe('zh-CN')
  await act(async () => { await language.resetLanguage() })
  expect(host.textContent).toBe('en-US')
  expect(await StorageManager.getLanguage()).toBeUndefined()
  await reopen()
  expect(host.textContent).toBe('en-US')
})
