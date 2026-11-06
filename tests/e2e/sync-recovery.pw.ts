import { readFile } from 'node:fs/promises'
import { test, expect, accounts } from './extension'
import { V2_KEY, MIGRATION_PREFIX, RECOVERY_KEY } from '../../src/utils/vault-sync'
import { encryptAccounts, deriveKey, newSalt } from '../../src/utils/vault-crypto'

for (const encrypted of [false, true]) {
  test(`legacy ${encrypted ? 'encrypted' : 'plain'} vault requires explicit migration and retains accounts`, async ({ context, worker, popupUrl }) => {
    const password = 'synthetic-migration-password'
    const salt = newSalt()
    const record = encrypted
      ? { version: 1, revision: 'legacy', mode: 'encrypted', data: await encryptAccounts(accounts, await deriveKey(password, salt), salt) }
      : { version: 1, revision: 'legacy', mode: 'plain', accounts }
    await worker.evaluate(async record => {
      await chrome.storage.sync.clear(); await chrome.storage.local.clear(); await chrome.storage.session.clear()
      await chrome.storage.sync.set({ accountVault: record, language: 'zh-CN' })
    }, record)
    const page = await context.newPage(); await page.goto(popupUrl)
    await expect(page.getByRole('heading', { name: '升级账户同步' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: '迁移', exact: true })).toBeEnabled()
    const before = await worker.evaluate(async () => ({ sync: await chrome.storage.sync.get(null), local: await chrome.storage.local.get(null) }))
    expect(before.sync.accountVault).toEqual(record)
    expect(Object.keys(before.sync).filter(key => key === V2_KEY || key.startsWith(MIGRATION_PREFIX))).toEqual([])
    expect(before.local[RECOVERY_KEY]).toBeUndefined()
    await page.getByRole('button', { name: '迁移', exact: true }).click()
    if (encrypted) {
      await expect(page.locator('#unlock-password')).toBeVisible()
      await expect(page.locator('.sortable-account')).toHaveCount(0)
      await page.locator('#unlock-password').fill(password)
      await page.getByRole('button', { name: '解锁', exact: true }).click()
    }
    await expect(page.locator('.sortable-account')).toHaveCount(accounts.length)
    const restored = await page.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'MFA_VAULT', action: 'snapshot' })).value)
    expect(restored.accounts).toEqual(accounts)
    expect(restored.protected).toBe(encrypted)
    await page.reload()
    await expect(page.locator('.sortable-account')).toHaveCount(accounts.length)
  })
}

test('conflicting versions can both be exported before an explicit resolution', async ({ context, worker, popupUrl }) => {
  const left = { id: 'left', vector: { left: 1 }, record: { version: 2, revision: 'left', mode: 'plain', accounts: [accounts[0]] } }
  const right = { id: 'right', vector: { right: 1 }, record: { version: 2, revision: 'right', mode: 'plain', accounts: [accounts[1]] } }
  await worker.evaluate(async ({ left, right, key, prefix }) => {
    await chrome.storage.sync.clear(); await chrome.storage.local.clear(); await chrome.storage.session.clear()
    await chrome.storage.sync.set({ [key]: left, [prefix + right.id]: right, language: 'zh-CN' })
  }, { left, right, key: V2_KEY, prefix: MIGRATION_PREFIX })
  const page = await context.newPage(); await page.goto(popupUrl)
  await expect(page.getByRole('heading', { name: '发现不同的账户版本' })).toBeVisible()
  const allDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出所有版本', exact: true }).click()
  const all = JSON.parse(await readFile((await (await allDownload).path())!, 'utf8'))
  expect(all.format).toBe('mfa-recovery')
  expect(all.synchronized[V2_KEY]).toEqual(left)
  expect(all.synchronized[MIGRATION_PREFIX + right.id]).toEqual(right)
  await page.locator('#recovery-candidate').selectOption('right')
  const selectedDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出此版本以供导入', exact: true }).click()
  const selected = JSON.parse(await readFile((await (await selectedDownload).path())!, 'utf8'))
  expect(selected.accounts).toEqual(right.record.accounts)
  await page.getByRole('button', { name: '使用此版本', exact: true }).click()
  await expect(page.locator('.sortable-account')).toHaveCount(1)
  await expect(page.locator('.sortable-account[aria-label="Beta"]')).toBeVisible()
  await page.reload()
  await expect(page.locator('.sortable-account[aria-label="Beta"]')).toBeVisible()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  const settings = page.getByRole('dialog', { name: '设置', exact: true })
  await expect(settings.locator('#settings-advanced-toggle')).toHaveCount(0)
  await expect(settings.getByRole('button', { name: '恢复与历史备份', exact: true })).toHaveCount(0)
  // Removing the ordinary settings entry must not discard recoverable conflict data.
  const archivedResponse = await page.evaluate(() => chrome.runtime.sendMessage({
    type: 'MFA_VAULT', action: 'recoveryBackup', candidateId: 'left',
  }))
  expect(archivedResponse.ok).toBe(true)
  const archived = JSON.parse(archivedResponse.value)
  expect(archived.accounts).toEqual(left.record.accounts)
  await page.keyboard.press('Escape')
  await expect(page.locator('.sortable-account')).toHaveCount(1)
  await expect(page.locator('.sortable-account[aria-label="Beta"]')).toBeVisible()
})

test('a failed sync write exposes its pending version and can be retried explicitly', async ({ popup, worker }) => {
  await worker.evaluate(key => {
    const set = chrome.storage.sync.set.bind(chrome.storage.sync)
    let fail = true
    chrome.storage.sync.set = async values => {
      if (fail && values[key]) { fail = false; throw new Error('Synthetic sync failure') }
      return set(values)
    }
  }, V2_KEY)
  await popup.getByRole('button', { name: '添加账户', exact: true }).click()
  await popup.locator('#name').fill('Pending example')
  await popup.locator('#secret').fill(accounts[0].secret)
  await popup.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click()
  await expect(popup.getByRole('heading', { name: '等待同步' })).toBeVisible()
  const candidates = await popup.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'MFA_VAULT', action: 'recoveries' })).value.candidates)
  const pending = candidates.find((item: { accountNames?: string[]; accountCount?: number }) => item.accountCount === 4)
  expect(pending).toBeDefined()
  await popup.locator('#recovery-candidate').selectOption(pending.id)
  await popup.getByRole('button', { name: '使用此版本', exact: true }).click()
  await expect(popup.locator('.sortable-account')).toHaveCount(4)
  await expect(popup.locator('.sortable-account[aria-label="Pending example"]')).toBeVisible()
  await popup.reload()
  await expect(popup.locator('.sortable-account[aria-label="Pending example"]')).toBeVisible()
})
