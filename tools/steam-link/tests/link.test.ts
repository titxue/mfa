import { describe, test, expect } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { SteamLinkApi, LinkError, initializeLink, waitForInitialization, verifyJointLink, exportVerified, type PendingLink } from '../core'
import { acquireLock, encryptCheckpoint, decryptCheckpoint, saveCheckpoint } from '../checkpoint'
import { ImportExportManager } from '../../../src/utils/import-export'

const login = { accountName: 'demo', steamId: '76561198000000000', accessToken: 'secret-access-token' }
const shared = 'AAECAwQFBgcICQoLDA0ODxAREhM='
const password = 'checkpoint-password'
const pending = (): PendingLink => ({
  version: 1, phase: 'pending', accountName: 'demo', steamId: login.steamId, deviceId: 'android:test',
  createdAt: '2026-09-11T00:00:00Z', sharedSecret: shared, tokenGid: 'gid-123', recoveryCode: 'RDEMO1',
})

function mockApi(options: { state?: number; tokenGid?: string; time?: number; addResult?: number; network?: boolean; malformed?: boolean } = {}) {
  const requests: { method: string; body: URLSearchParams; url: string }[] = []
  const api = new SteamLinkApi(async (url, init) => {
    const method = url.split('/').at(-3)!
    requests.push({ method, body: new URLSearchParams(init.body as URLSearchParams), url })
    expect(init.redirect).toBe('error')
    expect(init.signal).toBeDefined()
    if (options.network && method === 'AddAuthenticator') throw new Error(`private ${shared} ${login.accessToken}`)
    const response = method === 'QueryStatus' ? { state: options.state ?? 0, token_gid: options.tokenGid ?? 'gid-123' }
      : method === 'QueryTime' ? { server_time: options.time ?? 1700000000 }
      : { status: 1, account_name: 'demo', shared_secret: shared, revocation_code: 'RDEMO1', token_gid: 'gid-123',
        identity_secret: 'unused-private-identity', Session: { token: 'unused-session-token' } }
    return new Response(options.malformed ? '{}' : JSON.stringify({ response }), {
      headers: { 'x-eresult': method === 'AddAuthenticator' ? String(options.addResult ?? 1) : '1' },
    })
  })
  return { api, requests }
}

describe('joint linking and boundaries', () => {
  test('retains the same login for owner-triggered status checks, then initializes once', async () => {
    let state = 1, prompts = 0
    const methods: string[] = [], tokens: (string | null)[] = []
    const api = new SteamLinkApi(async (url, init) => {
      const method = url.split('/').at(-3)!
      methods.push(method); tokens.push(new URLSearchParams(init.body as URLSearchParams).get('access_token'))
      const response = method === 'QueryStatus' ? { state }
        : { status: 1, account_name: 'demo', shared_secret: shared, token_gid: 'gid-123', revocation_code: 'RDEMO1' }
      return new Response(JSON.stringify({ response }), { headers: { 'x-eresult': '1' } })
    })
    await waitForInitialization(api, login, async () => {
      prompts++
      expect(methods.every(method => method === 'QueryStatus')).toBe(true)
      if (prompts === 2) state = 0
      return true
    })
    expect(prompts).toBe(2)
    expect(methods).toEqual(['QueryStatus', 'QueryStatus', 'QueryStatus'])
    const records: PendingLink[] = []
    await initializeLink(api, login, async value => { records.push(structuredClone(value)) })
    expect(methods).toEqual(['QueryStatus', 'QueryStatus', 'QueryStatus', 'QueryStatus', 'AddAuthenticator'])
    expect(records.map(record => record.phase)).toEqual(['requesting', 'pending'])
    expect(tokens.every(token => token === login.accessToken)).toBe(true)
  })
  test('quitting the wait leaves the original authenticator unchanged', async () => {
    const { api, requests } = mockApi({ state: 1 })
    await expect(waitForInitialization(api, login, async () => false)).rejects.toThrow('existing')
    expect(requests.map(request => request.method)).toEqual(['QueryStatus'])
  })
  test('unbound accounts continue immediately; unknown state or expired session stops', async () => {
    let prompts = 0
    await waitForInitialization(mockApi().api, login, async () => { prompts++; return true })
    expect(prompts).toBe(0)
    await expect(waitForInitialization(mockApi({ state: 2 }).api, login, async () => true)).rejects.toThrow('protocol')
    const expired = new SteamLinkApi(async () => new Response('{}', { headers: { 'x-eresult': '15' } }))
    await expect(waitForInitialization(expired, login, async () => true)).rejects.toMatchObject({ code: 'steam', result: 15 })
  })
  test('records intent before one initialization request, then saves only needed secrets', async () => {
    const { api, requests } = mockApi()
    const records: PendingLink[] = []
    const result = await initializeLink(api, login, async value => {
      if (value.phase === 'requesting') expect(requests.map(r => r.method)).toEqual(['QueryStatus'])
      records.push(structuredClone(value))
    })
    expect(records.map(p => p.phase)).toEqual(['requesting', 'pending'])
    expect(records[0].sharedSecret).toBeUndefined()
    expect(result.sharedSecret).toBe(shared)
    expect(JSON.stringify(result)).not.toContain('unused')
    expect(JSON.stringify(result)).not.toContain(login.accessToken)
    expect(requests.map(r => r.method)).toEqual(['QueryStatus', 'AddAuthenticator'])
    expect(requests.every(r => r.url.startsWith('https://api.steampowered.com/ITwoFactorService/') && !r.url.includes(login.accessToken))).toBe(true)
    const input = JSON.parse(requests[1].body.get('input_json')!)
    expect(input).toMatchObject({ steamid: login.steamId, version: 2, authenticator_type: 1, sms_phone_id: '1' })
    expect(input.device_identifier).toStartWith('android:')
    expect(requests[1].body.get('access_token')).toBe(login.accessToken)
  })
  test('existing active authenticator is never removed or initialized again', async () => {
    const { api, requests } = mockApi({ state: 1 })
    let writes = 0
    await expect(initializeLink(api, login, async () => { writes++ })).rejects.toThrow('existing')
    expect(writes).toBe(0)
    expect(requests.map(r => r.method)).toEqual(['QueryStatus'])
  })
  test('unknown state and failed intent persistence prevent AddAuthenticator', async () => {
    for (const state of [2, -1]) {
      const { api, requests } = mockApi({ state })
      await expect(initializeLink(api, login, async () => {})).rejects.toThrow('protocol')
      expect(requests).toHaveLength(1)
    }
    const { api, requests } = mockApi()
    await expect(initializeLink(api, login, async () => { throw Error('disk') })).rejects.toThrow('disk')
    expect(requests).toHaveLength(1)
  })
  test('uncertain request leaves recoverable intent and is not retried', async () => {
    const { api, requests } = mockApi({ network: true })
    const records: PendingLink[] = []
    let thrown: unknown
    try { await initializeLink(api, login, async p => { records.push(structuredClone(p)) }) }
    catch (error) { thrown = error }
    expect(thrown).toBeInstanceOf(LinkError)
    expect((thrown as Error).message).toBe('network')
    expect(JSON.stringify(thrown)).not.toContain(login.accessToken)
    expect(JSON.stringify(thrown)).not.toContain(shared)
    expect(records.map(p => p.phase)).toEqual(['requesting'])
    expect(requests.map(r => r.method)).toEqual(['QueryStatus', 'AddAuthenticator'])
    await expect(verifyJointLink(api, login, records[0], '7MQGM')).rejects.toThrow('uncertain')
    expect(requests).toHaveLength(2)
  })
  test.each([29, 84, 123])('Steam result %i is not automatically retried or replaced with revoke', async result => {
    const { api, requests } = mockApi({ addResult: result })
    await expect(initializeLink(api, login, async () => {})).rejects.toMatchObject({ code: 'steam', result })
    expect(requests.map(r => r.method)).toEqual(['QueryStatus', 'AddAuthenticator'])
  })
  test('raw server errors never expose request tokens or secrets', async () => {
    for (const response of [new Response(login.accessToken, { status: 503 }), new Response(shared, { headers: { 'x-eresult': '1' } }), new Response('{}')]) {
      const api = new SteamLinkApi(async () => response)
      let error: unknown
      try { await api.status(login) } catch (e) { error = e }
      expect(error).toBeInstanceOf(LinkError)
      expect(String(error)).not.toContain(shared)
      expect(String(error)).not.toContain(login.accessToken)
    }
  })
  test('verified active token and phone code match server time', async () => {
    const { api, requests } = mockApi({ state: 1 })
    await verifyJointLink(api, login, pending(), '7mqgm')
    expect(requests.map(r => r.method)).toEqual(['QueryStatus', 'QueryTime'])
    expect(requests[1].body.has('access_token')).toBe(false)
    const boundary = mockApi({ state: 1, time: 1700000010 })
    await verifyJointLink(boundary.api, login, pending(), '7MQGM')
  })
  test('unactivated, replaced, wrong-account or mismatched tokens cannot be exported', async () => {
    await expect(verifyJointLink(mockApi().api, login, pending(), '7MQGM')).rejects.toThrow('notActive')
    await expect(verifyJointLink(mockApi({ state: 1, tokenGid: 'different' }).api, login, pending(), '7MQGM')).rejects.toThrow('tokenChanged')
    await expect(verifyJointLink(mockApi({ state: 1 }).api, { ...login, steamId: '76561198000000001' }, pending(), '7MQGM')).rejects.toThrow('accountMismatch')
    await expect(verifyJointLink(mockApi({ state: 1 }).api, login, pending(), 'BBBBB')).rejects.toThrow('codeMismatch')
    await expect(verifyJointLink(mockApi({ state: 1 }).api, login, pending(), '123456')).rejects.toThrow('codeMismatch')
    await expect(exportVerified(pending(), password)).rejects.toThrow('notVerified')
  })
})

describe('encrypted checkpoints and extension handoff', () => {
  test('checkpoint encryption restores pending fields and is not an importable extension backup', async () => {
    const encrypted = await encryptCheckpoint(pending(), password)
    for (const value of [shared, '"recoveryCode"', '"accountName"', login.steamId]) expect(encrypted).not.toContain(value)
    expect(await decryptCheckpoint(encrypted, password)).toEqual(pending())
    await expect(decryptCheckpoint(encrypted, 'wrong')).rejects.toThrow('checkpointPassword')
    await expect(ImportExportManager.importAccounts(new File([encrypted], 'pending.json'), [], password)).rejects.toThrow('invalid')
    const tampered = JSON.parse(encrypted); tampered.ciphertext = tampered.ciphertext.slice(1)
    await expect(decryptCheckpoint(JSON.stringify(tampered), password)).rejects.toThrow('checkpointPassword')
  })
  test('verified export imports as Steam and excludes recovery/session data', async () => {
    const encrypted = await exportVerified({ ...pending(), phase: 'verified' }, password)
    const result = await ImportExportManager.importAccounts(new File([encrypted], 'steam.json'), [], password)
    expect(result.newAccounts).toEqual([{ name: 'Steam demo', secret: 'AAAQEAYEAUDAOCAJBIFQYDIOB4IBCEQT', type: 'steam', website: 'steamcommunity.com' }])
    expect(JSON.stringify(result)).not.toContain('RDEMO1')
    expect(JSON.stringify(result)).not.toContain(login.accessToken)
  })
  test('exclusive creation, atomic updates and per-account locking protect checkpoints', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'mfa-steam-link-test-'))
    const path = join(folder, 'checkpoint.json')
    try {
      const release = await acquireLock(path)
      await expect(acquireLock(path)).rejects.toThrow('locked')
      await saveCheckpoint(path, pending(), password, true)
      await expect(saveCheckpoint(path, pending(), password, true)).rejects.toThrow()
      expect(await decryptCheckpoint(await readFile(path, 'utf8'), password)).toEqual(pending())
      await saveCheckpoint(path, { ...pending(), phase: 'verified' }, password)
      expect((await decryptCheckpoint(await readFile(path, 'utf8'), password)).phase).toBe('verified')
      await release()
      await (await acquireLock(path))()
    } finally {
      if (!resolve(folder).startsWith(resolve(tmpdir()) + sep + 'mfa-steam-link-test-')) throw new Error('Unexpected temporary path')
      await rm(folder, { recursive: true, force: true })
    }
  })
})
