import { openAccountAdvanced } from './advanced-helpers'
import QRCode from 'qrcode'
import { test, expect, accounts } from './extension'

const secret = accounts[1].secret

for (const input of ['invalid QR image', 'unsupported URI'] as const) {
  test(`${input} preserves a manual account draft that can still be saved`, async ({ popup }) => {
    await popup.getByRole('button', { name: '添加账户', exact: true }).click()
    const dialog = popup.getByRole('dialog', { name: '添加账户', exact: true })
    await dialog.locator('#name').fill('Draft account')
    await openAccountAdvanced(dialog)
    await dialog.locator('#website').fill('example.test')
    await dialog.locator('#code-type').selectOption('steam')
    await dialog.locator('#steam-secret-format').selectOption('base32')
    await dialog.locator('#secret').fill(secret)

    if (input === 'invalid QR image') {
      await dialog.locator('input[type=file]').setInputFiles({ name: 'unsupported.png', mimeType: 'image/png',
        buffer: await QRCode.toBuffer('https://example.test/not-an-otp') })
    } else {
      await dialog.evaluate((element, uri) => {
        const transfer = new DataTransfer()
        transfer.setData('text/plain', uri)
        element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer }))
      }, `otpauth://totp/Unsupported?secret=${secret}&algorithm=MD5`)
    }

    await expect(popup.locator('[data-sonner-toast][data-type="error"]').last()).toBeVisible()
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('#name')).toHaveValue('Draft account')
    await expect(dialog.locator('#website')).toHaveValue('example.test')
    await expect(dialog.locator('#secret')).toHaveValue(secret)
    await expect(dialog.locator('#code-type')).toHaveValue('steam')
    await expect(popup.getByRole('dialog', { name: '导入账户', exact: true })).toHaveCount(0)
    await dialog.getByRole('button', { name: '保存', exact: true }).click()
    const card = popup.locator('.sortable-account[aria-label="Draft account"]')
    await expect(card.locator('.font-mono')).toHaveText(/^[A-Z0-9]{5}$/)
    await popup.reload()
    await expect(card).toBeVisible()
  })
}

test('an old QR read cannot replace a newly reopened account draft', async ({ popup }) => {
  await popup.evaluate(() => {
    const state = window as typeof window & { releaseQR?: () => void; qrLoaded?: boolean }
    const source = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!
    let first = true
    Object.defineProperty(HTMLImageElement.prototype, 'src', { ...source, set(value: string) {
      if (first && value.startsWith('blob:')) { first = false; state.releaseQR = () => source.set!.call(this, value) }
      else source.set!.call(this, value)
    } })
    const OriginalImage = window.Image
    window.Image = function (...args: ConstructorParameters<typeof Image>) {
      const image = new OriginalImage(...args)
      image.addEventListener('load', () => { queueMicrotask(() => { state.qrLoaded = true }) })
      return image
    } as typeof Image
  })
  await popup.getByRole('button', { name: '添加账户', exact: true }).click()
  let dialog = popup.getByRole('dialog', { name: '添加账户', exact: true })
  await dialog.locator('input[type=file]').setInputFiles({ name: 'old-public-qr.png', mimeType: 'image/png',
    buffer: await QRCode.toBuffer(`otpauth://totp/Old%20scan?secret=${secret}`) })
  await expect(dialog.getByRole('button', { name: '扫描二维码', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await popup.getByRole('button', { name: '添加账户', exact: true }).click()
  dialog = popup.getByRole('dialog', { name: '添加账户', exact: true })
  await dialog.locator('#name').fill('New draft')
  await dialog.locator('#secret').fill(secret)
  await popup.evaluate(() => (window as typeof window & { releaseQR?: () => void }).releaseQR!())
  await expect.poll(() => popup.evaluate(() => (window as typeof window & { qrLoaded?: boolean }).qrLoaded)).toBe(true)
  await expect(dialog.locator('#name')).toHaveValue('New draft')
  await expect(dialog.locator('#secret')).toHaveValue(secret)
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(popup.locator('.sortable-account[aria-label="New draft"]')).toBeVisible()
  await expect(popup.locator('.sortable-account[aria-label="Old scan"]')).toHaveCount(0)
})

function migrationPart(index: number, algorithm: 1 | 2 | 4, batchSize = 2) {
  const name = Buffer.from(algorithm === 4 ? 'Unsupported entry' : algorithm === 2 ? 'SHA256 migration' : 'Valid migration')
  const key = Buffer.from('1234567890')
  // Algorithm enum 4 is MD5; SHA256 (2) is now supported.
  const entry = [10, key.length, ...key, 18, name.length, ...name, 32, algorithm, 40, 1, 48, 2]
  const payload = [10, entry.length, ...entry, 16, 1, 24, batchSize, 32, index, 40, 42]
  return `otpauth-migration://offline?data=${encodeURIComponent(Buffer.from(payload).toString('base64'))}`
}

test('a valid incomplete Google batch still opens import even when its first part has only unsupported entries', async ({ popup }) => {
  await popup.getByRole('button', { name: '添加账户', exact: true }).click()
  await popup.getByRole('dialog').evaluate((element, uri) => {
    const transfer = new DataTransfer()
    transfer.setData('text/plain', uri)
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer }))
  }, migrationPart(0, 4))
  const dialog = popup.getByRole('dialog', { name: '导入账户', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('已收集 1/2 张二维码')
  await expect(dialog.getByRole('button', { name: '导入 (0)', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: '粘贴链接或 JSON', exact: true }).click()
  await dialog.locator('#import-text').fill(migrationPart(1, 1))
  await dialog.getByRole('button', { name: '识别文本', exact: true }).click()
  await expect(dialog).toContainText('已收集 2/2 张二维码')
  await expect(dialog).toContainText('Valid migration')
  await expect(dialog.getByRole('button', { name: '导入 (1)', exact: true })).toBeEnabled()
})

test('a SHA256 Google migration is imported and preserves its algorithm after reopening', async ({ popup }) => {
  await popup.getByRole('button', { name: '添加账户', exact: true }).click()
  await popup.getByRole('dialog').evaluate((element, uri) => {
    const transfer = new DataTransfer()
    transfer.setData('text/plain', uri)
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer }))
  }, migrationPart(0, 2, 1))
  const dialog = popup.getByRole('dialog', { name: '导入账户', exact: true })
  await expect(dialog).toContainText('SHA256 migration')
  await dialog.getByRole('button', { name: '导入 (1)', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await popup.reload()
  const card = popup.locator('.sortable-account[aria-label="SHA256 migration"]')
  await expect(card.locator('.font-mono')).toHaveText(/^\d{3} \d{3}$/)
  await card.click({ button: 'right', position: { x: 12, y: 12 } })
  await popup.getByRole('menuitem', { name: '编辑', exact: true }).click()
  await openAccountAdvanced(popup)
  await expect(popup.getByRole('dialog').locator('#algorithm')).toHaveValue('SHA256')
})
