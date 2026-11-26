import { openAccountAdvanced } from './advanced-helpers'
import { test, expect, accounts } from './extension'

for (const [label, name] of [['Steam label', 'Steam:alice'], ['leading colon', ':Steam:alice']]) {
  test(`downloaded numeric QR with ${label} restores the same account without a JSON backup`, async ({ popup }) => {
    const card = popup.locator('.sortable-account').filter({ has: popup.getByText(name, { exact: true }) })
    const snapshot = () => popup.evaluate(async () => {
      const result = await chrome.runtime.sendMessage({ type: 'MFA_VAULT', action: 'snapshot' })
      if (!result.ok) throw new Error(result.error)
      return result.value.accounts
    })
    await popup.getByRole('button', { name: '添加账户', exact: true }).click()
    await popup.locator('#name').fill(name)
    await popup.locator('#secret').fill(accounts[0].secret)
    await popup.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click()
    await expect(card).toBeVisible()
    await popup.reload()
    await expect(card).toBeVisible()
    const original = await snapshot()

    await card.locator('.account-card').click({ button: 'right', position: { x: 12, y: 12 } })
    await popup.getByRole('menuitem', { name: '显示二维码', exact: true }).click()
    const qr = popup.getByRole('dialog', { name: '账户二维码', exact: true })
    const downloaded = popup.waitForEvent('download')
    await qr.getByRole('button', { name: '下载二维码', exact: true }).click()
    const filename = (await (await downloaded).path())!
    await qr.getByRole('button', { name: '关闭', exact: true }).click()

    await card.locator('.account-card').click({ button: 'right', position: { x: 12, y: 12 } })
    await popup.getByRole('menuitem', { name: '删除', exact: true }).click()
    await popup.getByRole('alertdialog').getByRole('button', { name: '删除', exact: true }).click()
    await expect(card).toHaveCount(0)
    await popup.getByRole('button', { name: '添加账户', exact: true }).click()
    await popup.locator('input[type=file]').setInputFiles(filename)
    await expect(popup.locator('#name')).toHaveValue(name)
    await expect(popup.locator('#secret')).toHaveValue(accounts[0].secret)
    await openAccountAdvanced(popup)
    await expect(popup.locator('#code-type')).toHaveValue('totp')
    await popup.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click()
    await expect(card.locator('.font-mono')).toHaveText(/^\d{3} \d{3}$/)
    await popup.reload()
    await expect(card).toBeVisible()
    expect(await snapshot()).toEqual(original)
  })
}
