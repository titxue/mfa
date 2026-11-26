import { readFile } from 'node:fs/promises'
import QRCode from 'qrcode'
import type { BrowserContext, Page, Worker } from '@playwright/test'
import { test, expect, accounts } from './extension'

// Every test uses the extension fixture's disposable Chrome profile and public keys.
const secret = accounts[1].secret
const uriFor = (name: string) => `otpauth://totp/${encodeURIComponent(name)}?secret=${secret}`
const card = (page: Page, name: string) => page.locator('.sortable-account').filter({ has: page.getByText(name, { exact: true }) })

async function emptyPopup(context: BrowserContext, worker: Worker, popupUrl: string) {
  await worker.evaluate(async () => {
    await chrome.storage.sync.clear()
    await chrome.storage.local.clear()
    await chrome.storage.session.clear()
    await chrome.storage.sync.set({ language: 'zh-CN' })
  })
  const page = await context.newPage()
  await page.goto(popupUrl)
  await expect(page.getByText('暂无账户', { exact: true })).toBeVisible()
  return page
}

async function saveForm(page: Page, name: string) {
  await expect(page.locator('#name')).toHaveValue(name)
  await page.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click()
  await expect(card(page, name)).toBeVisible()
  await page.reload()
  await expect(card(page, name)).toBeVisible()
}

async function openImport(page: Page) {
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('dialog', { name: '设置', exact: true }).getByRole('button', { name: '导入', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '导入账户', exact: true })).toBeVisible()
}

test('first use supports manual add, editing account details and confirmed deletion', async ({ context, worker, popupUrl }) => {
  const page = await emptyPopup(context, worker, popupUrl)
  await page.getByRole('button', { name: '添加账户', exact: true }).click()
  await page.locator('#name').fill('Manual example')
  await page.locator('#secret').fill(secret)
  await expect(page.locator('#account-advanced-toggle')).toHaveAttribute('aria-expanded', 'false')
  await page.locator('#website').fill('example.test')
  await expect(page.getByRole('dialog').getByText('已自定义', { exact: true })).toHaveCount(0)
  await saveForm(page, 'Manual example')

  await card(page, 'Manual example').click({ button: 'right' })
  await page.getByRole('menuitem', { name: '编辑', exact: true }).click()
  await expect(page.locator('#account-advanced-toggle')).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#website')).toHaveValue('example.test')
  await page.locator('#name').fill('Renamed example')
  await page.locator('#website').fill('login.example.test')
  await saveForm(page, 'Renamed example')
  await expect(card(page, 'Manual example')).toHaveCount(0)
  await card(page, 'Renamed example').click({ button: 'right' })
  await page.getByRole('menuitem', { name: '编辑', exact: true }).click()
  await expect(page.locator('#account-advanced-toggle')).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#website')).toHaveValue('login.example.test')
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()

  await card(page, 'Renamed example').click({ button: 'right' })
  await page.getByRole('menuitem', { name: '删除', exact: true }).click()
  const confirmation = page.getByRole('alertdialog')
  await expect(confirmation).toContainText('Renamed example')
  await confirmation.getByRole('button', { name: '取消', exact: true }).click()
  await expect(card(page, 'Renamed example')).toBeVisible()
  await card(page, 'Renamed example').click({ button: 'right' })
  await page.getByRole('menuitem', { name: '删除', exact: true }).click()
  await confirmation.getByRole('button', { name: '删除', exact: true }).click()
  await expect(page.getByText('暂无账户', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('暂无账户', { exact: true })).toBeVisible()
})

for (const method of ['upload QR', 'paste image', 'paste URI', 'drop QR'] as const) {
  test(`add account by ${method} decodes and persists an account`, async ({ context, worker, popupUrl }) => {
    const page = await emptyPopup(context, worker, popupUrl)
    const name = `Example ${method}`
    const uri = uriFor(name)
    const png = await QRCode.toBuffer(uri)
    await page.getByRole('button', { name: '添加账户', exact: true }).click()
    const dialog = page.getByRole('dialog')
    if (method === 'upload QR') {
      const chooser = page.waitForEvent('filechooser')
      await dialog.getByRole('button', { name: '扫描二维码', exact: true }).click()
      await (await chooser).setFiles({ name: 'public-test.png', mimeType: 'image/png', buffer: png })
    } else {
      await dialog.evaluate((element, input) => {
        const transfer = new DataTransfer()
        if (input.method === 'paste URI') transfer.setData('text/plain', input.uri)
        else {
          const bytes = Uint8Array.from(atob(input.png), char => char.charCodeAt(0))
          transfer.items.add(new File([bytes], 'public-test.png', { type: 'image/png' }))
        }
        if (input.method === 'drop QR') {
          for (const type of ['dragenter', 'dragover', 'drop']) {
            element.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }))
          }
        } else {
          element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer }))
        }
      }, { method, uri, png: png.toString('base64') })
    }
    await expect(page.locator('#secret')).toHaveValue(secret)
    await saveForm(page, name)
    await expect(card(page, name).locator('.font-mono')).toHaveText(/^\d{3} \d{3}$/)
  })
}

for (const encrypted of [false, true]) {
  test(`${encrypted ? 'encrypted' : 'plain JSON'} backup downloads and restores into an empty installation`, async ({ popup, worker }) => {
    const password = 'public-test-backup-password'
    await popup.getByRole('button', { name: '设置', exact: true }).click()
    if (encrypted) {
      await popup.getByRole('button', { name: /密码保护/ }).click()
      await popup.locator('#new-password').fill(password)
      await popup.locator('#confirm-password').fill(password)
      await popup.getByRole('dialog', { name: '开启密码', exact: true }).getByRole('button', { name: '开启密码', exact: true }).click()
      await expect(popup.locator('#new-password')).toBeHidden()
      await expect(popup.getByRole('button', { name: '立即锁定', exact: true })).toBeVisible()
      if (!await popup.getByRole('dialog', { name: '设置', exact: true }).isVisible()) {
        await popup.getByRole('button', { name: '设置', exact: true }).click()
      }
    }
    await popup.getByRole('dialog', { name: '设置', exact: true }).getByRole('button', { name: '导出', exact: true }).click()
    const downloaded = popup.waitForEvent('download')
    await popup.getByRole('alertdialog', { name: '确认导出', exact: true }).getByRole('button', { name: '导出', exact: true }).click()
    const download = await downloaded
    expect(download.suggestedFilename()).toMatch(/\.json$/)
    const backup = await readFile((await download.path())!, 'utf8')
    const data = JSON.parse(backup)
    if (encrypted) {
      expect(data.format).toBe('mfa-encrypted')
      for (const account of accounts) expect(backup).not.toContain(account.secret)
    } else {
      expect(data.accounts).toEqual(accounts)
    }

    // Recovery uses a clean isolated vault, rather than importing into the source vault.
    await worker.evaluate(async () => {
      await chrome.storage.sync.clear()
      await chrome.storage.local.clear()
      await chrome.storage.session.clear()
      await chrome.storage.sync.set({ language: 'zh-CN' })
    })
    await popup.reload()
    await expect(popup.getByText('暂无账户', { exact: true })).toBeVisible()
    await openImport(popup)
    await popup.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) })
    if (encrypted) {
      await expect(popup.getByRole('button', { name: '导入 (0)', exact: true })).toBeDisabled()
      await popup.locator('#import-password').fill('wrong-public-password')
      await popup.getByRole('button', { name: '解锁', exact: true }).click()
      await expect(popup.getByRole('alert')).toContainText('密码错误')
      await expect(popup.locator('.sortable-account')).toHaveCount(0)
      await popup.locator('#import-password').fill(password)
      await popup.getByRole('button', { name: '解锁', exact: true }).click()
    }
    for (const account of accounts) await expect(popup.getByRole('dialog', { name: '导入账户', exact: true })).toContainText(account.name)
    await popup.getByRole('button', { name: '导入 (3)', exact: true }).click()
    await expect(popup.locator('.sortable-account')).toHaveCount(3)
    await popup.reload()
    for (const account of accounts) await expect(card(popup, account.name)).toBeVisible()
    const restored = await popup.evaluate(async () => {
      const response = await chrome.runtime.sendMessage({ type: 'MFA_VAULT', action: 'snapshot' })
      if (!response.ok) throw new Error(response.error)
      return response.value.accounts
    })
    expect(restored).toEqual(accounts)
    if (!encrypted) {
      await openImport(popup)
      await popup.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) })
      await expect(popup.getByRole('dialog', { name: '导入账户', exact: true })).toContainText('已跳过 3 个同名账户')
      await expect(popup.getByRole('button', { name: '导入 (0)', exact: true })).toBeDisabled()
    }
  })
}

test('downloaded QR scans back to the account and language persists across reopening', async ({ popup }) => {
  await card(popup, 'Alpha').click({ button: 'right' })
  await popup.getByRole('menuitem', { name: '显示二维码', exact: true }).click()
  const qr = popup.getByRole('dialog', { name: '账户二维码', exact: true })
  const downloaded = popup.waitForEvent('download')
  await qr.getByRole('button', { name: '下载二维码', exact: true }).click()
  const download = await downloaded
  expect(download.suggestedFilename()).toMatch(/^Alpha-.*\.png$/)
  const filename = (await download.path())!
  expect((await readFile(filename)).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  await qr.getByRole('button', { name: '关闭', exact: true }).click()
  await popup.getByRole('button', { name: '添加账户', exact: true }).click()
  await popup.locator('input[type=file]').setInputFiles(filename)
  await expect(popup.locator('#name')).toHaveValue('Alpha')
  await expect(popup.locator('#secret')).toHaveValue(accounts[0].secret)
  await popup.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()

  await popup.getByRole('button', { name: '设置', exact: true }).click()
  await popup.locator('#language').selectOption('en-US')
  await expect(popup.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible()
  await popup.reload()
  await popup.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(popup.locator('#language')).toHaveValue('en-US')
  await expect(popup.getByRole('dialog', { name: 'Settings', exact: true }).getByRole('button', { name: 'Import', exact: true })).toBeVisible()
})
