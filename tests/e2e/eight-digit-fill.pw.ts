import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

for (const layout of ['single', 'eight segments', 'six segments'] as const) {
  test(`eight-digit PageAnalyzer fill preserves leading zeros and input events: ${layout}`, async ({ page }, testInfo) => {
    const output = testInfo.outputPath('fill-modules')
    execFileSync('bun', ['build', resolve('src/utils/page-analyzer.ts'), resolve('src/utils/otp-field.ts'), '--target=browser', '--outdir', output])
    const [analyzerSource, fieldSource] = await Promise.all([
      readFile(join(output, 'page-analyzer.js'), 'utf8'), readFile(join(output, 'otp-field.js'), 'utf8'),
    ])
    const count = layout === 'eight segments' ? 8 : 6
    await page.setContent(layout === 'single'
      ? '<label for="otp">Verification code</label><input id="otp" autocomplete="one-time-code" maxlength="8" value="old">'
      : `<fieldset><legend>Verification code</legend>${Array.from({ length: count }, () => '<input maxlength="1" inputmode="numeric" value="9">').join('')}</fieldset>`)
    const actual = await page.evaluate(async ({ analyzerSource, fieldSource }) => {
      const load = async (source: string) => {
        const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
        try { return await import(url) } finally { URL.revokeObjectURL(url) }
      }
      const engine = await load(fieldSource)
      const events: { type: string; index: number; value: string; bubbles: boolean }[] = []
      const fields = [...document.querySelectorAll('input')]
      for (const type of ['input', 'change']) {
        document.addEventListener(type, event => {
          const input = event.target as HTMLInputElement
          events.push({ type, index: fields.indexOf(input), value: input.value, bubbles: event.bubbles })
        })
      }
      // Keep the actual popup entry point and DOM engine; only bridge Chrome's tab messages.
      Object.defineProperty(window, 'chrome', { configurable: true, value: {
        tabs: {
          query: async () => [{ id: 77 }],
          sendMessage: async (_id: number, message: { type: string; code: string }) => {
            if (message.type !== 'FILL_CODE') throw new Error('Unexpected message')
            return engine.fillCode(message.code)
          },
        },
        storage: { sync: { get: async () => ({ autofillSettings: { autofillInlineMenu: true, clipboardFallback: false } }) } },
      } })
      const analyzer = await load(analyzerSource)
      const result = await analyzer.fillCodeInActiveTab('00123456')
      return { result, values: fields.map(field => field.value), events,
        marked: fields.map(field => field.dataset.mfaFilled ?? null) }
    }, { analyzerSource, fieldSource })
    if (layout === 'six segments') {
      expect(actual.result).toEqual({ status: 'no-field' })
      expect(actual.values).toEqual(Array(6).fill('9'))
      expect(actual.events).toEqual([])
      expect(actual.marked).toEqual(Array(6).fill(null))
    } else {
      const values = layout === 'single' ? ['00123456'] : [...'00123456']
      expect(actual.result).toEqual({ status: 'filled', mode: layout === 'single' ? 'single' : 'segmented' })
      expect(actual.values).toEqual(values)
      expect(actual.marked).toEqual(values.map(() => 'true'))
      expect(actual.events).toEqual(values.flatMap((value, index) => [
        { type: 'input', index, value, bubbles: true }, { type: 'change', index, value, bubbles: true },
      ]))
    }
  })
}
