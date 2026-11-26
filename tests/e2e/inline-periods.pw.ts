import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

test('mixed inline periods refresh only their own boundaries and dispose the timer', async ({ page }, testInfo) => {
  const bundle = testInfo.outputPath('inline-menu.js')
  execFileSync('bun', ['build', resolve('src/content-script-menu.ts'), '--target=browser', '--outfile', bundle])
  await page.clock.install({ time: 0 })
  await page.setContent('<input autocomplete="one-time-code">')
  await page.evaluate(async source => {
    const ui = await import(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })))
    const roots: ShadowRoot[] = []
    const attach = Element.prototype.attachShadow
    Element.prototype.attachShadow = function (options) { const root = attach.call(this, options); roots.push(root); return root }
    const calls: Record<string, number> = {}
    const accounts = [15, 30, 45, 60].map(period => ({ name: `period-${period}`, period }))
    ui.showInlineUI(document.querySelector('input')!, {
      accounts, strings: { fill: 'Fill', noAccounts: 'Empty' },
      getCode: async (account: { name: string; period: number }) => {
        calls[account.name] = (calls[account.name] ?? 0) + 1
        return String(account.period * 100 + Math.floor(Date.now() / (account.period * 1000))).padStart(6, '0')
      }, onFill() {},
    })
    ;(window as any).periodTest = { calls, roots, hide: ui.hideInlineUI }
    roots[0].querySelector<HTMLButtonElement>('button')!.click()
  }, await readFile(bundle, 'utf8'))
  const counts = () => page.evaluate(() => (window as any).periodTest.calls)
  await expect.poll(counts).toEqual({ 'period-15': 1, 'period-30': 1, 'period-45': 1, 'period-60': 1 })
  for (const expected of [[2, 1, 1, 1], [3, 2, 1, 1], [4, 2, 2, 1], [5, 3, 2, 2]]) {
    await page.clock.runFor(15000)
    await expect.poll(counts).toEqual(Object.fromEntries([15, 30, 45, 60].map((period, i) => [`period-${period}`, expected[i]])))
  }
  const text = await page.evaluate(() => (window as any).periodTest.roots[1].textContent)
  for (const code of ['001 504', '003 002', '004 501', '006 001']) expect(text).toContain(code)
  await page.evaluate(() => (window as any).periodTest.hide())
  await page.clock.runFor(60000)
  expect(await counts()).toEqual({ 'period-15': 5, 'period-30': 3, 'period-45': 2, 'period-60': 2 })
})
