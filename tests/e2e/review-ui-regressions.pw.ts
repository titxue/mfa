import QRCode from 'qrcode'
import { TOTP } from '../../src/utils/totp'
import { test, expect, accounts } from './extension'

// This public fixture is valid both as Base32 and as a canonical Base64 shared_secret.
const ambiguous = 'ABCDEFGHIJKLMNOPQRSTUVWXYZA='
const secret = accounts[1].secret

for (const encoding of ['base32', 'base64'] as const) {
  test(`manual Steam ${encoding} is explicit even when the secret fits both encodings`, async ({ popup }) => {
    await popup.getByRole('button', { name: '添加账户', exact: true }).click()
    const dialog = popup.getByRole('dialog', { name: '添加账户', exact: true })
    const name = `Steam ${encoding}`
    await dialog.locator('#name').fill(name)
    await dialog.locator('#code-type').selectOption('steam')
    await dialog.locator('#secret').fill(ambiguous)
    await dialog.getByRole('button', { name: '保存', exact: true }).click()
    await expect(popup.locator('[data-sonner-toast][data-type="error"]').last()).toContainText('请选择密钥格式')
    await expect(dialog).toBeVisible()
    await dialog.locator('#steam-secret-format').selectOption(encoding)
    await dialog.getByRole('button', { name: '保存', exact: true }).click()
    await expect(popup.locator(`.sortable-account[aria-label="${name}"] .font-mono`)).toHaveText(/^[A-Z0-9]{5}$/)
    const stored = await popup.evaluate(async name => {
      const response = await chrome.runtime.sendMessage({ type: 'MFA_VAULT', action: 'snapshot' })
      return response.value.accounts.find((account: { name: string }) => account.name === name)
    }, name)
    const expected = encoding === 'base32' ? ambiguous.slice(0, -1) : TOTP.base32Encode(new Uint8Array(Buffer.from(ambiguous, 'base64')))
    expect(stored).toMatchObject({ secret: expected, type: 'steam' })
    await popup.reload()
    await expect(popup.locator(`.sortable-account[aria-label="${name}"]`)).toBeVisible()
  })
}

for (const source of ['URI', 'QR'] as const) {
  test(`known Steam ${source} keeps its normalized Base32 without guessing`, async ({ popup }) => {
    await popup.getByRole('button', { name: '添加账户', exact: true }).click()
    const dialog = popup.getByRole('dialog', { name: '添加账户', exact: true })
    const name = `Steam ${source}`
    const uri = `otpauth://totp/${encodeURIComponent(name)}?secret=${secret}&encoder=steam&digits=5`
    if (source === 'QR') {
      await dialog.locator('input[type=file]').setInputFiles({ name: 'public-steam.png', mimeType: 'image/png', buffer: await QRCode.toBuffer(uri) })
    } else await dialog.evaluate((element, uri) => {
      const transfer = new DataTransfer(); transfer.setData('text/plain', uri)
      element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer }))
    }, uri)
    await expect(dialog.locator('#name')).toHaveValue(name)
    await expect(dialog.locator('#secret')).toHaveValue(secret)
    await expect(dialog.locator('#steam-secret-format')).toHaveValue('base32')
    await dialog.getByRole('button', { name: '保存', exact: true }).click()
    await expect(popup.locator(`.sortable-account[aria-label="${name}"] .font-mono`)).toHaveText(/^[A-Z0-9]{5}$/)
  })
}

test('an old submit cannot clear, close or leave loading on a reopened add session', async ({ context, worker, popupUrl }) => {
  await worker.evaluate(async () => {
    await chrome.storage.sync.clear(); await chrome.storage.local.clear(); await chrome.storage.session.clear()
    await chrome.storage.sync.set({ language: 'zh-CN' })
  })
  const popup = await context.newPage(); await popup.goto(popupUrl)
  await popup.getByRole('button', { name: '添加账户', exact: true }).click()
  await popup.locator('#name').fill('Old submitted account'); await popup.locator('#secret').fill(secret)
  await popup.evaluate(() => {
    const state = window as typeof window & { releaseValidation?: () => void }
    const sign = crypto.subtle.sign.bind(crypto.subtle)
    let first = true
    crypto.subtle.sign = function (...args: Parameters<typeof crypto.subtle.sign>) {
      if (first) {
        first = false
        return new Promise<ArrayBuffer>((resolve, reject) => { state.releaseValidation = () => { void sign(...args).then(resolve, reject) } })
      }
      return sign(...args)
    }
  })
  await popup.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(() => popup.evaluate(() => typeof (window as any).releaseValidation)).toBe('function')
  await popup.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
  await popup.getByRole('button', { name: '添加账户', exact: true }).click()
  const reopened = popup.getByRole('dialog', { name: '添加账户', exact: true })
  await reopened.locator('#name').fill('New draft'); await reopened.locator('#secret').fill(secret)
  await expect(reopened.getByRole('button', { name: '保存', exact: true })).toBeEnabled()
  await popup.evaluate(() => (window as any).releaseValidation())
  await expect.poll(() => popup.evaluate(async () => {
    const response = await chrome.runtime.sendMessage({ type: 'MFA_VAULT', action: 'snapshot' })
    if (!response.ok) throw new Error(response.error)
    return response.value.accounts.map((account: { name: string }) => account.name)
  })).toContain('Old submitted account')
  await expect(reopened).toBeVisible(); await expect(reopened.locator('#name')).toHaveValue('New draft')
  await expect(reopened.getByRole('button', { name: '保存', exact: true })).toBeEnabled()
  await reopened.getByRole('button', { name: '保存', exact: true }).click()
  await expect(popup.locator('.sortable-account[aria-label="New draft"]')).toBeVisible()
  await popup.reload()
  await expect(popup.locator('.sortable-account[aria-label="Old submitted account"]')).toBeVisible()
  await expect(popup.locator('.sortable-account[aria-label="New draft"]')).toBeVisible()
})

test('a different popup keeps its draft when an already-issued write completes', async ({ context, popup, worker, popupUrl }) => {
  const other = await context.newPage(); await other.goto(popupUrl)
  await expect(other.getByRole('button', { name: '添加账户', exact: true })).toBeVisible()
  await worker.evaluate(() => {
    const state = globalThis as typeof globalThis & { releaseWrite?: () => void }
    const set = chrome.storage.sync.set.bind(chrome.storage.sync)
    let first = true
    chrome.storage.sync.set = async (values: Record<string, unknown>) => {
      if (first && values[(globalThis as any).testVaultKey]) { first = false; await new Promise<void>(resolve => { state.releaseWrite = resolve }) }
      return set(values)
    }
  })
  await popup.getByRole('button', { name: '添加账户', exact: true }).click()
  await popup.locator('#name').fill('Issued save'); await popup.locator('#secret').fill(secret)
  await popup.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(() => worker.evaluate(() => typeof (globalThis as any).releaseWrite)).toBe('function')
  await popup.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
  await other.getByRole('button', { name: '添加账户', exact: true }).click()
  await other.locator('#name').fill('Other popup draft'); await other.locator('#secret').fill(secret)
  await worker.evaluate(() => (globalThis as any).releaseWrite())
  await expect.poll(() => worker.evaluate(async () => (await chrome.storage.sync.get((globalThis as any).testVaultKey))[(globalThis as any).testVaultKey].record.accounts.map((account: { name: string }) => account.name))).toContain('Issued save')
  await expect(other.getByRole('dialog', { name: '添加账户', exact: true })).toBeVisible()
  await expect(other.locator('#name')).toHaveValue('Other popup draft')
  await other.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
  await expect(other.locator('.sortable-account[aria-label="Issued save"]')).toBeVisible()
})

test('first use follows system English and a language reset still follows it after reopening', async ({ context, worker, popupUrl }) => {
  await context.addInitScript(() => Object.defineProperty(navigator, 'language', { configurable: true, value: 'en-US' }))
  await worker.evaluate(async () => { await chrome.storage.sync.remove('language') })
  const popup = await context.newPage(); await popup.goto(popupUrl)
  await popup.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(popup.locator('#language')).toHaveValue('en-US')
  await popup.locator('#language').selectOption('zh-CN')
  await expect(popup.locator('#language')).toBeEnabled()
  await popup.reload(); await popup.getByRole('button', { name: '设置', exact: true }).click()
  await expect(popup.locator('#language')).toHaveValue('zh-CN')
  for (let click = 0; click < 3; click++) await popup.locator('h3').filter({ hasText: /^语言设置$/ }).click()
  await expect(popup.locator('#language')).toHaveValue('en-US')
  expect(await worker.evaluate(async () => (await chrome.storage.sync.get('language')).language)).toBeUndefined()
  await popup.reload(); await popup.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(popup.locator('#language')).toHaveValue('en-US')
})
