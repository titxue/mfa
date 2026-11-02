import { test, expect } from './extension'

const order = (page: import('@playwright/test').Page) => page.locator('.sortable-account').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))

async function moveFirstToLast(page: import('@playwright/test').Page) {
  const cards = page.locator('.sortable-account')
  const first = await cards.first().boundingBox()
  const last = await cards.last().boundingBox()
  if (!first || !last) throw new Error('Missing sortable card geometry')
  const x = first.x + first.width - 12
  await page.mouse.move(x, first.y + first.height / 2)
  await page.mouse.down()
  await page.mouse.move(x, first.y + first.height / 2 + 8, { steps: 2 })
  await expect(page.locator('.account-drag-overlay')).toBeVisible()
  await page.mouse.move(x, last.y + last.height / 2, { steps: 5 })
  await page.mouse.up()
}

test('mouse reorders stay visible, merge delayed saves, and persist the last order', async ({ worker, popup }) => {
  await expect(popup.locator('.account-card .font-mono').first()).not.toHaveText('--- ---')
  await worker.evaluate(() => {
    const state = globalThis as typeof globalThis & { testOrders: string[][] }
    state.testOrders = []
    const set = chrome.storage.sync.set.bind(chrome.storage.sync)
    chrome.storage.sync.set = async (values: Record<string, any>) => {
      if (values.accountVault) {
        state.testOrders.push(values.accountVault.accounts.map((account: { name: string }) => account.name))
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      return set(values)
    }
  })
  await popup.evaluate(() => {
    const state = window as Window & { testBlankCodes: boolean }
    state.testBlankCodes = false
    new MutationObserver(() => {
      const codes = [...document.querySelectorAll('.account-card .font-mono')]
      if (codes.some(code => code.textContent?.replace(/\s/g, '') === '------')) state.testBlankCodes = true
    }).observe(document.getElementById('root')!, { subtree: true, childList: true, characterData: true })
  })
  await moveFirstToLast(popup)
  await expect.poll(() => order(popup)).toEqual(['Beta', 'Gamma', 'Alpha'])
  await moveFirstToLast(popup)
  await expect.poll(() => order(popup)).toEqual(['Gamma', 'Alpha', 'Beta'])
  await moveFirstToLast(popup)
  await expect.poll(() => order(popup)).toEqual(['Alpha', 'Beta', 'Gamma'])
  await expect.poll(() => worker.evaluate(() => (globalThis as any).testOrders.length)).toBe(2)
  await expect.poll(() => worker.evaluate(async () => {
    const record = (await chrome.storage.sync.get('accountVault')).accountVault
    return record.accounts.map((account: { name: string }) => account.name)
  })).toEqual(['Alpha', 'Beta', 'Gamma'])
  expect(await popup.evaluate(() => (window as any).testBlankCodes)).toBe(false)
  await popup.reload()
  await expect.poll(() => order(popup)).toEqual(['Alpha', 'Beta', 'Gamma'])
})

test('theme controls persist locally, follow OS changes, and honor an explicit override', async ({ popup, worker }) => {
  await popup.getByRole('button', { name: '设置', exact: true }).click()
  await popup.getByText('深色', { exact: true }).click()
  await expect(popup.locator('html')).toHaveClass(/dark/)
  await expect.poll(() => worker.evaluate(async () => (await chrome.storage.local.get('theme')).theme)).toBe('dark')
  expect(await worker.evaluate(async () => (await chrome.storage.sync.get('theme')).theme)).toBeUndefined()
  await popup.reload()
  await expect(popup.locator('html')).toHaveClass(/dark/)
  await popup.getByRole('button', { name: '设置', exact: true }).click()
  await expect(popup.getByRole('radio', { name: '深色', exact: true })).toBeChecked()
  await popup.getByText('跟随系统', { exact: true }).click()
  await popup.emulateMedia({ colorScheme: 'light' })
  await expect(popup.locator('html')).not.toHaveClass(/dark/)
  await popup.emulateMedia({ colorScheme: 'dark' })
  await expect(popup.locator('html')).toHaveClass(/dark/)
  await popup.getByText('浅色', { exact: true }).click()
  await expect(popup.locator('html')).not.toHaveClass(/dark/)
  await expect(popup.locator('html')).toHaveCSS('color-scheme', 'light')
})

test('QR menu opens independently without copying and double-click does not show QR', async ({ popup, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await popup.evaluate(() => navigator.clipboard.writeText('mfa-test-sentinel'))
  const card = popup.locator('.sortable-account[aria-label="Alpha"]')
  await card.click({ button: 'right' })
  await popup.getByRole('menuitem', { name: '显示二维码', exact: true }).click()
  const dialog = popup.getByRole('dialog', { name: '账户二维码' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('img', { name: 'QR Code' })).toBeVisible()
  expect(await popup.evaluate(() => navigator.clipboard.readText())).toBe('mfa-test-sentinel')
  await dialog.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(popup.locator('body')).not.toHaveCSS('pointer-events', 'none')
  await card.dblclick()
  await expect(dialog).not.toBeVisible()
})

test('click takes a fresh code even when the visible code belongs to the previous period', async ({ context, popupUrl }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const popup = await context.newPage()
  await popup.clock.install({ time: 0 })
  await popup.clock.pauseAt(59000)
  await popup.goto(popupUrl)
  const card = popup.locator('.sortable-account[aria-label="Alpha"]')
  await expect(card.locator('.font-mono')).toHaveText('287 082')
  // Change wall-clock time without advancing the scheduled UI timer.
  await popup.clock.setSystemTime(60000)
  await expect(card.locator('.font-mono')).toHaveText('287 082')
  // A paused clock also pauses animation frames; use the already-verified card geometry.
  await card.click({ force: true })
  await expect.poll(() => popup.evaluate(() => navigator.clipboard.readText())).toBe('359152')
})

test('Steam type can be selected, persisted, displayed and copied as five characters', async ({ context, worker, popupUrl }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const popup = await context.newPage()
  await popup.clock.install({ time: 0 })
  await popup.clock.pauseAt(59000)
  await popup.goto(popupUrl)
  await popup.getByRole('button', { name: '添加账户', exact: true }).click({ force: true })
  await popup.locator('#name').fill('Steam test')
  await popup.locator('#code-type').selectOption('steam')
  await popup.locator('#steam-secret-format').selectOption('base64')
  await popup.locator('#secret').fill('MTIzNDU2Nzg5MDEyMzQ1Njc4OTA=')
  await popup.getByRole('button', { name: '保存', exact: true }).click({ force: true })
  const card = popup.locator('.sortable-account[aria-label="Steam test"]')
  await expect(card.locator('.font-mono')).toHaveText('PV9M4')
  const stored = await worker.evaluate(async () => (await chrome.storage.sync.get('accountVault')).accountVault)
  expect(stored.accounts.find((a: { name: string }) => a.name === 'Steam test').type).toBe('steam')
  await worker.evaluate(() => {
    (globalThis as any).realNow = Date.now
    Date.now = () => 59000
  })
  try {
    const response = await popup.evaluate(revision => chrome.runtime.sendMessage({
      type: 'MFA_VAULT', action: 'code', revision, name: 'Steam test',
    }), stored.revision)
    expect(response).toMatchObject({ ok: true, value: 'PV9M4' })
  } finally {
    await worker.evaluate(() => { Date.now = (globalThis as any).realNow })
  }
  // Reload also clears the closing dialog animation while the test clock is paused.
  await popup.reload()
  await expect(card.locator('.font-mono')).toHaveText('PV9M4')
  await popup.clock.setSystemTime(60000)
  await card.click({ force: true })
  await expect.poll(() => popup.evaluate(() => navigator.clipboard.readText())).toBe('B26KJ')
  await popup.reload()
  await expect(card.locator('.font-mono')).toHaveText('B26KJ')
  await popup.clock.resume()
  await card.click({ button: 'right', position: { x: 12, y: 12 } })
  await popup.getByRole('menuitem', { name: '编辑', exact: true }).click()
  await expect(popup.locator('#code-type')).toHaveValue('steam')
})
