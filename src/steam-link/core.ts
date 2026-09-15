import { TOTP } from '../utils/totp'
import { deriveKey, encryptAccounts, newSalt } from '../utils/vault-crypto'

export interface LoginIdentity { accountName: string; steamId: string; accessToken: string }
export interface PendingLink {
  version: 1
  phase: 'requesting' | 'pending' | 'verified'
  accountName: string
  steamId: string
  deviceId: string
  createdAt: string
  sharedSecret?: string
  tokenGid?: string
  recoveryCode?: string
}
export type Requester = (url: string, init: RequestInit) => Promise<Response>
type ApiMethod = 'QueryTime' | 'QueryStatus' | 'AddAuthenticator'
export class LinkError extends Error {
  constructor(public readonly code: string, public readonly result?: number) { super(code) }
}
function text(value: unknown): string {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value)
  throw new LinkError('protocol')
}

/** Only these three endpoints are available: no revoke, transfer or finalize operation. */
export class SteamLinkApi {
  constructor(private readonly request: Requester = (url, init) => fetch(url, init)) {}
  private async call(method: ApiMethod, input: Record<string, unknown>, token?: string): Promise<Record<string, unknown>> {
    if (!['QueryTime', 'QueryStatus', 'AddAuthenticator'].includes(method)) throw new LinkError('protocol')
    const body = new URLSearchParams({ input_json: JSON.stringify(input) })
    if (token) body.set('access_token', token)
    let response: Response
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      response = await this.request(`https://api.steampowered.com/ITwoFactorService/${method}/v1/`, {
        method: 'POST', body, redirect: 'error', credentials: 'omit', signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    } catch { throw new LinkError('network') }
    finally { clearTimeout(timer) }
    if (!response.ok) throw new LinkError(response.status === 429 ? 'rateLimit' : 'http', response.status)
    const header = response.headers.get('x-eresult')
    if (!header || !/^\d+$/.test(header)) throw new LinkError('protocol')
    const result = Number(header)
    if (result !== 1) throw new LinkError('steam', result)
    let data: unknown
    try { data = await response.json() } catch { throw new LinkError('protocol') }
    const inner = (data as { response?: unknown })?.response
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) throw new LinkError('protocol')
    return inner as Record<string, unknown>
  }
  async time(): Promise<number> {
    const response = await this.call('QueryTime', {})
    const time = Number(response.server_time)
    if (!Number.isSafeInteger(time) || time <= 0) throw new LinkError('protocol')
    return time
  }
  async status(login: LoginIdentity): Promise<{ state: number; tokenGid?: string }> {
    const response = await this.call('QueryStatus', { steamid: login.steamId }, login.accessToken)
    // Unknown states are not interpreted as either unbound or active.
    if (response.state !== 0 && response.state !== 1) throw new LinkError('protocol')
    return { state: response.state, ...(response.token_gid ? { tokenGid: text(response.token_gid) } : {}) }
  }
  async add(login: LoginIdentity, deviceId: string): Promise<Pick<PendingLink, 'sharedSecret' | 'recoveryCode' | 'tokenGid'>> {
    const response = await this.call('AddAuthenticator', {
      steamid: login.steamId, authenticator_type: 1, device_identifier: deviceId, sms_phone_id: '1', version: 2,
    }, login.accessToken)
    if (response.status !== undefined && response.status !== 1) {
      throw new LinkError('steam', typeof response.status === 'number' ? response.status : undefined)
    }
    const sharedSecret = text(response.shared_secret)
    try { TOTP.steamSecretToBase32(sharedSecret) } catch { throw new LinkError('protocol') }
    if (typeof response.account_name !== 'string' || response.account_name.toLowerCase() !== login.accountName.toLowerCase()) throw new LinkError('accountMismatch')
    return { sharedSecret, recoveryCode: text(response.revocation_code), tokenGid: text(response.token_gid) }
  }
}

export function validatePending(value: unknown): asserts value is PendingLink {
  const p = value as PendingLink
  if (!p || p.version !== 1 || !['requesting', 'pending', 'verified'].includes(p.phase) ||
      typeof p.accountName !== 'string' || !p.accountName.trim() || typeof p.steamId !== 'string' || !/^\d{17}$/.test(p.steamId) ||
      typeof p.deviceId !== 'string' || !p.deviceId.startsWith('android:') ||
      typeof p.createdAt !== 'string' || !Number.isFinite(Date.parse(p.createdAt))) throw new LinkError('checkpoint')
  if (p.phase !== 'requesting') {
    if (typeof p.sharedSecret !== 'string' || typeof p.tokenGid !== 'string' || !p.tokenGid ||
        typeof p.recoveryCode !== 'string' || !p.recoveryCode) throw new LinkError('checkpoint')
    try { TOTP.steamSecretToBase32(p.sharedSecret) } catch { throw new LinkError('checkpoint') }
  }
}

/** Keep the authenticated session while its owner decides whether to prepare a new enrollment. */
export async function waitForInitialization(api: SteamLinkApi, login: LoginIdentity, recheck: () => Promise<boolean>): Promise<void> {
  while ((await api.status(login)).state !== 0) {
    if (!await recheck()) throw new LinkError('existing')
  }
}

export async function initializeLink(api: SteamLinkApi, login: LoginIdentity, save: (value: PendingLink) => Promise<void>): Promise<PendingLink> {
  const status = await api.status(login)
  if (status.state !== 0) throw new LinkError('existing')
  const pending: PendingLink = {
    version: 1, phase: 'requesting', accountName: login.accountName, steamId: login.steamId,
    deviceId: `android:${crypto.randomUUID()}`, createdAt: new Date().toISOString(),
  }
  validatePending(pending)
  // Persist intent first. If the request outcome is uncertain, never automatically repeat it.
  await save(pending)
  const secrets = await api.add(login, pending.deviceId)
  Object.assign(pending, secrets, { phase: 'pending' })
  validatePending(pending)
  await save(pending)
  return pending
}

export async function verifyJointLink(api: SteamLinkApi, login: LoginIdentity, pending: PendingLink, phoneCode: string): Promise<void> {
  validatePending(pending)
  if (pending.phase === 'requesting') throw new LinkError('uncertain')
  if (login.steamId !== pending.steamId) throw new LinkError('accountMismatch')
  const code = phoneCode.trim().toUpperCase()
  if (!/^[23456789BCDFGHJKMNPQRTVWXY]{5}$/.test(code)) throw new LinkError('codeMismatch')
  const status = await api.status(login)
  if (status.state !== 1) throw new LinkError('notActive')
  if (!status.tokenGid || status.tokenGid !== pending.tokenGid) throw new LinkError('tokenChanged')
  const now = await api.time()
  const key = TOTP.steamSecretToBase32(pending.sharedSecret!)
  // Accept the immediately previous step for the normal copy-at-boundary case.
  for (const time of [now, now - 30]) {
    if (await TOTP.generateTOTP(key, 30, 'steam', time * 1000) === code) return
  }
  throw new LinkError('codeMismatch')
}

export async function exportVerified(pending: PendingLink, password: string): Promise<string> {
  validatePending(pending)
  if (pending.phase !== 'verified') throw new LinkError('notVerified')
  if (password.length < 8) throw new LinkError('passwordLength')
  const salt = newSalt(), key = await deriveKey(password, salt)
  return JSON.stringify(await encryptAccounts([{
    name: `Steam ${pending.accountName}`, secret: TOTP.steamSecretToBase32(pending.sharedSecret!),
    type: 'steam', website: 'steamcommunity.com',
  }], key, salt), null, 2)
}
