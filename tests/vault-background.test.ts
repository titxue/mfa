import { test, expect } from 'bun:test'

test('background rejects untrusted senders and serves only summaries/codes to authorized pages', async () => {
  const previous = globalThis.chrome
  let handler: (message: unknown, sender: unknown, respond: (result: any) => void) => boolean
  const sync: Record<string, any> = { accounts: [{ name: 'Example', secret: 'JBSWY3DPEHPK3PXP', website: 'example.test' }] }
  const session: Record<string, any> = {}
  let origins = ['https://example.test/*']
  const area = (data: Record<string, any>) => ({
    setAccessLevel: async () => {},
    get: async (keys: string | string[]) => Object.fromEntries((typeof keys === 'string' ? [keys] : keys).filter(k => k in data).map(k => [k, data[k]])),
    set: async (values: Record<string, any>) => { Object.assign(data, values) },
    remove: async (keys: string | string[]) => { for (const k of typeof keys === 'string' ? [keys] : keys) delete data[k] },
    getBytesInUse: async () => 0,
  })
  globalThis.chrome = {
    runtime: { id: 'test', getURL: (path: string) => `chrome-extension://test/${path}`,
      onMessage: { addListener: (fn: typeof handler) => { handler = fn } }, sendMessage: async () => {} },
    permissions: { getAll: async () => ({ origins }) },
    tabs: { query: async () => [], sendMessage: async () => {} },
    storage: { sync: area(sync), local: area({}), session: area(session), onChanged: { addListener: () => {} } },
  } as unknown as typeof chrome
  try {
    await import('../src/vault-background')
    const popup = { id: 'test', url: 'chrome-extension://test/popup.html' }
    const page = { id: 'test', url: 'https://example.test/login', tab: { id: 1 } }
    const request = (action: string, sender: unknown, extra = {}) => new Promise<any>(resolve => {
      handler({ type: 'MFA_VAULT', action, ...extra }, sender, resolve)
    })
    expect(await request('snapshot', page)).toMatchObject({ ok: false, error: 'denied' })
    expect(await request('summaries', { ...page, id: 'other' })).toMatchObject({ ok: false, error: 'denied' })
    expect(await request('snapshot', { id: 'test', url: 'chrome-extension://test/other.html' })).toMatchObject({ ok: false, error: 'denied' })
    const summary = await request('summaries', page)
    expect(await request('snapshot', { ...popup, tab: { id: 2 } })).toMatchObject({ ok: true })
    expect(summary.ok).toBe(true)
    expect(summary.value.accounts).toEqual([{ name: 'Example', website: 'example.test' }])
    expect(JSON.stringify(summary)).not.toContain('JBSWY3DPEHPK3PXP')
    const code = await request('code', page, { revision: summary.value.revision, name: 'Example' })
    expect(code.value).toMatch(/^\d{6}$/)
    origins = []
    expect(await request('code', page, { revision: summary.value.revision, name: 'Example' })).toMatchObject({ ok: false, error: 'denied' })
    origins = ['https://example.test/*']
    expect(await request('enable', popup, { revision: summary.value.revision, nextPassword: 'test-password' })).toMatchObject({ ok: true })
    expect(await request('lock', popup)).toMatchObject({ ok: true })
    expect((await request('summaries', page)).value).toMatchObject({ locked: true, accounts: [] })
    expect(await request('code', page, { revision: summary.value.revision, name: 'Example' })).toMatchObject({ ok: false, error: 'locked' })
    expect(await request('unlock', page, { password: 'test-password' })).toMatchObject({ ok: false, error: 'denied' })
  } finally { globalThis.chrome = previous }
})
