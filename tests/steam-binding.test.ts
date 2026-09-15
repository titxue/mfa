import { describe, expect, test } from 'bun:test'
import { generateKeyPairSync, privateDecrypt, constants } from 'node:crypto'
import { SteamAuthApi, encryptSteamPassword } from '../src/steam-link/auth'
import { SteamLinkApi, type Requester } from '../src/steam-link/core'
import { SteamBindingService, isBindingSender, type BindingSession, type BindingCheckpoint, type BindingStorage, type BindingView } from '../src/steam-link/service'
import { decryptCheckpoint } from '../src/steam-link/checkpoint'
import { ImportExportManager } from '../src/utils/import-export'

const pair = generateKeyPairSync('rsa', { modulusLength: 1024 })
const jwk = pair.publicKey.export({ format: 'jwk' })
const modulus = Buffer.from(jwk.n!, 'base64url').toString('hex'), exponent = Buffer.from(jwk.e!, 'base64url').toString('hex')
const shared = 'AAECAwQFBgcICQoLDA0ODxAREhM=', filePassword = 'binding-test-password'

class Store implements BindingStorage {
  session: BindingSession = {}; checkpoint?: BindingCheckpoint; failPending = false
  async readSession() { return structuredClone(this.session) }
  async writeSession(value: BindingSession) { this.session = structuredClone(value) }
  async readCheckpoint() { return structuredClone(this.checkpoint) }
  async writeCheckpoint(value: BindingCheckpoint) {
    if (this.failPending && value.phase === 'pending') throw new Error('storageError')
    this.checkpoint = structuredClone(value)
  }
  async removeCheckpoint() { this.checkpoint = undefined }
}
function setup() {
  const store = new Store(), saved: unknown[] = [], calls: { method: string; data: Record<string, any> }[] = []
  const remote = { confirmed: false, state: 0, gid: 'gid-1', failAdd: false, access: true, malformedAuth: false }
  const request: Requester = async (address, options) => {
    const url = new URL(address), method = url.pathname.split('/').at(-3)!
    const data = JSON.parse(new URLSearchParams(options.body as URLSearchParams ?? url.searchParams).get('input_json')!)
    calls.push({ method, data })
    expect(options.credentials).toBe('omit'); expect(options.redirect).toBe('error')
    let response: unknown
    switch (method) {
      case 'GetPasswordRSAPublicKey': response = { publickey_mod: modulus, publickey_exp: exponent, timestamp: '1234' }; break
      case 'BeginAuthSessionViaCredentials': response = { steamid: '76561198000000000', client_id: 'client-1', request_id: 'YWJj', interval: 1, allowed_confirmations: remote.malformedAuth ? [null] : [{ confirmation_type: 2 }] }; break
      case 'UpdateAuthSessionWithSteamGuardCode': remote.confirmed = true; response = {}; break
      case 'PollAuthSessionStatus': response = remote.confirmed ? { account_name: 'demo', refresh_token: 'private-refresh', ...(remote.access ? { access_token: 'private-access' } : {}) } : { new_client_id: 'client-2' }; break
      case 'GenerateAccessTokenForApp': response = { access_token: 'private-access' }; break
      case 'QueryStatus': response = { state: remote.state, token_gid: remote.gid }; break
      case 'QueryTime': response = { server_time: '1700000000' }; break
      case 'AddAuthenticator':
        if (remote.failAdd) throw Error('network')
        response = { account_name: 'demo', shared_secret: shared, revocation_code: 'RDEMO1', token_gid: remote.gid, status: 1 }; break
      default: throw Error('Unexpected method')
    }
    return new Response(JSON.stringify({ response }), { headers: { 'x-eresult': '1' } })
  }
  const auth = new SteamAuthApi(request), api = new SteamLinkApi(request)
  const service = new SteamBindingService(store, auth, api, async account => { saved.push(account) })
  const signIn = async () => {
    await service.run('login', { accountName: 'demo', password: 'private-password' })
    await service.run('guard', { code: 'ABCDE', codeType: 2 })
  }
  return { store, service, saved, calls, remote, auth, api, signIn }
}

describe('browser Steam authentication', () => {
  test('unexpected login parsing errors are distinguished from storage failures', async () => {
    const { auth, remote } = setup()
    remote.malformedAuth = true
    await expect(auth.begin('demo', 'private-password')).rejects.toThrow('authProcessing')
  })
  test('RSA uses randomized PKCS1 v1.5 padding and preserves UTF-8 passwords', () => {
    const password = 'test-中文-🔒'
    const a = encryptSteamPassword(password, modulus, exponent), b = encryptSteamPassword(password, modulus, exponent)
    expect(a).not.toBe(b)
    const decoded = privateDecrypt({ key: pair.privateKey, padding: constants.RSA_NO_PADDING }, Buffer.from(a, 'base64'))
    expect([...decoded.subarray(0, 2)]).toEqual([0, 2])
    const zero = decoded.indexOf(0, 2)
    expect(zero).toBeGreaterThanOrEqual(10)
    expect(decoded.subarray(zero + 1).toString('utf8')).toBe(password)
    expect(() => encryptSteamPassword('x'.repeat(200), modulus, exponent)).toThrow('passwordFormat')
    expect(() => encryptSteamPassword('password', 'bad', '010001')).toThrow('protocol')
  })
  test('credentials stay out of stored state and login requests use MobileApp fields', async () => {
    const { service, store, calls, signIn } = setup()
    await signIn()
    expect((await service.view()).phase).toBe('authenticated')
    expect(JSON.stringify(store)).not.toContain('private-password')
    const sent = calls.find(call => call.method === 'BeginAuthSessionViaCredentials')!.data
    expect(sent).toMatchObject({ website_id: 'Mobile', device_details: { device_friendly_name: 'MFA Steam linking', platform_type: 3, os_type: -500, gaming_device_type: 528 }, persistence: 1, remember_login: true })
    expect(sent.device_details.friendly_name).toBeUndefined()
    expect(sent.encrypted_password).not.toBe('private-password')
    const view = JSON.stringify(await service.view())
    expect(view).not.toContain('private-access'); expect(view).not.toContain('private-refresh')
  })
  test('polling honors interval, changed client ID, and access-token refresh', async () => {
    const { auth, remote, calls } = setup()
    let s = await auth.begin('demo', 'password')
    s = (await auth.poll(s)).session
    expect(s.clientId).toBe('client-2')
    const before = calls.length
    await auth.poll(s); expect(calls).toHaveLength(before)
    remote.confirmed = true; remote.access = false
    const result = await auth.poll({ ...s, nextPoll: 0 })
    expect(result.identity?.accessToken).toBe('private-access')
    expect(calls.findLast(call => call.method === 'PollAuthSessionStatus')?.data.client_id).toBe('client-2')
    expect(calls.at(-1)?.method).toBe('GenerateAccessTokenForApp')
    await expect(auth.poll({ ...s, expiresAt: 0 })).rejects.toThrow('loginTimeout')
  })
})

describe('extension binding lifecycle', () => {
  test('login, initialize, phone verification and direct vault handoff', async () => {
    const { service, store, signIn, remote, saved, calls } = setup()
    await signIn(); expect((await service.run('check') as BindingView).phase).toBe('ready')
    expect((await service.run('initialize', { password: filePassword, confirmed: true }) as BindingView).phase).toBe('pending')
    const persisted = JSON.stringify(store.checkpoint)
    expect(persisted).not.toContain(shared); expect(persisted).not.toContain('private-access'); expect(persisted).not.toContain(filePassword)
    remote.state = 1
    expect((await service.run('verify', { code: '7MQGM' }) as BindingView).phase).toBe('verified')
    expect((await service.run('save', { name: 'My Steam' }) as BindingView).phase).toBe('saved')
    expect(saved).toEqual([{ name: 'My Steam', type: 'steam', website: 'steamcommunity.com', secret: 'AAAQEAYEAUDAOCAJBIFQYDIOB4IBCEQT' }])
    expect(store.session.identity).toBeUndefined()
    const backup = await service.run('download') as { data: string }
    const imported = await ImportExportManager.importAccounts(new File([backup.data], 'backup.json'), [], filePassword)
    expect(imported.newAccounts).toEqual(saved)
    expect(calls.filter(c => c.method === 'AddAuthenticator')).toHaveLength(1)
  })
  test('existing authenticator cannot be overwritten; owner can recheck after preparing account', async () => {
    const { service, signIn, remote, calls } = setup()
    await signIn(); remote.state = 1
    expect((await service.run('check') as BindingView).phase).toBe('existing')
    await expect(service.run('initialize', { password: filePassword, confirmed: true })).rejects.toThrow('existing')
    expect(calls.some(c => c.method === 'AddAuthenticator')).toBe(false)
    remote.state = 0
    expect((await service.run('check') as BindingView).phase).toBe('ready')
  })
  test('another binding tab cannot replace an authenticated account without logout', async () => {
    const { service, signIn, calls } = setup()
    await signIn()
    const before = calls.length
    await expect(service.run('login', { accountName: 'another', password: 'password' })).rejects.toThrow('busy')
    expect(calls).toHaveLength(before)
    expect((await service.view()).accountName).toBe('demo')
  })
  test('service-worker restart restores session; browser restart requires login and backup password', async () => {
    const { service, signIn, store, auth, api } = setup()
    await signIn(); await service.run('initialize', { password: filePassword, confirmed: true })
    const restarted = new SteamBindingService(store, auth, api)
    expect((await restarted.view()).phase).toBe('pending')
    store.session = {}
    expect((await restarted.view()).phase).toBe('login')
    await signIn()
    expect((await service.view()).phase).toBe('resume')
    await expect(service.run('unlock', { password: 'wrong' })).rejects.toThrow('checkpointPassword')
    expect((await service.run('unlock', { password: filePassword }) as BindingView).phase).toBe('pending')
  })
  test('uncertain initialization is never automatically repeated', async () => {
    const { service, signIn, remote, calls, store } = setup()
    await signIn(); remote.failAdd = true
    await expect(service.run('initialize', { password: filePassword, confirmed: true })).rejects.toThrow('network')
    expect(store.checkpoint?.phase).toBe('requesting')
    expect((await service.view()).phase).toBe('uncertain')
    await expect(service.run('initialize', { password: filePassword, confirmed: true })).rejects.toThrow('checkpointExists')
    expect(calls.filter(c => c.method === 'AddAuthenticator')).toHaveLength(1)
  })
  test('failed local persistence preserves encrypted emergency recovery without another initialization', async () => {
    const { service, signIn, store, calls } = setup()
    await signIn(); store.failPending = true
    await expect(service.run('initialize', { password: filePassword, confirmed: true })).rejects.toThrow('storageError')
    expect((await service.view()).phase).toBe('recovery')
    const backup = await service.run('download') as { data: string }
    expect((await decryptCheckpoint(backup.data, filePassword)).sharedSecret).toBe(shared)
    store.failPending = false
    expect((await service.run('check') as BindingView).phase).toBe('pending')
    expect(calls.filter(c => c.method === 'AddAuthenticator')).toHaveLength(1)
  })
  test('unverified, changed-token or duplicate-name failures never lose pending state', async () => {
    const { service, signIn, store, remote, auth, api } = setup()
    await signIn(); await service.run('initialize', { password: filePassword, confirmed: true })
    await expect(service.run('save')).rejects.toThrow('notVerified')
    remote.state = 1; remote.gid = 'different'
    await expect(service.run('verify', { code: '7MQGM' })).rejects.toThrow('tokenChanged')
    remote.gid = 'gid-1'; await service.run('verify', { code: '7MQGM' })
    const conflict = new SteamBindingService(store, auth, api, async () => { throw Error('duplicate') })
    await expect(conflict.run('save')).rejects.toThrow('duplicate')
    expect((await conflict.view()).phase).toBe('verified')
  })
  test('only the exact trusted binding page is authorized', () => {
    const url = 'chrome-extension://id/steam-link.html'
    expect(isBindingSender({ id: 'id', url }, 'id', url)).toBe(true)
    for (const sender of [{ id: 'id', url: 'https://example.test/' }, { id: 'other', url }, { id: 'id', url: 'chrome-extension://id/popup.html' }, { id: 'id', url: url + '?untrusted' }]) {
      expect(isBindingSender(sender, 'id', url)).toBe(false)
    }
  })
})
