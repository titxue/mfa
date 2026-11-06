import { test, expect } from './extension'
import { readFile } from 'node:fs/promises'
import { V2_KEY } from '../../src/utils/vault-sync'

test('automatic recovery loading and protocol failure never claim corrupt accounts; retry returns to accounts', async ({ context, popupUrl, worker }, testInfo) => {
  const before = await worker.evaluate(() => chrome.storage.sync.get(null))
  await context.addInitScript(() => {
    const original = chrome.runtime.sendMessage.bind(chrome.runtime)
    let failing = true
    const requests: ((value: unknown) => void)[] = []
    ;(window as any).failRecovery = () => {
      failing = false
      requests.forEach(resolve => resolve({ ok: false, error: 'invalid' }))
    }
    ;(chrome.runtime as any).sendMessage = (message: any, ...args: any[]) => {
      if (message.action === 'snapshot' && failing) {
        return original(message).then(response => ({
          ...response, value: { ...response.value, syncState: 'pending' },
        }))
      }
      if (message.action === 'recoveries' && failing) {
        return new Promise(resolve => requests.push(resolve))
      }
      return (original as any)(message, ...args)
    }
  })
  const popup = await context.newPage()
  await popup.goto(popupUrl)
  await expect(popup.getByRole('heading', { name: '正在检查账户状态' })).toBeVisible()
  await expect(popup.getByRole('heading', { name: '等待同步' })).toHaveCount(0)
  await expect(popup.locator('#recovery-candidate')).toHaveCount(0)
  await popup.evaluate(() => (window as any).failRecovery())
  await expect(popup.getByRole('heading', { name: '暂时无法读取恢复信息' })).toBeVisible()
  await expect(popup.getByText('账户数据格式不支持或已损坏，原数据已保留。', { exact: true })).toHaveCount(0)
  await expect(popup.getByRole('heading', { name: '等待同步' })).toHaveCount(0)
  await expect(popup.getByRole('button', { name: '使用此版本', exact: true })).toHaveCount(0)
  await expect(popup.getByRole('button', { name: '导出所有版本', exact: true })).toBeHidden()
  await popup.screenshot({ path: testInfo.outputPath('recovery-read-error.png') })
  await popup.locator('summary').click()
  const download = popup.waitForEvent('download')
  await popup.getByRole('button', { name: '导出所有版本', exact: true }).click()
  const backup = JSON.parse(await readFile((await (await download).path())!, 'utf8'))
  expect(backup.format).toBe('mfa-recovery')
  expect(backup.synchronized[V2_KEY]).toEqual(before[V2_KEY])
  await popup.getByRole('button', { name: '重试', exact: true }).click()
  await expect(popup.locator('.sortable-account')).toHaveCount(3)
  await expect(popup.getByRole('heading', { name: '暂时无法读取恢复信息' })).toHaveCount(0)
  expect(await worker.evaluate(() => chrome.storage.sync.get(null))).toEqual(before)
})

test('normal empty settings retain import and export without recovery controls', async ({ worker, context, popupUrl }) => {
  await worker.evaluate(async () => {
    await chrome.storage.sync.clear(); await chrome.storage.local.clear(); await chrome.storage.session.clear()
    await chrome.storage.sync.set({ language: 'zh-CN' })
  })
  const page = await context.newPage()
  await page.goto(popupUrl)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  const settings = page.getByRole('dialog', { name: '设置', exact: true })
  await expect(settings.getByRole('button', { name: '导入', exact: true })).toBeVisible()
  await expect(settings.getByRole('button', { name: '导出', exact: true })).toBeVisible()
  await expect(settings.locator('#settings-advanced-toggle')).toHaveCount(0)
  await expect(settings.getByRole('button', { name: '恢复与历史备份', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '恢复与历史备份', exact: true })).toHaveCount(0)
  await expect(page.locator('#recovery-candidate')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '使用此版本', exact: true })).toHaveCount(0)
  expect(await worker.evaluate(() => chrome.storage.sync.get(null))).toEqual({ language: 'zh-CN' })
})
