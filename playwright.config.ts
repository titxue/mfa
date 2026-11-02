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
  webServer: {
    command: 'bun tests/browser/serve.ts',
    url: 'http://127.0.0.1:4179',
    timeout: 30_000,
    reuseExistingServer: false,
  },
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
})
