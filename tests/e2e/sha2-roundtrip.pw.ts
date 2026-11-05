import { readFile } from 'node:fs/promises'
import { createHmac } from 'node:crypto'
import { test, expect, accounts } from './extension'

const codeAt = (seconds: number, period: number) => {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(seconds / period)))
  const hmac = createHmac('sha512', Buffer.from('12345678901234567890')).update(counter).digest()
  return String((hmac.readUInt32BE(hmac[63] & 15) & 0x7fffffff) % 100000000).padStart(8, '0')
}

test('manual SHA512/8/60 selection preserves code through clipboard and downloaded QR rescan', async ({ popup, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await popup.clock.setFixedTime(59000)
  await popup.getByRole('button', { name: '添加账户', exact: true }).click()
  await popup.locator('#name').fill('SHA512 example')
  await popup.locator('#secret').fill(accounts[0].secret)
  await popup.locator('#algorithm').selectOption('SHA512')
  await popup.locator('#digits').selectOption('8')
  await popup.locator('#period').selectOption('60')
  await popup.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click()
  const card = popup.locator('.sortable-account[aria-label="SHA512 example"]')
  const expected = codeAt(59, 60)
  await expect(card.locator('.font-mono')).toHaveText(`${expected.slice(0, 4)} ${expected.slice(4)}`)
  await card.locator('.account-card').click({ position: { x: 12, y: 12 } })
  await expect.poll(() => popup.evaluate(() => navigator.clipboard.readText())).toBe(expected)
  await card.click({ button: 'right', position: { x: 12, y: 12 } })
  await popup.getByRole('menuitem', { name: '显示二维码', exact: true }).click()
  const download = popup.waitForEvent('download')
  await popup.getByRole('button', { name: '下载二维码', exact: true }).click()
  const path = (await (await download).path())!
  await popup.getByRole('button', { name: '关闭', exact: true }).click()
  await popup.getByRole('button', { name: '添加账户', exact: true }).click()
  await popup.locator('input[type=file]').setInputFiles(path)
  await expect(popup.locator('#name')).toHaveValue('SHA512 example')
  await expect(popup.locator('#secret')).toHaveValue(accounts[0].secret)
  await expect(popup.locator('#algorithm')).toHaveValue('SHA512')
  await expect(popup.locator('#digits')).toHaveValue('8')
  await expect(popup.locator('#period')).toHaveValue('60')
  await popup.locator('#name').fill('Recovered SHA512')
  await popup.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click()
  await popup.reload()
  const restored = popup.locator('.sortable-account[aria-label="Recovered SHA512"]')
  await expect(restored.locator('.font-mono')).toHaveText(`${expected.slice(0, 4)} ${expected.slice(4)}`)
})

test('mixed 15/30/45/60 second cards maintain independent countdowns and proportional rings', async ({ popup }) => {
  await popup.evaluate(async ({ secret }) => {
    const old = await chrome.runtime.sendMessage({ type: 'MFA_VAULT', action: 'snapshot' })
    const result = await chrome.runtime.sendMessage({ type: 'MFA_VAULT', action: 'save', revision: old.value.revision,
      accounts: [15, 30, 45, 60].map(period => ({ name: `Period ${period}`, secret, period, algorithm: 'SHA512', digits: 8 })) })
    if (!result.ok) throw new Error(result.error)
  }, { secret: accounts[0].secret })
  // Pause at a future time: installing at 44s and immediately pausing at 44s
  // races the real elapsed milliseconds between the two protocol calls.
  await popup.clock.install({ time: 0 })
  await popup.clock.pauseAt(44000)
  await popup.reload()
  for (const period of [15, 30, 45, 60]) {
    const card = popup.locator(`.sortable-account[aria-label="Period ${period}"]`)
    const remaining = period - 44 % period
    await expect(card.locator('span.text-xs')).toHaveText(String(remaining))
    const ring = await card.locator('circle').last().evaluate(el => ({offset:Number(el.getAttribute('stroke-dashoffset')), circumference:Number(el.getAttribute('stroke-dasharray'))}))
    expect(ring.offset / ring.circumference).toBeCloseTo(1 - remaining / period, 5)
  }
  await popup.clock.runFor(1000)
  for (const period of [15, 30, 45, 60]) {
    const card = popup.locator(`.sortable-account[aria-label="Period ${period}"]`)
    await expect(card.locator('span.text-xs')).toHaveText(String(period - 45 % period))
    const expected = codeAt(45, period)
    await expect(card.locator('.font-mono')).toHaveText(`${expected.slice(0, 4)} ${expected.slice(4)}`)
  }
})

test('encrypted native backup restores SHA512 parameters and exact key into an empty vault', async ({ popup, worker }) => {
  const account = { name: 'Encrypted SHA512', secret: accounts[0].secret, algorithm: 'SHA512', digits: 8, period: 45 }
  const password = 'public-sha512-backup-test'
  await popup.evaluate(async ({ account, password }) => {
    const call = async (action: string, input = {}) => {
      const response = await chrome.runtime.sendMessage({ type: 'MFA_VAULT', action, ...input })
      if (!response.ok) throw new Error(response.error)
      return response.value
    }
    const initial = await call('snapshot')
    const saved = await call('save', { revision: initial.revision, accounts: [account] })
    await call('enable', { revision: saved.revision, nextPassword: password })
  }, { account, password })
  await popup.reload()
  await popup.getByRole('button', { name: '设置', exact: true }).click()
  await popup.getByRole('dialog').getByRole('button', { name: '导出', exact: true }).click()
  const download = popup.waitForEvent('download')
  await popup.getByRole('alertdialog').getByRole('button', { name: '导出', exact: true }).click()
  const backup = await readFile((await (await download).path())!, 'utf8')
  expect(JSON.parse(backup).format).toBe('mfa-encrypted')
  expect(backup).not.toContain(account.secret)
  await worker.evaluate(async () => {
    await chrome.storage.sync.clear(); await chrome.storage.local.clear(); await chrome.storage.session.clear()
    await chrome.storage.sync.set({ language: 'zh-CN' })
  })
  await popup.reload()
  await expect(popup.getByText('暂无账户', { exact: true })).toBeVisible()
  await popup.getByRole('button', { name: '设置', exact: true }).click()
  await popup.getByRole('dialog').getByRole('button', { name: '导入', exact: true }).click()
  await popup.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) })
  await popup.locator('#import-password').fill(password)
  await popup.getByRole('button', { name: '解锁', exact: true }).click()
  await popup.getByRole('button', { name: '导入 (1)', exact: true }).click()
  await expect(popup.locator('.sortable-account')).toHaveCount(1)
  await popup.reload()
  const restored = await popup.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'MFA_VAULT', action: 'snapshot' })).value.accounts)
  expect(restored).toEqual([account])
})
