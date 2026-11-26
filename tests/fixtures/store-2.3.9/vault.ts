import type { Account } from '@/types'
import { decryptAccounts, deriveKey, encryptAccounts, newSalt, validateAccounts, validateEncrypted, type EncryptedData } from './vault-crypto'

export const VAULT_KEY = 'accountVault'
const SESSION_KEY = 'vaultSession'
export type VaultRecord = { version: 1; revision: string } & (
  { mode: 'plain'; accounts: Account[] } | { mode: 'encrypted'; data: EncryptedData })
export interface VaultSnapshot {
  revision: string
  protected: boolean
  locked: boolean
  accounts: Account[]
}
type Session = { salt: string; key: JsonWebKey }
export interface VaultStorage {
  read(): Promise<Record<string, unknown>>
  write(record: VaultRecord): Promise<void>
  cleanup(): Promise<void>
  getSession(): Promise<Session | undefined>
  setSession(value?: Session): Promise<void>
}
let previewSession: Session | undefined
export const browserVaultStorage: VaultStorage = {
  async read() {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) return chrome.storage.sync.get([VAULT_KEY, 'accounts', 'state'])
    return Object.fromEntries([VAULT_KEY, 'accounts', 'state'].map(k => [k, JSON.parse(localStorage.getItem(k) ?? 'null')]))
  },
  async write(record) {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      const size = new TextEncoder().encode(VAULT_KEY + JSON.stringify(record)).length
      if (size > 8192) throw new Error('quota')
      const total = await chrome.storage.sync.getBytesInUse(null)
      const old = await chrome.storage.sync.getBytesInUse(VAULT_KEY)
      if (total - old + size > 102400) throw new Error('quota')
      await chrome.storage.sync.set({ [VAULT_KEY]: record })
    } else localStorage.setItem(VAULT_KEY, JSON.stringify(record))
  },
  async cleanup() {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      for (const area of [chrome.storage.sync, chrome.storage.local]) {
        const values = await area.get(['accounts', 'state'])
        const keys = Object.keys(values)
        if (keys.length) await area.remove(keys)
      }
    } else { localStorage.removeItem('accounts'); localStorage.removeItem('state') }
  },
  async getSession() {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) return (await chrome.storage.session.get(SESSION_KEY))[SESSION_KEY] as Session | undefined
    return previewSession
  },
  async setSession(value) {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
      if (value) await chrome.storage.session.set({ [SESSION_KEY]: value })
      else await chrome.storage.session.remove(SESSION_KEY)
    } else previewSession = value
  },
}

function validateRecord(value: unknown): asserts value is VaultRecord {
  const v = value as VaultRecord
  if (!v || v.version !== 1 || typeof v.revision !== 'string' || !v.revision) throw new Error('invalid')
  if (v.mode === 'plain') validateAccounts(v.accounts)
  else if (v.mode === 'encrypted') validateEncrypted(v.data)
  else throw new Error('invalid')
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().filter(k => (value as Record<string, unknown>)[k] !== undefined)
    .map(k => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k])).join(',') + '}'
  return JSON.stringify(value)
}

/** Only the background worker owns this service in an extension. */
export class VaultService {
  private pending: Promise<unknown> = Promise.resolve()
  constructor(private storage: VaultStorage = browserVaultStorage) {}
  run<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.pending.catch(() => {}).then(operation)
    this.pending = next
    return next
  }
  private async record(): Promise<VaultRecord> {
    const stored = await this.storage.read()
    if (stored[VAULT_KEY] != null) {
      validateRecord(stored[VAULT_KEY])
      // Retry interrupted migration/cleanup, never re-import stale plaintext.
      await this.storage.cleanup()
      return stored[VAULT_KEY]
    }
    const accounts = stored.accounts ?? []
    validateAccounts(accounts)
    const record: VaultRecord = { version: 1, revision: crypto.randomUUID(), mode: 'plain', accounts }
    await this.storage.write(record)
    await this.storage.cleanup()
    return record
  }
  private async key(record: VaultRecord): Promise<CryptoKey | undefined> {
    const session = await this.storage.getSession()
    if (record.mode === 'plain' || !session || session.salt !== record.data.salt) {
      if (session) await this.storage.setSession()
      return undefined
    }
    return crypto.subtle.importKey('jwk', session.key, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
  }
  private async accounts(record: VaultRecord): Promise<Account[]> {
    if (record.mode === 'plain') return record.accounts
    const key = await this.key(record)
    if (!key) throw new Error('locked')
    try { return await decryptAccounts(record.data, key) }
    catch (error) { await this.storage.setSession(); throw error }
  }
  async snapshot(): Promise<VaultSnapshot> {
    const record = await this.record()
    const key = await this.key(record)
    const locked = record.mode === 'encrypted' && !key
    return { revision: record.revision, protected: record.mode === 'encrypted', locked,
      accounts: locked ? [] : await this.accounts(record) }
  }
  private async expected(revision: string): Promise<VaultRecord> {
    const record = await this.record()
    if (record.revision !== revision) throw new Error('conflict')
    return record
  }
  private async commit(record: VaultRecord, revision: string): Promise<void> {
    await this.expected(revision)
    await this.storage.write(record)
    const saved = (await this.storage.read())[VAULT_KEY]
    if (canonical(saved) !== canonical(record)) throw new Error('conflict')
    await this.storage.cleanup()
  }
  async save(accounts: Account[], revision: string): Promise<void> {
    validateAccounts(accounts)
    const old = await this.expected(revision)
    const key = await this.key(old)
    if (old.mode === 'encrypted' && !key) throw new Error('locked')
    const record: VaultRecord = old.mode === 'encrypted'
      ? { version: 1, revision: crypto.randomUUID(), mode: 'encrypted', data: await encryptAccounts(accounts, key!, old.data.salt) }
      : { version: 1, revision: crypto.randomUUID(), mode: 'plain', accounts }
    await this.commit(record, revision)
  }
  private async verify(record: VaultRecord, password: string): Promise<CryptoKey> {
    if (record.mode !== 'encrypted') throw new Error('conflict')
    const key = await deriveKey(password, record.data.salt)
    await decryptAccounts(record.data, key)
    return key
  }
  private async remember(key: CryptoKey, salt: string): Promise<void> {
    await this.storage.setSession({ salt, key: await crypto.subtle.exportKey('jwk', key) })
  }
  async unlock(password: string): Promise<void> {
    const record = await this.record()
    const key = await this.verify(record, password)
    await this.expected(record.revision)
    if (record.mode === 'encrypted') await this.remember(key, record.data.salt)
  }
  async lock(): Promise<void> { await this.storage.setSession() }
  async protect(action: 'enable' | 'change' | 'disable', password: string, nextPassword: string, revision: string): Promise<void> {
    const old = await this.expected(revision)
    let accounts: Account[]
    if (action === 'enable') {
      if (old.mode !== 'plain') throw new Error('conflict')
      accounts = old.accounts
    } else {
      const key = await this.verify(old, password)
      accounts = await decryptAccounts((old as Extract<VaultRecord, { mode: 'encrypted' }>).data, key)
    }
    if (action === 'disable') {
      await this.commit({ version: 1, revision: crypto.randomUUID(), mode: 'plain', accounts }, revision)
      await this.lock()
    } else {
      if (nextPassword.length < 8) throw new Error('passwordLength')
      const salt = newSalt()
      const key = await deriveKey(nextPassword, salt)
      const data = await encryptAccounts(accounts, key, salt)
      await decryptAccounts(data, key)
      await this.commit({ version: 1, revision: crypto.randomUUID(), mode: 'encrypted', data }, revision)
      await this.remember(key, salt)
    }
  }
  async backup(plain: boolean, password: string): Promise<string> {
    const record = await this.record()
    const accounts = await this.accounts(record)
    if (record.mode === 'encrypted' && !plain) {
      await this.expected(record.revision)
      return JSON.stringify(record.data, null, 2)
    }
    if (record.mode === 'encrypted') await this.verify(record, password)
    await this.expected(record.revision)
    return JSON.stringify({ version: '1.0', timestamp: new Date().toISOString(), accounts }, null, 2)
  }
}
export const vault = new VaultService()
