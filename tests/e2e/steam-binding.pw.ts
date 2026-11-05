import { generateKeyPairSync } from 'node:crypto'
import { test, expect } from './extension'

const pair = generateKeyPairSync('rsa', { modulusLength: 1024 })
const jwk = pair.publicKey.export({ format: 'jwk' })
const rsa = { modulus: Buffer.from(jwk.n!, 'base64url').toString('hex'), exponent: Buffer.from(jwk.e!, 'base64url').toString('hex') }

// Exercise real extension pages, background, encryption and vault; only Steam's API and
// its permission prompt are simulated. No request reaches a real Steam account.
test('settings opens the restored Steam binding flow and completes enrollment', async ({ popup, worker, context }) => {
  await worker.evaluate(({ modulus, exponent }) => {
    const remote = { confirmed: false, state: 0, calls: [] as string[] }
    ;(globalThis as any).steamTest = remote
    const contains = chrome.permissions.contains.bind(chrome.permissions)
    chrome.permissions.contains = async permissions => permissions.origins?.includes('https://api.steampowered.com/*') ? true : contains(permissions)
    globalThis.fetch = async (address, options) => {
      const method = new URL(String(address)).pathname.split('/').at(-3)!
      remote.calls.push(method)
      let response: unknown
      switch (method) {
        case 'GetPasswordRSAPublicKey': response = { publickey_mod: modulus, publickey_exp: exponent, timestamp: '1234' }; break
        case 'BeginAuthSessionViaCredentials': response = { steamid: '76561198000000000', client_id: 'client-1', request_id: 'YWJj', interval: 1, allowed_confirmations: [{ confirmation_type: 2 }] }; break
        case 'UpdateAuthSessionWithSteamGuardCode': remote.confirmed = true; response = {}; break
        case 'PollAuthSessionStatus': response = remote.confirmed ? { account_name: 'demo', refresh_token: 'test-refresh', access_token: 'test-access' } : {}; break
        case 'QueryStatus': response = { state: remote.state, token_gid: 'gid-1' }; break
        case 'QueryTime': response = { server_time: '1700000000' }; break
        case 'AddAuthenticator': response = { account_name: 'demo', shared_secret: 'AAECAwQFBgcICQoLDA0ODxAREhM=', revocation_code: 'RDEMO1', token_gid: 'gid-1', status: 1 }; break
        default: throw new Error(`Unexpected test request: ${method}`)
      }
      return new Response(JSON.stringify({ response }), { headers: { 'x-eresult': '1' } })
    }
  }, rsa)
  await context.addInitScript(() => {
    if (location.pathname === '/steam-link.html') chrome.permissions.request = async () => true
  })
  await popup.getByRole('button', { name: '设置', exact: true }).click()
  const opened = context.waitForEvent('page')
  await popup.getByRole('button', { name: '绑定 Steam Guard', exact: true }).click()
  const binding = await opened
  await expect(binding).toHaveURL(/\/steam-link\.html$/)
  await expect(binding.getByRole('heading', { name: '绑定 Steam Guard', exact: true })).toBeVisible()
  await binding.locator('#steam-username').fill('demo')
  await binding.locator('#steam-password').fill('test-password')
  await binding.getByRole('button', { name: '登录 Steam', exact: true }).click()
  await binding.locator('#login-code').fill('ABCDE')
  await binding.getByRole('button', { name: '继续', exact: true }).click()
  await binding.getByRole('button', { name: '重新检查令牌状态', exact: true }).click()
  await binding.locator('#backup-password').fill('test-backup-password')
  await binding.locator('#confirm-password').fill('test-backup-password')
  await binding.getByRole('checkbox').check()
  await binding.getByRole('button', { name: '初始化并保存密钥', exact: true }).click()
  await expect(binding.locator('#phone-code')).toBeVisible()
  const checkpoint = await worker.evaluate(async () => (await chrome.storage.local.get('steamBindingCheckpoint')).steamBindingCheckpoint)
  expect(checkpoint.phase).toBe('pending')
  expect(JSON.stringify(checkpoint)).not.toContain('AAECAwQFBgcICQoLDA0ODxAREhM=')
  await worker.evaluate(() => { (globalThis as any).steamTest.state = 1 })
  await binding.locator('#phone-code').fill('7MQGM')
  await binding.getByRole('button', { name: '核对手机验证码', exact: true }).click()
  await expect(binding.locator('#account-name')).toHaveValue('Steam demo')
  await binding.getByRole('button', { name: '添加账户', exact: true }).click()
  await expect.poll(() => worker.evaluate(async () => {
    const vault = (await chrome.storage.sync.get((globalThis as any).testVaultKey))[(globalThis as any).testVaultKey].record
    return vault.accounts.find((a: { name: string }) => a.name === 'Steam demo')
  })).toEqual({ name: 'Steam demo', type: 'steam', website: 'steamcommunity.com', secret: 'AAAQEAYEAUDAOCAJBIFQYDIOB4IBCEQT' })
  expect(await worker.evaluate(() => (globalThis as any).steamTest.calls.filter((method: string) => method === 'AddAuthenticator').length)).toBe(1)
  await popup.reload()
  await expect(popup.locator('.sortable-account[aria-label="Steam demo"] .font-mono')).toHaveText(/^[23456789BCDFGHJKMNPQRTVWXY]{5}$/)
})
