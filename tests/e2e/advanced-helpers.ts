import type { Locator, Page } from '@playwright/test'

export async function openAccountAdvanced(scope: Locator | Page) {
  const toggle = scope.locator('#account-advanced-toggle')
  if (await toggle.getAttribute('aria-expanded') !== 'true') {
    await toggle.click()
  }
}
