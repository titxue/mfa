import { test as base, chromium, type BrowserContext, type Worker, type Page } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { V2_KEY } from '../../src/utils/vault-sync'

// Public test secrets only. Every test gets an isolated browser profile and vault.
export const accounts = [
  { name: 'Alpha', secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' },
  { name: 'Beta', secret: 'JBSWY3DPEHPK3PXP' },
  { name: 'Gamma', secret: 'GEZDGNBVGY3TQOJQ' },
]

export const test = base.extend<{
  context: BrowserContext
  worker: Worker
  popup: Page
  popupUrl: string
}>({
  context: async ({}, use) => {
    const profile = await mkdtemp(join(tmpdir(), 'mfa-regression-'))
    const extension = resolve('dist')
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      headless: true,
      viewport: { width: 380, height: 600 },
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    })
    try { await use(context) }
    finally { await context.close(); await rm(profile, { recursive: true, force: true }) }
  },
  worker: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker')
    await worker.evaluate(async ({ accounts, vaultKey }) => {
      ;(globalThis as any).testVaultKey = vaultKey
      await chrome.storage.sync.clear()
      await chrome.storage.local.clear()
      await chrome.storage.session.clear()
      await chrome.storage.sync.set({ [vaultKey]: { id: 'fixture', vector: { fixture: 1 },
        record: { version: 2, revision: 'fixture', mode: 'plain', accounts } }, language: 'zh-CN' })
    }, { accounts, vaultKey: V2_KEY })
    await use(worker)
  },
  popupUrl: async ({ worker }, use) => {
    const id = new URL(worker.url()).host
    await use(`chrome-extension://${id}/popup.html`)
  },
  popup: async ({ context, popupUrl }, use) => {
    const popup = await context.newPage()
    await popup.goto(popupUrl)
    await popup.locator('.sortable-account').first().waitFor()
    await use(popup)
  },
})
export { expect } from '@playwright/test'
