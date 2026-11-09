import type { LegacyJournal } from '../../src/utils/vault-legacy'
import { VAULT_KEY, type VaultRecord, type VaultStorage } from '../../src/utils/vault'
import { V2_KEY, MIGRATION_PREFIX, type VaultSyncStorage, type RecoveryJournal } from '../../src/utils/vault-sync'

/** Shared cloud records; local recovery and session stay separate per device. */
export class MemoryVaultStorage implements VaultStorage {
  data: Record<string, unknown>
  local?: RecoveryJournal
  legacyLocal?: LegacyJournal
  session: Awaited<ReturnType<VaultStorage['getSession']>>
  failWrite = false
  failCleanup = false
  constructor(data: Record<string, unknown> = {}) { this.data = structuredClone(data) }
  sync: VaultSyncStorage = {
    read: async () => structuredClone(Object.fromEntries(Object.entries(this.data)
      .filter(([key]) => key === V2_KEY || key.startsWith(MIGRATION_PREFIX)))),
    write: async (value, migration) => {
      if (this.failWrite) throw new Error('storageError')
      this.data[migration ? MIGRATION_PREFIX + value.id : V2_KEY] = structuredClone(value)
    },
    removeCandidates: async ids => { ids.forEach(id => { delete this.data[MIGRATION_PREFIX + id] }) },
    readLocal: async () => structuredClone(this.local),
    writeLocal: async value => { this.local = structuredClone(value) },
  }
  async read() {
    return structuredClone(Object.fromEntries(Object.entries(this.data)
      .filter(([key]) => [VAULT_KEY, 'accounts', 'state'].includes(key))))
  }
  async write(record: VaultRecord) {
    if (this.failWrite) throw new Error('storageError')
    this.data[VAULT_KEY] = structuredClone(record)
  }
  async writeAccounts(accounts: import('../../src/types').Account[]) {
    if (this.failWrite) throw new Error('storageError')
    this.data.accounts = structuredClone(accounts)
  }
  async readLegacyJournal() { return structuredClone(this.legacyLocal) }
  async writeLegacyJournal(value: LegacyJournal) { this.legacyLocal = structuredClone(value) }
  async cleanup(expected?: Record<string, unknown>) {
    if (this.failCleanup) throw new Error('storageError')
    if (expected) {
      if (JSON.stringify(await this.read()) !== JSON.stringify(expected)) throw new Error('syncConflict')
      for (const key of ['accounts', 'state']) if (expected[key] != null) delete this.data[key]
    } else {
      // The published-client fixture uses its original, unconditional API.
      delete this.data.accounts; delete this.data.state
    }
  }
  async getSession() { return structuredClone(this.session) }
  async setSession(value?: typeof this.session) { this.session = structuredClone(value) }
  currentRecord(): VaultRecord {
    const current = this.local?.current
    const value = this.data[V2_KEY] ?? (current && this.data[MIGRATION_PREFIX + current.id])
    return (value as { record: VaultRecord }).record
  }
}
