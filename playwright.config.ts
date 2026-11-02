import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.pw.ts',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: './output/playwright/results',
  reporter: 'list',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
})
