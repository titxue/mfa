import { test, expect, accounts } from './extension'
import type { Page } from '@playwright/test'

async function moveFirstToLast(page: Page) {
  const cards = page.locator('.sortable-account')
  const first = (await cards.first().boundingBox())!
  const last = (await cards.last().boundingBox())!
  const x = first.x + first.width - 12
  await page.mouse.move(x, first.y + first.height / 2)
  await page.mouse.down()
  await page.mouse.move(x, first.y + first.height / 2 + 8, { steps: 2 })
  await expect(page.locator('.account-drag-overlay')).toBeVisible()
  await page.mouse.move(x, last.y + last.height / 2, { steps: 5 })
  await page.mouse.up()
}

test('a sync account arriving after commit survives queued sorting', async ({ popup, worker }) => {
  await worker.evaluate(() => {
    const state = globalThis as any
    state.reviewSaveWrites = 0
    state.reviewNotifyCount = 0
    state.reviewHoldNotify = true
    const set = chrome.storage.sync.set.bind(chrome.storage.sync)
    state.reviewExternalWrite = set
    chrome.storage.sync.set = async values => {
      if (values[(globalThis as any).testVaultKey]) state.reviewSaveWrites++
      return set(values)
    }
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    state.reviewReleaseNotify = () => { state.reviewHoldNotify = false; release() }
    const query = chrome.tabs.query.bind(chrome.tabs)
    chrome.tabs.query = (async options => {
      if (state.reviewSaveWrites && state.reviewHoldNotify) {
        state.reviewNotifyCount++
        await gate
      }
      return query(options)
    }) as typeof chrome.tabs.query
  })
  try {
    await moveFirstToLast(popup)
    await expect.poll(() => popup.locator('.sortable-account').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))))
      .toEqual(['Beta', 'Gamma', 'Alpha'])
    // The storage-change notification and the explicit post-commit notification both wait here.
    await expect.poll(() => worker.evaluate(() => (globalThis as any).reviewNotifyCount)).toBeGreaterThanOrEqual(2)
    await moveFirstToLast(popup)
    await expect.poll(() => popup.locator('.sortable-account').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))))
      .toEqual([accounts[2].name, accounts[0].name, accounts[1].name])
    const remote = { name: 'Remote account', secret: accounts[0].secret, website: 'remote.example.test' }
    await worker.evaluate(async account => {
      const state = globalThis as any
      const key = state.testVaultKey
      const current = (await chrome.storage.sync.get(key))[key]
      await state.reviewExternalWrite({ [key]: { id: 'remote-revision',
        vector: { ...current.vector, remote: (current.vector.remote ?? 0) + 1 },
        record: { ...current.record, revision: 'remote-revision',
          accounts: [...current.record.accounts, account] } } })
      state.reviewReleaseNotify()
    }, remote)
    await expect(popup.locator('.sortable-account[aria-label="Remote account"]')).toBeVisible()
    await expect(popup.getByRole('alert')).toBeVisible()
    expect(await worker.evaluate(() => (globalThis as any).reviewSaveWrites)).toBe(1)
    const saved = await worker.evaluate(async () => (await chrome.storage.sync.get((globalThis as any).testVaultKey))[(globalThis as any).testVaultKey].record)
    expect(saved.revision).toBe('remote-revision')
    expect(saved.accounts).toEqual([accounts[1], accounts[2], accounts[0], remote])
    await popup.reload()
    await expect(popup.locator('.sortable-account')).toHaveCount(4)
    await expect(popup.locator('.sortable-account[aria-label="Remote account"]')).toBeVisible()
  } finally {
    await worker.evaluate(() => (globalThis as any).reviewReleaseNotify?.())
  }
})
