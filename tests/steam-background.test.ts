import { expect, test, spyOn } from 'bun:test'
import { SteamLinkApi, LinkError } from '../src/steam-link/core'
import { SteamAuthApi } from '../src/steam-link/auth'
import { SteamBindingService } from '../src/steam-link/service'
import { bindingError } from '../src/steam-link/strings'

test('HTTP 429 retains rate-limit meaning through APIs, background and UI', async () => {
  const request = async () => new Response('', { status: 429 })
  await expect(new SteamLinkApi(request).time()).rejects.toMatchObject({ code: 'rateLimit', result: 429 })
  await expect(new SteamAuthApi(request).call('GetPasswordRSAPublicKey', { account_name: 'test' }, true)).rejects.toMatchObject({ code: 'rateLimit', result: 429 })
  const previous = globalThis.chrome
  let handler: (message: unknown, sender: unknown, respond: (value: any) => void) => boolean
  const sync: Record<string, unknown> = { accountVault: { version: 1, revision: 'test', mode: 'plain', accounts: [] } }
  const area = (data: Record<string, unknown> = {}) => ({
    setAccessLevel: async () => {},
    get: async (keys: string | string[]) => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(k => k in data).map(k => [k, data[k]])),
    set: async (value: Record<string, unknown>) => { Object.assign(data, value) },
    remove: async () => {},
  })
  const run = spyOn(SteamBindingService.prototype, 'run').mockRejectedValue(new LinkError('rateLimit', 429))
  globalThis.chrome = {
    runtime: { id: 'test', getURL: (path: string) => `chrome-extension://test/${path}`,
      onMessage: { addListener: (fn: typeof handler) => { handler = fn } } },
    permissions: { contains: async () => true },
    storage: { sync: area(sync), local: area(), session: area(), onChanged: { addListener: () => {} } },
  } as unknown as typeof chrome
  try {
    await import('../src/steam-link/background')
    const response = await new Promise<any>(resolve => handler({ type: 'MFA_STEAM_BINDING', action: 'check' },
      { id: 'test', url: 'chrome-extension://test/steam-link.html' }, resolve))
    expect(response).toMatchObject({ ok: false, error: 'rateLimit', result: 429 })
    expect(bindingError('zh-CN', response.error)).toContain('稍后重试')
    expect(bindingError('en-US', response.error)).toContain('Wait')
  } finally { run.mockRestore(); globalThis.chrome = previous }
})
