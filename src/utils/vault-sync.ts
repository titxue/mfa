import type { VaultRecord } from './vault'

export const V2_KEY = 'accountVaultV2'
export const MIGRATION_PREFIX = 'accountVaultV2Migration:'
export const RECOVERY_KEY = 'accountVaultV2Recovery'

export interface SyncRecord {
  recoveryOnly?: boolean
  id: string
  vector: Record<string, number>
  record: VaultRecord
}
export interface RecoveryJournal {
  deviceId: string
  counter: number
  current?: SyncRecord
  pending?: SyncRecord
  conflicts: SyncRecord[]
  legacy?: VaultRecord
  legacySeen?: string
}
export interface VaultSyncStorage {
  read(): Promise<Record<string, unknown>>
  write(value: SyncRecord, migration: boolean): Promise<void>
  removeCandidates(ids: string[]): Promise<void>
  readLocal(): Promise<unknown>
  writeLocal(value: RecoveryJournal): Promise<void>
}
const quota = (values: Record<string, unknown>) => Object.entries(values).every(([key, value]) =>
  new TextEncoder().encode(key + JSON.stringify(value)).length <= 8192)

export const browserSyncStorage: VaultSyncStorage = {
  async read() {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      const all = await chrome.storage.sync.get(null)
      return Object.fromEntries(Object.entries(all).filter(([key]) => key === V2_KEY || key.startsWith(MIGRATION_PREFIX)))
    }
    return Object.fromEntries(Object.keys(localStorage).filter(key => key === V2_KEY || key.startsWith(MIGRATION_PREFIX))
      .map(key => [key, JSON.parse(localStorage.getItem(key)!)]))
  },
  async write(value, migration) {
    const key = migration ? MIGRATION_PREFIX + value.id : V2_KEY
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      const values = { [key]: value }
      if (!quota(values)) throw new Error('quota')
      const size = new TextEncoder().encode(key + JSON.stringify(value)).length
      const [total, old] = await Promise.all([chrome.storage.sync.getBytesInUse(null), chrome.storage.sync.getBytesInUse(key)])
      if (total - old + size > 102400) throw new Error('quota')
      await chrome.storage.sync.set(values)
    } else localStorage.setItem(key, JSON.stringify(value))
  },
  async removeCandidates(ids) {
    const keys = ids.map(id => MIGRATION_PREFIX + id)
    if (!keys.length) return
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) await chrome.storage.sync.remove(keys)
    else keys.forEach(key => localStorage.removeItem(key))
  },
  async readLocal() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) return (await chrome.storage.local.get(RECOVERY_KEY))[RECOVERY_KEY]
    return JSON.parse(localStorage.getItem(RECOVERY_KEY) ?? 'null') ?? undefined
  },
  async writeLocal(value) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
      await chrome.storage.local.set({ [RECOVERY_KEY]: value })
    } else localStorage.setItem(RECOVERY_KEY, JSON.stringify(value))
  },
}

export function dominates(a: SyncRecord, b: SyncRecord): boolean {
  const count = (v: Record<string, number>, key: string) => Object.hasOwn(v, key) ? v[key] : 0
  const keys = new Set([...Object.keys(a.vector), ...Object.keys(b.vector)])
  return [...keys].every(key => count(a.vector, key) >= count(b.vector, key)) &&
    [...keys].some(key => count(a.vector, key) > count(b.vector, key))
}
export function causalHeads(records: SyncRecord[]): SyncRecord[] {
  return records.filter(record => !records.some(other => other.id !== record.id && dominates(other, record)))
}
