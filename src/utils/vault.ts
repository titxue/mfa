import type { Account } from '@/types'
import { browserSyncStorage, causalHeads, dominates, V2_KEY, MIGRATION_PREFIX, type VaultSyncStorage, type SyncRecord, type RecoveryJournal } from './vault-sync'
import { accountDataVersion, decryptAccounts, deriveKey, encryptAccounts, newSalt, validateAccounts, validateEncrypted, type EncryptedData } from './vault-crypto'

export const VAULT_KEY = 'accountVault'
const SESSION_KEY = 'vaultSession'
export type VaultRecord = { version: 1 | 2; revision: string } & (
  { mode: 'plain'; accounts: Account[] } | { mode: 'encrypted'; data: EncryptedData })
export interface VaultSnapshot {
  revision: string
  protected: boolean
  locked: boolean
  accounts: Account[]
  syncState?: 'migration' | 'conflict' | 'pending'
}
type Session = { salt: string; key: JsonWebKey }
export interface VaultStorage {
  sync?: VaultSyncStorage
  read(): Promise<Record<string, unknown>>
  write(record: VaultRecord): Promise<void>
  cleanup(): Promise<void>
  getSession(): Promise<Session | undefined>
  setSession(value?: Session): Promise<void>
}
let previewSession: Session | undefined
export const browserVaultStorage: VaultStorage = {
  sync: browserSyncStorage,
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
        if (Object.keys(await area.get(['accounts', 'state'])).length) throw new Error('storageError')
      }
    } else {
      localStorage.removeItem('accounts'); localStorage.removeItem('state')
      if (localStorage.getItem('accounts') !== null || localStorage.getItem('state') !== null) throw new Error('storageError')
    }
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
  if (!v || (v.version !== 1 && v.version !== 2) || typeof v.revision !== 'string' || !v.revision) throw new Error('invalid')
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

type Protection = { key: CryptoKey; salt: string; recoveryPasswords?: string[] }

type SyncState = 'migration' | 'conflict' | 'pending' | 'ready'
interface State {
  revision: string
  state: SyncState
  raw: Record<string, unknown>
  syncRaw: Record<string, unknown>
  localRaw: unknown
  journal?: RecoveryJournal
  remote: SyncRecord[]
  records: SyncRecord[]
  heads: SyncRecord[]
  legacy?: SyncRecord
  invalid: boolean
}
const unique = (records: SyncRecord[]) => [...new Map(records.map(record => [record.id, record])).values()]
async function fingerprint(value: unknown) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)))
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}
function validateSync(value: unknown): asserts value is SyncRecord {
  const v = value as SyncRecord
  if (!v || typeof v.id !== 'string' || !v.id || !v.vector || typeof v.vector !== 'object' || Array.isArray(v.vector) ||
      !Object.keys(v.vector).length || Object.values(v.vector).some(n => !Number.isSafeInteger(n) || n < 1)) throw new Error('invalid')
  validateRecord(v.record)
  if (v.record.revision !== v.id) throw new Error('invalid')
}

/** Background-owned storage. Reads never create, migrate, clean up or repair records. */
export class VaultService {
  private pending: Promise<unknown> = Promise.resolve()
  constructor(private storage: VaultStorage = browserVaultStorage) {}
  run<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.pending.catch(() => {}).then(operation)
    this.pending = next
    return next
  }
  private port() {
    if (!this.storage.sync) throw new Error('storageError')
    return this.storage.sync
  }
  private async state(): Promise<State> {
    const [raw, syncRaw, localRaw] = await Promise.all([
      this.storage.read(), this.storage.sync?.read() ?? Promise.resolve({}), this.storage.sync?.readLocal(),
    ])
    let invalid = false, journal: RecoveryJournal | undefined, legacy: SyncRecord | undefined
    const remote: SyncRecord[] = []
    for (const [key, value] of Object.entries(syncRaw)) {
      try {
        validateSync(value)
        if (key !== V2_KEY && key !== MIGRATION_PREFIX + value.id) throw new Error('invalid')
        remote.push(value)
      } catch { invalid = true }
    }
    if (localRaw != null) {
      try {
        const j = localRaw as RecoveryJournal
        if (!j || typeof j.deviceId !== 'string' || !j.deviceId || !Number.isSafeInteger(j.counter) || j.counter < 0 || !Array.isArray(j.conflicts)) throw new Error('invalid')
        for (const record of [j.current, j.pending, ...j.conflicts].filter(Boolean)) validateSync(record)
        if (j.legacy) validateRecord(j.legacy)
        if (j.rekey) {
          const { checksum, ...checkpoint } = j.rekey
          if (checksum !== await fingerprint(checkpoint) || !!j.rekey.legacy !== !!j.legacy ||
            canonical(j.rekey.conflicts?.map(v => ({ id: v.id, vector: v.vector }))) !==
            canonical(j.conflicts.map(v => ({ id: v.id, vector: v.vector })))) throw new Error('invalid')
          if (j.rekey.targetId !== j.pending?.id || typeof j.rekey.source !== 'string' ||
            !Array.isArray(j.rekey.conflicts) || await fingerprint({ ...j, rekey: undefined }) !== j.rekey.source) throw new Error('invalid')
          for (const record of j.rekey.conflicts) {
            validateSync(record)
            if (!record.recoveryOnly || record.record.mode !== 'encrypted') throw new Error('invalid')
          }
          if (j.rekey.legacy) { validateRecord(j.rekey.legacy); if (j.rekey.legacy.mode !== 'encrypted') throw new Error('invalid') }
        }
        journal = j
      } catch { invalid = true }
    }
    try {
      const old = raw[VAULT_KEY] as Record<string, unknown> | undefined
      let record: VaultRecord | undefined
      if (old != null) {
        if (!(old.version === 2 && old.mode === 'migrated' && old.target === V2_KEY)) {
          validateRecord(old); record = old
        } else if (!remote.length && !journal?.current && !journal?.pending) invalid = true
      } else if (raw.accounts != null) {
        validateAccounts(raw.accounts)
        record = { version: 1, revision: 'legacy', mode: 'plain', accounts: raw.accounts }
      }
      if (record) legacy = { id: 'legacy:' + await fingerprint(record), vector: {}, record }
    } catch { invalid = true }
    const records = unique([...remote, ...[journal?.current, journal?.pending, ...(journal?.conflicts ?? [])].filter((v): v is SyncRecord => !!v)])
    const heads = causalHeads(records.filter(record => !record.recoveryOnly))
    for (const record of remote) {
      const local = [journal?.current, journal?.pending, ...(journal?.conflicts ?? [])].find(v => v?.id === record.id && !v.recoveryOnly)
      if (local && canonical(local) !== canonical(record)) invalid = true
    }
    const head = heads[0]
    const pending = head && (!remote.some(record => record.id === head.id) || journal?.pending?.id === head.id)
    const baselineLegacy = journal?.legacySeen ?? (journal?.legacy ? 'legacy:' + await fingerprint(journal.legacy) : undefined)
    const changedLegacy = !!head && !!legacy && legacy.id !== baselineLegacy
    const state: SyncState = invalid ? 'pending' : heads.length > 1 || changedLegacy ? 'conflict' : pending ? 'pending' : head ? 'ready' : legacy ? 'migration' : 'ready'
    const revision = await fingerprint({ raw, syncRaw, localRaw: localRaw ?? null })
    return { revision, state, raw, syncRaw, localRaw, journal, remote, records, heads, legacy, invalid }
  }
  private requireReady(state: State): SyncRecord {
    if (state.state !== 'ready') throw new Error(state.state === 'migration' ? 'migrationRequired' : state.state === 'conflict' ? 'syncConflict' : 'syncPending')
    const head = state.heads[0]
    if (!head) throw new Error('uninitialized')
    return head
  }
  private async key(record: VaultRecord): Promise<CryptoKey | undefined> {
    const session = await this.storage.getSession()
    if (record.mode !== 'encrypted' || !session || session.salt !== record.data.salt) {
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
    const state = await this.state()
    if (state.state !== 'ready') return {
      revision: state.revision, protected: [...state.records, ...(state.legacy ? [state.legacy] : [])].some(v => v.record.mode === 'encrypted'),
      locked: true, accounts: [], syncState: state.state,
    }
    const record = state.heads[0]?.record
    if (!record) return { revision: 'empty', protected: false, locked: false, accounts: [] }
    const key = await this.key(record)
    const locked = record.mode === 'encrypted' && !key
    return { revision: record.revision, protected: record.mode === 'encrypted', locked, accounts: locked ? [] : await this.accounts(record) }
  }
  private async expected(revision: string): Promise<State> {
    const state = await this.state()
    if (state.state !== 'ready') { this.requireReady(state); throw new Error('conflict') }
    if ((state.heads[0]?.id ?? 'empty') !== revision) throw new Error('conflict')
    return state
  }
  private async writeLocal(value: RecoveryJournal) {
    await this.port().writeLocal(value)
    if (canonical(await this.port().readLocal()) !== canonical(value)) throw new Error('storageError')
  }
  private async sealJournal(journal: RecoveryJournal, key: CryptoKey, salt: string): Promise<RecoveryJournal> {
    const seal = async (record: VaultRecord): Promise<VaultRecord> => record.mode === 'encrypted' ? record : {
      version: 2, revision: record.revision, mode: 'encrypted', data: await encryptAccounts(record.accounts, key, salt),
    }
    const copy = async (value?: SyncRecord): Promise<SyncRecord | undefined> => !value ? undefined : value.record.mode === 'encrypted' ? value :
      { ...value, recoveryOnly: true, record: await seal(value.record) }
    return { ...journal, current: await copy(journal.current), pending: await copy(journal.pending),
      conflicts: await Promise.all(journal.conflicts.map(async value => (await copy(value))!)),
      ...(journal.legacy ? { legacy: await seal(journal.legacy) } : {}),
    }
  }
  /** No persistent writes until every historical account set can be re-encrypted. */
  private async rekeyJournal(journal: RecoveryJournal, protection: Protection): Promise<RecoveryJournal> {
    const keys = new Map<string, Promise<CryptoKey>>()
    const copies = new Map<string, Promise<VaultRecord>>()
    const seal = (record: VaultRecord): Promise<VaultRecord> => {
      const identity = canonical(record)
      if (!copies.has(identity)) copies.set(identity, (async () => {
        let accounts: Account[]
        if (record.mode === 'plain') accounts = record.accounts
        else {
          let opened: Account[] | undefined
          if (record.data.salt === protection.salt) {
            try { await decryptAccounts(record.data, protection.key); return record } catch { /* Try the supplied passwords below. */ }
          }
          for (const [index, password] of (protection.recoveryPasswords ?? []).entries()) {
            if (opened) break
            const id = `${index}:${record.data.salt}`
            if (!keys.has(id)) keys.set(id, deriveKey(password, record.data.salt))
            try { opened = await decryptAccounts(record.data, await keys.get(id)!) } catch { /* A historical version may use another password. */ }
          }
          if (!opened) throw new Error('recoveryPasswordRequired')
          accounts = opened
        }
        const data = await encryptAccounts(accounts, protection.key, protection.salt)
        await decryptAccounts(data, protection.key)
        return { version: 2, revision: record.revision, mode: 'encrypted', data }
      })())
      return copies.get(identity)!
    }
    const copy = async (value?: SyncRecord): Promise<SyncRecord | undefined> => value && {
      ...value, recoveryOnly: true, record: await seal(value.record),
    }
    return { ...journal, rekey: undefined, current: await copy(journal.current), pending: journal.pending,
      conflicts: await Promise.all(journal.conflicts.map(async value => (await copy(value))!)),
      ...(journal.legacy ? { legacy: await seal(journal.legacy) } : {}),
    }
  }
  private async commit(record: VaultRecord, baseline: State, migration = false, seal?: Protection, resolving = false): Promise<void> {
    const latest = await this.state()
    if (latest.revision !== baseline.revision) throw new Error('conflict')
    if (latest.invalid) throw new Error('syncPending')
    // A guarded vault must not silently delete an untracked legacy plaintext copy.
    if (seal?.recoveryPasswords && latest.raw.accounts != null && !latest.legacy) throw new Error('syncConflict')
    let previous: RecoveryJournal = latest.journal ?? { deviceId: crypto.randomUUID(), counter: 0, conflicts: [] }
    const resume = resolving && previous.rekey?.targetId === record.revision ? previous.rekey : undefined
    const replacements = new Map(resume?.conflicts.map(value => [value.id, value]) ?? [])
    if (resume) previous = { ...previous, conflicts: resume.conflicts, legacy: resume.legacy }
    previous = { ...previous, rekey: undefined }
    const vector: Record<string, number> = {}
    for (const head of latest.heads) for (const [device, count] of Object.entries(head.vector)) vector[device] = Math.max(vector[device] ?? 0, count)
    const counter = Math.max(previous.counter, vector[previous.deviceId] ?? 0) + 1
    vector[previous.deviceId] = counter
    const id = crypto.randomUUID()
    const candidate: SyncRecord = { id, vector, record: { ...record, version: 2, revision: id } }
    const archived = resolving || seal?.recoveryPasswords ? [...latest.records, ...(latest.legacy ? [latest.legacy] : [])].map(original => {
      const value = replacements.get(original.id) ?? original
      return { ...value, recoveryOnly: true, vector: Object.keys(value.vector).length ? value.vector : vector,
        record: { ...value.record, revision: value.id } }
    }) : []
    let journal: RecoveryJournal = {
      ...previous, counter, current: latest.heads[0] ? (replacements.get(latest.heads[0].id) ?? latest.heads[0]) : previous.current, pending: candidate,
      conflicts: unique([...previous.conflicts, ...archived]),
      ...(migration && latest.legacy ? { legacy: latest.legacy.record } : {}),
      ...(latest.legacy ? { legacySeen: latest.legacy.id } : {}),
    }
    // Keep the original versions until publishing/cleanup succeeds. The checkpoint lets
    // explicit recovery finish the replacement password without retaining old ciphertext.
    const rekeyed = seal?.recoveryPasswords ? await this.rekeyJournal(journal, seal) : undefined
    if (seal) journal = await this.sealJournal(journal, seal.key, seal.salt)
    if (rekeyed) {
      const checkpoint = { targetId: id, source: await fingerprint(journal),
        conflicts: rekeyed.conflicts, ...(rekeyed.legacy ? { legacy: rekeyed.legacy } : {}) }
      journal.rekey = { ...checkpoint, checksum: await fingerprint(checkpoint) }
    }
    if ((await this.state()).revision !== latest.revision) throw new Error('conflict')
    await this.writeLocal(journal)
    await this.port().write(candidate, migration)
    const written = (await this.port().read())[migration ? MIGRATION_PREFIX + id : V2_KEY]
    if (canonical(written) !== canonical(candidate)) throw new Error('conflict')
    const checked = await this.state()
    if (canonical(checked.localRaw) !== canonical(journal) || canonical(checked.raw) !== canonical(latest.raw)) throw new Error('conflict')
    if (checked.invalid || checked.state === 'conflict' || checked.heads.length !== 1 || checked.heads[0].id !== id) throw new Error('syncConflict')
    // The original data is now recoverable locally and in V2 before old clients are stopped.
    await this.storage.write({ version: 2, revision: id, mode: 'migrated', target: V2_KEY } as unknown as VaultRecord)
    const guard = (await this.storage.read())[VAULT_KEY] as { mode?: string; revision?: string } | undefined
    if (guard?.mode !== 'migrated' || guard.revision !== id) throw new Error('storageError')
    await this.storage.cleanup()
    const cleaned = await this.storage.read()
    if (cleaned.accounts != null || cleaned.state != null) throw new Error('storageError')
    const removed = latest.remote.filter(old => dominates(candidate, old)).map(old => old.id)
    await this.port().removeCandidates(removed)
    const remaining = await this.port().read()
    if (removed.some(old => remaining[MIGRATION_PREFIX + old] !== undefined)) throw new Error('storageError')
    if (canonical(remaining[migration ? MIGRATION_PREFIX + id : V2_KEY]) !== canonical(candidate)) throw new Error('conflict')
    // A newly arrived branch was not included in this transaction's recovery archive.
    // Never erase it or claim that its old-password ciphertext has been replaced.
    if (rekeyed && Object.entries(remaining).some(([key, value]) =>
      key !== (migration ? MIGRATION_PREFIX + id : V2_KEY) || canonical(value) !== canonical(candidate))) throw new Error('syncConflict')
    const finalState = await this.state()
    if (canonical(finalState.localRaw) !== canonical(journal) || canonical(finalState.raw) !== canonical(cleaned) ||
      canonical(finalState.syncRaw) !== canonical(remaining)) throw new Error('conflict')
    if (finalState.invalid || finalState.state === 'conflict' || finalState.heads.length !== 1 || finalState.heads[0].id !== id) throw new Error('syncConflict')
    await this.writeLocal({ ...(rekeyed ?? journal), rekey: undefined, current: candidate, pending: undefined })
  }
  async migrate(revision: string): Promise<void> {
    const state = await this.state()
    if (state.revision !== revision) throw new Error('conflict')
    if (state.state !== 'migration' || !state.legacy) throw new Error('conflict')
    await this.commit(state.legacy.record, state, true)
  }
  async save(accounts: Account[], revision: string): Promise<void> {
    validateAccounts(accounts)
    const state = await this.expected(revision)
    const old = state.heads[0]?.record
    const key = old ? await this.key(old) : undefined
    if (old?.mode === 'encrypted' && !key) throw new Error('locked')
    const record: VaultRecord = old?.mode === 'encrypted'
      ? { version: 2, revision: '', mode: 'encrypted', data: await encryptAccounts(accounts, key!, old.data.salt) }
      : { version: 2, revision: '', mode: 'plain', accounts }
    await this.commit(record, state, !old)
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
    const state = await this.state(), record = this.requireReady(state).record
    const key = await this.verify(record, password)
    await this.expected(record.revision)
    if (record.mode === 'encrypted') await this.remember(key, record.data.salt)
  }
  async lock(): Promise<void> { await this.storage.setSession() }
  async protect(action: 'enable' | 'change' | 'disable', password: string, nextPassword: string, revision: string): Promise<void> {
    const state = await this.expected(revision), existing = state.heads[0]?.record
    if (!existing && action !== 'enable') throw new Error('uninitialized')
    const old: VaultRecord = existing ?? { version: 2, revision: 'empty', mode: 'plain', accounts: [] }
    let accounts: Account[]
    if (action === 'enable') {
      if (old.mode !== 'plain') throw new Error('conflict')
      accounts = old.accounts
    } else accounts = await decryptAccounts((old as Extract<VaultRecord, { mode: 'encrypted' }>).data, await this.verify(old, password))
    if (action === 'disable') {
      await this.commit({ version: 2, revision: '', mode: 'plain', accounts }, state)
      await this.lock()
    } else {
      if (nextPassword.length < 8) throw new Error('passwordLength')
      const salt = newSalt(), key = await deriveKey(nextPassword, salt)
      const data = await encryptAccounts(accounts, key, salt)
      await decryptAccounts(data, key)
      await this.commit({ version: 2, revision: '', mode: 'encrypted', data }, state, !existing, { key, salt, recoveryPasswords: action === 'change' ? [...new Set([password, nextPassword])] : [nextPassword] })
      await this.remember(key, salt)
    }
  }
  async backup(plain: boolean, password: string): Promise<string> {
    const state = await this.state(), record = this.requireReady(state).record
    const accounts = await this.accounts(record)
    if (record.mode === 'encrypted' && !plain) return JSON.stringify(record.data, null, 2)
    if (record.mode === 'encrypted') await this.verify(record, password)
    await this.expected(record.revision)
    return JSON.stringify({ version: '1.0', timestamp: new Date().toISOString(), accounts }, null, 2)
  }
  async recoveryState() {
    const state = await this.state()
    const candidates = unique([...state.records, ...(state.legacy ? [state.legacy] : []),
      ...(state.journal?.legacy ? [{ id: 'source:' + await fingerprint(state.journal.legacy), vector: {}, record: state.journal.legacy }] : [])])
    return { revision: state.revision, state: state.state,
      protected: [state.journal?.current, ...state.heads].some(value => value?.record.mode === 'encrypted'),
      candidates: candidates.map(value => ({
      id: value.id, label: value.id, protected: value.record.mode === 'encrypted',
      ...(value.record.mode === 'plain' ? { accountCount: value.record.accounts.length, accountNames: value.record.accounts.slice(0, 3).map(a => a.name) } : {}),
    })) }
  }
  async recoveryBackup(candidateId?: string): Promise<string> {
    const state = await this.state()
    if (!candidateId) return JSON.stringify({ format: 'mfa-recovery', version: 1, legacy: state.raw, synchronized: state.syncRaw, local: state.localRaw ?? null }, null, 2)
    const source = state.journal?.legacy
    const record = candidateId === state.legacy?.id ? state.legacy.record :
      source && candidateId === 'source:' + await fingerprint(source) ? source : state.records.find(value => value.id === candidateId)?.record
    if (!record) throw new Error('invalid')
    return JSON.stringify(record.mode === 'encrypted' ? record.data : { version: '1.0', accounts: record.accounts }, null, 2)
  }
  async resolve(candidateId: string, revision: string, password = ''): Promise<void> {
    const state = await this.state()
    if (state.revision !== revision) throw new Error('conflict')
    if (state.invalid) throw new Error('syncPending')
    let selected = candidateId === state.legacy?.id ? state.legacy.record : state.records.find(value => value.id === candidateId)?.record
    const source = state.journal?.legacy
    if (!selected && source && candidateId === 'source:' + await fingerprint(source)) selected = source
    if (!selected) throw new Error('invalid')
    let protection: Protection | undefined
    if (selected.mode === 'encrypted') protection = { key: await this.verify(selected, password), salt: selected.data.salt }
    else {
      const protectedRecord = [state.journal?.current, ...state.heads].find(value => value?.record.mode === 'encrypted')?.record
      if (protectedRecord?.mode === 'encrypted') {
        protection = { key: await this.verify(protectedRecord, password), salt: protectedRecord.data.salt }
        selected = { version: 2, revision: '', mode: 'encrypted', data: await encryptAccounts(selected.accounts, protection.key, protection.salt) }
      }
    }
    if (protection && state.journal?.rekey?.targetId === candidateId) protection.recoveryPasswords = [password]
    await this.commit(selected, state, !state.remote.length, protection, true)
    if (protection) await this.remember(protection.key, protection.salt)
    else await this.lock()
  }
}
export const vault = new VaultService()
