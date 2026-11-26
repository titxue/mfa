import { test, expect } from '@playwright/test'

// The original DOM harness checks Chinese labels and uses synthetic Chrome APIs.
test.use({ locale: 'zh-CN' })

test('existing browser DOM regressions all pass', async ({ page }) => {
  await page.goto('http://127.0.0.1:4179')
  await expect(page).toHaveTitle(/^(PASS|FAIL) MFA regression$/)
  const results = await page.evaluate(() => (window as Window & { regressionResults: string[] }).regressionResults)
  expect(results).toHaveLength(8)
  expect(results.filter(result => !result.startsWith('PASS '))).toEqual([])
  await expect(page).toHaveTitle('PASS MFA regression')
})
