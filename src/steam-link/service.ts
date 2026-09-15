import { SteamAuthApi, type AuthSession } from './auth'
import { SteamLinkApi, LinkError, initializeLink, verifyJointLink, type PendingLink, type LoginIdentity } from './core'
import { openCheckpoint, sealCheckpoint } from './checkpoint'
import { deriveKey, encryptAccounts, newSalt } from '../utils/vault-crypto'
import { TOTP } from '../utils/totp'
import type { Account } from '../types'

export interface BindingSession {
  auth?: AuthSession; identity?: LoginIdentity; expiresAt?: number
  phase?: 'existing' | 'ready'; key?: JsonWebKey; salt?: string; verifiedAt?: number; savedName?: string
  recoveryCheckpoint?: BindingCheckpoint
}
export interface BindingCheckpoint { encrypted: string; accountName: string; steamId: string; phase: PendingLink['phase'] }
export interface BindingStorage {
  readSession(): Promise<BindingSession>; writeSession(value: BindingSession): Promise<void>
  readCheckpoint(): Promise<BindingCheckpoint | undefined>; writeCheckpoint(value: BindingCheckpoint): Promise<void>; removeCheckpoint(): Promise<void>
}
export type BindingAction = 'view' | 'login' | 'guard' | 'poll' | 'check' | 'initialize' | 'unlock' | 'verify' | 'save' | 'download' | 'restore' | 'logout' | 'discard'
export interface BindingInput { accountName?: string; password?: string; code?: string; codeType?: number; name?: string; encrypted?: string; confirmed?: boolean }
export interface BindingView {
  phase: 'login' | 'guard' | 'authenticated' | 'existing' | 'ready' | 'uncertain' | 'recovery' | 'resume' | 'pending' | 'verified' | 'saved'
  accountName?: string; guards: number[]; checkpointName?: string; recoveryCode?: string; savedName?: string
}
export function isBindingSender(sender: { id?: string; url?: string }, extensionId: string, bindingUrl: string): boolean {
  return sender.id === extensionId && sender.url === bindingUrl
}

export class SteamBindingService {
  constructor(private store: BindingStorage, private auth = new SteamAuthApi(), private api = new SteamLinkApi(),
    private saveAccount: (account: Account) => Promise<void> = async () => { throw new LinkError('storageError') }) {}

  private async session() {
    const s = await this.store.readSession()
    if (s.identity && (s.expiresAt ?? 0) < Date.now()) {
      delete s.identity; delete s.phase; delete s.verifiedAt
      await this.store.writeSession(s)
    }
    return s
  }
  private async unlock(s: BindingSession, cp: BindingCheckpoint, password?: string): Promise<{ pending: PendingLink; key: CryptoKey }> {
    let key: CryptoKey
    if (password !== undefined) {
      try { key = await deriveKey(password, JSON.parse(cp.encrypted).salt) } catch { throw new LinkError('checkpointPassword') }
    } else if (s.key) key = await crypto.subtle.importKey('jwk', s.key, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
    else throw new LinkError('checkpointPassword')
    const pending = await openCheckpoint(cp.encrypted, key)
    if (s.identity && pending.steamId !== s.identity.steamId) throw new LinkError('accountMismatch')
    return { pending, key }
  }
  private async persist(pending: PendingLink, key: CryptoKey, salt: string) {
    const record = { encrypted: await sealCheckpoint(pending, key, salt), accountName: pending.accountName, steamId: pending.steamId, phase: pending.phase }
    if (pending.phase !== 'requesting') await this.store.writeSession({ ...await this.store.readSession(), recoveryCheckpoint: record })
    await this.store.writeCheckpoint(record)
    const read = await this.store.readCheckpoint()
    if (!read || read.encrypted !== record.encrypted) throw new LinkError('storageError')
    await openCheckpoint(read.encrypted, key)
    const s = await this.store.readSession(); delete s.recoveryCheckpoint; await this.store.writeSession(s)
  }
  async view(): Promise<BindingView> {
    const s = await this.session(), cp = s.recoveryCheckpoint ?? await this.store.readCheckpoint()
    const base = { guards: s.auth?.guards ?? [], accountName: s.identity?.accountName ?? s.auth?.accountName, checkpointName: cp?.accountName }
    if (s.savedName) return { ...base, phase: 'saved', savedName: s.savedName }
    if (s.auth) return { ...base, phase: 'guard' }
    if (!s.identity) return { ...base, phase: 'login' }
    if (s.recoveryCheckpoint) return { ...base, phase: 'recovery' }
    if (cp) {
      if (cp.steamId !== s.identity.steamId) throw new LinkError('accountMismatch')
      if (cp.phase === 'requesting') return { ...base, phase: 'uncertain' }
      if (!s.key) return { ...base, phase: 'resume' }
      const { pending } = await this.unlock(s, cp)
      return { ...base, phase: s.verifiedAt && Date.now() - s.verifiedAt < 300000 ? 'verified' : 'pending', recoveryCode: pending.recoveryCode }
    }
    return { ...base, phase: s.phase ?? 'authenticated' }
  }
  async run(action: BindingAction, input: BindingInput = {}): Promise<BindingView | { data: string; fileName: string }> {
    let s = await this.session()
    const cp = s.recoveryCheckpoint ?? await this.store.readCheckpoint()
    if (action === 'view') return this.view()
    if (action === 'logout') { await this.store.writeSession(s.recoveryCheckpoint ? { recoveryCheckpoint: s.recoveryCheckpoint } : {}); return this.view() }
    if (action === 'discard') {
      if (!input.confirmed) throw new LinkError('denied')
      await this.store.removeCheckpoint(); await this.store.writeSession({}); return this.view()
    }
    if (action === 'login') {
      if (s.identity || s.savedName || (s.auth && Date.now() < s.auth.expiresAt)) throw new LinkError('busy')
      const auth = await this.auth.begin(input.accountName ?? '', input.password ?? '')
      if (cp && cp.steamId !== auth.steamId) throw new LinkError('accountMismatch')
      s = { auth, ...(s.recoveryCheckpoint ? { recoveryCheckpoint: s.recoveryCheckpoint } : {}) }; await this.store.writeSession(s); return this.view()
    }
    if (action === 'guard' || action === 'poll') {
      if (!s.auth) return this.view()
      if (Date.now() > s.auth.expiresAt) { await this.store.writeSession({}); throw new LinkError('loginTimeout') }
      if (action === 'guard') await this.auth.submit(s.auth, input.code ?? '', input.codeType ?? 0)
      const result = await this.auth.poll(s.auth)
      if (result.identity) s = { identity: result.identity, expiresAt: Date.now() + 1800000, ...(s.recoveryCheckpoint ? { recoveryCheckpoint: s.recoveryCheckpoint } : {}) }
      else s.auth = result.session
      await this.store.writeSession(s)
      return this.view()
    }
    if (action === 'restore') {
      if (cp) throw new LinkError('checkpointExists')
      const encrypted = input.encrypted ?? ''
      if (encrypted.length > 1024 * 1024) throw new LinkError('checkpoint')
      const record = { encrypted, accountName: '', steamId: '', phase: 'pending' as const }
      const { pending, key } = await this.unlock(s, record, input.password ?? '')
      await this.store.writeCheckpoint({ encrypted, accountName: pending.accountName, steamId: pending.steamId, phase: pending.phase })
      s.key = await crypto.subtle.exportKey('jwk', key); s.salt = JSON.parse(encrypted).salt
      delete s.verifiedAt; await this.store.writeSession(s); return this.view()
    }
    if (action === 'download') {
      if (!cp) throw new LinkError('checkpoint')
      if (s.verifiedAt && s.key) {
        const { pending, key } = await this.unlock(s, cp)
        const account = this.account(pending)
        if (s.savedName) account.name = s.savedName
        const data = JSON.stringify(await encryptAccounts([account], key, s.salt!), null, 2)
        return { data, fileName: 'steam-account-encrypted.json' }
      }
      return { data: cp.encrypted, fileName: 'steam-recovery-checkpoint.json' }
    }
    if (!s.identity) throw new LinkError('loginRequired')
    if (action === 'check') {
      if (s.recoveryCheckpoint) {
        await this.store.writeCheckpoint(s.recoveryCheckpoint)
        if ((await this.store.readCheckpoint())?.encrypted !== s.recoveryCheckpoint.encrypted) throw new LinkError('storageError')
        delete s.recoveryCheckpoint; await this.store.writeSession(s)
      }
      if (!cp) {
        s.phase = (await this.api.status(s.identity)).state === 1 ? 'existing' : 'ready'
        await this.store.writeSession(s)
      }
      return this.view()
    }
    if (action === 'initialize') {
      if (cp) throw new LinkError('checkpointExists')
      if (!input.confirmed) throw new LinkError('denied')
      const password = input.password ?? ''
      if (password.length < 8) throw new LinkError('passwordLength')
      const salt = newSalt(), key = await deriveKey(password, salt)
      s.key = await crypto.subtle.exportKey('jwk', key); s.salt = salt
      await this.store.writeSession(s)
      await initializeLink(this.api, s.identity, pending => this.persist(pending, key, salt))
      s.key = await crypto.subtle.exportKey('jwk', key); s.salt = salt
      await this.store.writeSession(s); return this.view()
    }
    if (!cp) throw new LinkError('checkpoint')
    if (cp.phase === 'requesting') throw new LinkError('uncertain')
    if (action === 'unlock') {
      const { key } = await this.unlock(s, cp, input.password ?? '')
      s.key = await crypto.subtle.exportKey('jwk', key); s.salt = JSON.parse(cp.encrypted).salt
      await this.store.writeSession(s); return this.view()
    }
    const { pending, key } = await this.unlock(s, cp)
    if (action === 'verify') {
      await verifyJointLink(this.api, s.identity, pending, input.code ?? '')
      pending.phase = 'verified'; await this.persist(pending, key, s.salt!)
      s.verifiedAt = Date.now(); await this.store.writeSession(s); return this.view()
    }
    if (action === 'save') {
      if (!s.verifiedAt || Date.now() - s.verifiedAt > 300000 || pending.phase !== 'verified') throw new LinkError('notVerified')
      const account = this.account(pending)
      account.name = input.name?.trim() || account.name
      await this.saveAccount(account)
      delete s.identity; delete s.auth; s.savedName = account.name
      await this.store.writeSession(s); return this.view()
    }
    throw new LinkError('invalid')
  }
  private account(p: PendingLink): Account {
    return { name: `Steam ${p.accountName}`, secret: TOTP.steamSecretToBase32(p.sharedSecret!), type: 'steam', website: 'steamcommunity.com' }
  }
}
