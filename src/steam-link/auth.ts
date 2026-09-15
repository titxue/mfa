import { LinkError, type LoginIdentity, type Requester } from './core'

export const STEAM_API_ORIGIN = 'https://api.steampowered.com/*'
export interface AuthSession {
  accountName: string; steamId: string; clientId: string; requestId: string
  guards: number[]; interval: number; expiresAt: number; nextPoll: number
}
function string(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new LinkError('protocol')
  return value
}

/** Steam uses RSAES-PKCS1-v1_5, which WebCrypto does not expose for encryption. */
export function encryptSteamPassword(password: string, modulus: string, exponent: string): string {
  if (!/^[a-f0-9]{256,1024}$/i.test(modulus) || modulus.length % 2 || !/^[a-f0-9]{1,8}$/i.test(exponent)) throw new LinkError('protocol')
  const n = BigInt(`0x${modulus}`), e = BigInt(`0x${exponent}`), bytes = new TextEncoder().encode(password)
  const size = modulus.length / 2
  if (e < 3n || e % 2n === 0n || n % 2n === 0n || bytes.length > size - 11) throw new LinkError('passwordFormat')
  const block = new Uint8Array(size)
  block[1] = 2
  const random = new Uint8Array(1)
  for (let i = 2; i < size - bytes.length - 1; i++) {
    do { crypto.getRandomValues(random) } while (random[0] === 0)
    block[i] = random[0]
  }
  block.set(bytes, size - bytes.length)
  let value = BigInt('0x' + Array.from(block, byte => byte.toString(16).padStart(2, '0')).join(''))
  let power = e, encrypted = 1n
  while (power > 0n) {
    if (power & 1n) encrypted = encrypted * value % n
    value = value * value % n; power >>= 1n
  }
  const hex = encrypted.toString(16).padStart(size * 2, '0')
  return btoa(Array.from({ length: size }, (_, i) => String.fromCharCode(parseInt(hex.slice(i * 2, i * 2 + 2), 16))).join(''))
}

type Method = 'GetPasswordRSAPublicKey' | 'BeginAuthSessionViaCredentials' | 'UpdateAuthSessionWithSteamGuardCode' | 'PollAuthSessionStatus' | 'GenerateAccessTokenForApp'
export class SteamAuthApi {
  constructor(private request: Requester = (url, init) => fetch(url, init)) {}
  private async call(method: Method, data: Record<string, unknown>): Promise<Record<string, any>> {
    const url = new URL(`https://api.steampowered.com/IAuthenticationService/${method}/v1/`)
    const get = method === 'GetPasswordRSAPublicKey'
    const input = new URLSearchParams({ input_json: JSON.stringify(data) })
    if (get) { url.search = input.toString(); url.searchParams.set('origin', 'SteamMobile') }
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000)
    try {
      const response = await this.request(url.href, { method: get ? 'GET' : 'POST', ...(get ? {} : { body: input }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, credentials: 'omit', redirect: 'error', signal: controller.signal })
      if (!response.ok) throw new LinkError(response.status === 429 ? 'rateLimit' : 'http', response.status)
      const result = Number(response.headers.get('x-eresult'))
      if (!Number.isInteger(result) || result < 1) throw new LinkError('protocol')
      if (result !== 1) throw new LinkError('steam', result)
      const value = await response.json()
      if (!value?.response || typeof value.response !== 'object') throw new LinkError('protocol')
      return value.response
    } catch (error) {
      if (error instanceof LinkError) throw error
      throw new LinkError('network')
    } finally { clearTimeout(timer) }
  }
  async begin(accountName: string, password: string): Promise<AuthSession> {
    try {
      if (!accountName.trim() || !password) throw new LinkError('invalid')
      const rsa = await this.call('GetPasswordRSAPublicKey', { account_name: accountName.trim() })
      const response = await this.call('BeginAuthSessionViaCredentials', {
        account_name: accountName.trim(), encrypted_password: encryptSteamPassword(password, string(rsa.publickey_mod), string(rsa.publickey_exp)),
        encryption_timestamp: string(rsa.timestamp), remember_login: true, persistence: 1, website_id: 'Mobile',
        device_details: { device_friendly_name: 'MFA Steam linking', platform_type: 3, os_type: -500, gaming_device_type: 528 },
      })
      const steamId = string(response.steamid)
      if (!/^\d{17}$/.test(steamId) || !Array.isArray(response.allowed_confirmations)) throw new LinkError('protocol')
      const guards = response.allowed_confirmations.map((item: { confirmation_type: number }) => item.confirmation_type)
      if (guards.some((type: number) => ![1, 2, 3, 4, 5].includes(type))) throw new LinkError('loginGuard')
      return { accountName: accountName.trim(), steamId, clientId: string(response.client_id), requestId: string(response.request_id), guards,
        interval: Math.max(1000, Math.min(Number(response.interval) * 1000 || 3000, 10000)), expiresAt: Date.now() + 180000, nextPoll: 0 }
    } catch (error) {
      if (error instanceof LinkError) throw error
      throw new LinkError('authProcessing')
    }
  }
  async submit(session: AuthSession, code: string, codeType: number): Promise<void> {
    if (!session.guards.includes(codeType) || ![2, 3].includes(codeType) || !/^[a-z0-9]{5,8}$/i.test(code.trim())) throw new LinkError('invalid')
    await this.call('UpdateAuthSessionWithSteamGuardCode', { client_id: session.clientId, steamid: session.steamId, code: code.trim().toUpperCase(), code_type: codeType })
  }
  async poll(session: AuthSession): Promise<{ session: AuthSession; identity?: LoginIdentity }> {
    if (Date.now() > session.expiresAt) throw new LinkError('loginTimeout')
    if (Date.now() < session.nextPoll) return { session }
    const data = await this.call('PollAuthSessionStatus', { client_id: session.clientId, request_id: session.requestId })
    const next = { ...session, clientId: data.new_client_id ? string(data.new_client_id) : session.clientId, nextPoll: Date.now() + session.interval }
    if (!data.refresh_token) return { session: next }
    const accountName = string(data.account_name)
    if (accountName.toLowerCase() !== session.accountName.toLowerCase()) throw new LinkError('accountMismatch')
    let accessToken = data.access_token
    if (!accessToken) {
      const token = await this.call('GenerateAccessTokenForApp', { refresh_token: string(data.refresh_token), steamid: session.steamId, renewal_type: 0 })
      accessToken = token.access_token
    }
    return { session: next, identity: { accountName, steamId: session.steamId, accessToken: string(accessToken) } }
  }
}
