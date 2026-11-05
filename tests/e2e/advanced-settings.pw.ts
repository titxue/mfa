import { test, expect, accounts } from './extension'
import type { Page } from '@playwright/test'

async function footerVisible(page: Page) {
  const dialog = page.getByRole('dialog')
  for (const name of ['保存', '取消']) {
    const box = await dialog.getByRole('button', { name, exact: true }).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y + box!.height).toBeLessThanOrEqual(600)
  }
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

for (const theme of ['light', 'dark']) {
  test(`${theme} basic form stays compact and supports keyboard disclosure and ordinary save`, async ({ popup, worker }) => {
    await worker.evaluate(theme => chrome.storage.local.set({ theme }), theme)
    await popup.reload()
    if (theme === 'dark') await expect(popup.locator('html')).toHaveClass(/dark/)
    else await expect(popup.locator('html')).not.toHaveClass(/dark/)
    await popup.getByRole('button', { name: '添加账户', exact: true }).click()
    const toggle = popup.locator('#account-advanced-toggle')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(popup.locator('#account-advanced-settings')).toBeHidden()
    await footerVisible(popup)
    await toggle.focus(); await popup.keyboard.press('Enter')
    await expect(toggle).toBeFocused()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(popup.locator('#account-advanced-settings')).toBeVisible()
    await footerVisible(popup)
    await toggle.focus(); await popup.keyboard.press('Space')
    await expect(toggle).toBeFocused()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await popup.locator('#name').fill(`Basic ${theme}`)
    await popup.locator('#secret').fill(accounts[0].secret)
    await popup.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click()
    await expect(popup.locator(`.sortable-account[aria-label="Basic ${theme}"]`)).toBeVisible()
    await popup.getByRole('button', { name: '添加账户', exact: true }).click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await footerVisible(popup)
  })
}

test('collapsed imported and edited custom settings preserve metadata, including after changing then collapsing', async ({ popup }) => {
  await popup.getByRole('button', { name: '添加账户', exact: true }).click()
  const dialog = popup.getByRole('dialog')
  await dialog.evaluate((element, uri) => {
    const transfer = new DataTransfer(); transfer.setData('text/plain', uri)
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer }))
  }, `otpauth://totp/AdvancedCustom?secret=${accounts[0].secret}&algorithm=SHA512&digits=8&period=45`)
  await expect(popup.locator('#name')).toHaveValue('AdvancedCustom')
  await expect(popup.locator('#account-advanced-toggle')).toHaveAttribute('aria-expanded', 'false')
  await expect(dialog.getByText('已自定义', { exact: true })).toBeVisible()
  await footerVisible(popup)
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  const snapshot = () => popup.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'MFA_VAULT', action: 'snapshot' })).value.accounts)
  const original = { name: 'AdvancedCustom', secret: accounts[0].secret, algorithm: 'SHA512', digits: 8, period: 45 }
  await expect.poll(snapshot).toContainEqual(original)
  const edit = async (name: string) => {
    await popup.locator(`.sortable-account[aria-label="${name}"]`).click({ button: 'right', position: { x: 12, y: 12 } })
    await popup.getByRole('menuitem', { name: '编辑', exact: true }).click()
    await expect(popup.locator('#account-advanced-toggle')).toHaveAttribute('aria-expanded', 'false')
    await expect(popup.locator('#account-advanced-settings')).toBeHidden()
  }
  await edit('AdvancedCustom')
  await popup.locator('#name').fill('RenamedCustom')
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(snapshot).toContainEqual({ ...original, name: 'RenamedCustom' })
  await edit('RenamedCustom')
  await popup.locator('#account-advanced-toggle').click()
  await expect(popup.locator('#algorithm')).toHaveValue('SHA512')
  await expect(popup.locator('#digits')).toHaveValue('8')
  await expect(popup.locator('#period')).toHaveValue('45')
  await popup.locator('#website').fill('example.test')
  await popup.locator('#algorithm').selectOption('SHA256')
  await popup.locator('#period').selectOption('60')
  await popup.locator('#account-advanced-toggle').click()
  await footerVisible(popup)
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(snapshot).toContainEqual({ ...original, name: 'RenamedCustom', algorithm: 'SHA256', period: 60, website: 'example.test' })
  await popup.reload()
  await edit('RenamedCustom')
  await expect(dialog.getByText('已自定义', { exact: true })).toBeVisible()
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`disclosure motion respects ${reducedMotion} and rapid toggles remain usable`, async ({ popup }) => {
    await popup.emulateMedia({ reducedMotion })
    await popup.getByRole('button', { name: '添加账户', exact: true }).click()
    const toggle = popup.locator('#account-advanced-toggle')
    await toggle.click()
    await expect(popup.locator('#algorithm')).toBeVisible()
    if (reducedMotion === 'reduce') {
      expect(await popup.locator('#account-advanced-settings').evaluate(el => el.getAnimations().length)).toBe(0)
    }
    await toggle.evaluate(el => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(popup.locator('#account-advanced-settings')).toBeHidden()
    await toggle.click()
    await popup.locator('#account-advanced-settings').evaluate(async el => {
      await Promise.allSettled(el.getAnimations().map(animation => animation.finished))
    })
    await expect(popup.locator('#account-advanced-settings')).toHaveCSS('opacity', '1')
    await popup.locator('#period').selectOption('45')
    await expect(popup.locator('#period')).toHaveValue('45')
    await footerVisible(popup)
    await toggle.focus()
    await popup.keyboard.press('Space')
    await popup.keyboard.press('Enter')
    await expect(toggle).toBeFocused()
    expect(await popup.locator('#account-advanced-settings').evaluate(el => el.getAnimations().length)).toBe(0)
  })
}
