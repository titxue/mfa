import type { Account } from '@/types'
import type { VaultRecord, VaultSnapshot, VaultStorage } from './vault'
import { accountDataVersion, decryptAccounts, deriveKey, encryptAccounts, newSalt, validateAccounts, validateEncrypted } from './vault-crypto'

export const LEGACY_RECOVERY_KEY = 'accountVaultLegacyRecovery'
type LegacyRecord = VaultRecord & { version: 1 }
type Copy = { id: string; record: LegacyRecord }
/** Independent of the V2 causal journal. Never prune history implicitly. */
export interface LegacyJournal {
  format: 'mfa-legacy-recovery'
  version: 1
  phase: 'prepared' | 'ready'
  source: string
  target: string
  intermediate?: string
  targetId: string
  backend: 'accounts' | 'accountVault'
  copies: Copy[]
  checksum: string
}
export interface LegacyState {
  raw: Record<string, unknown>
  journal?: LegacyJournal
  record?: LegacyRecord
  backend: 'accounts' | 'accountVault'
  copies: Copy[]
  state: 'ready' | 'pending' | 'conflict'
}
export const canonicalLegacy = (value: unknown): string => {
  if (Array.isArray(value)) return '[' + value.map(canonicalLegacy).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().filter(k => (value as Record<string, unknown>)[k] !== undefined)
    .map(k => JSON.stringify(k) + ':' + canonicalLegacy((value as Record<string, unknown>)[k])).join(',') + '}'
  return JSON.stringify(value)
}
export async function legacyFingerprint(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalLegacy(value)))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
const normalized = (raw: Record<string, unknown>) => Object.fromEntries(Object.entries(raw).filter(([, value]) => value != null))
function validateRecord(value: unknown): asserts value is LegacyRecord {
  const v = value as LegacyRecord
  if (!v || v.version !== 1 || typeof v.revision !== 'string' || !v.revision ||
    Object.keys(v).some(key => !(v.mode === 'plain' ? ['version', 'revision', 'mode', 'accounts'] : ['version', 'revision', 'mode', 'data']).includes(key))) throw new Error('invalid')
  if (v.mode === 'plain') validateAccounts(v.accounts)
  else if (v.mode === 'encrypted') {
    validateEncrypted(v.data)
    if (v.data.version !== 1 || Object.keys(v.data).some(key => !['format', 'version', 'kdf', 'iterations', 'salt', 'iv', 'ciphertext'].includes(key))) throw new Error('invalid')
  }
  else throw new Error('invalid')
}
const compatible = (accounts: Account[]) => {
  validateAccounts(accounts)
  if (accountDataVersion(accounts) !== 1) throw new Error('legacyUnsupported')
}
const unique = (copies: Copy[]) => [...new Map(copies.map(copy => [copy.id, copy])).values()]
const complete = async (journal: Omit<LegacyJournal, 'checksum'>): Promise<LegacyJournal> => ({ ...journal, checksum: await legacyFingerprint(journal) })

/** Unknown journals/sources fail closed; inspection has no side effects. */
export async function inspectLegacy(rawValue: Record<string, unknown>, journalValue: unknown): Promise<LegacyState> {
  const raw = normalized(rawValue)
  if (Object.keys(raw).some(key => !['accounts', 'accountVault'].includes(key))) throw new Error('invalid')
  let journal: LegacyJournal | undefined
  if (journalValue != null) {
    const j = journalValue as LegacyJournal
    if (!j || Object.keys(j).some(key => !['format', 'version', 'phase', 'source', 'target', 'intermediate', 'targetId', 'backend', 'copies', 'checksum'].includes(key)) ||
      j.format !== 'mfa-legacy-recovery' || j.version !== 1 || !['ready', 'prepared'].includes(j.phase) ||
      !['accounts', 'accountVault'].includes(j.backend) || !Array.isArray(j.copies) || !j.copies.length ||
      ![j.source, j.target, j.checksum].every(value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)) ||
      (j.intermediate !== undefined && !/^[a-f0-9]{64}$/.test(j.intermediate))) throw new Error('invalid')
    for (const copy of j.copies) {
      if (!copy || Object.keys(copy).some(key => !['id', 'record'].includes(key)) || typeof copy.id !== 'string' || !copy.id) throw new Error('invalid')
      validateRecord(copy.record)
    }
    if (new Set(j.copies.map(copy => copy.id)).size !== j.copies.length || !j.copies.some(copy => copy.id === j.targetId)) throw new Error('invalid')
    const target = j.copies.find(copy => copy.id === j.targetId)!.record
    if (j.backend === 'accounts' && target.mode !== 'plain') throw new Error('invalid')
    const targetRaw = j.backend === 'accounts' ? { accounts: (target as Extract<LegacyRecord, { mode: 'plain' }>).accounts } : { accountVault: target }
    if (j.target !== await legacyFingerprint(targetRaw)) throw new Error('invalid')
    const { checksum, ...body } = j
    if (checksum !== await legacyFingerprint(body)) throw new Error('invalid')
    journal = j
  }
  const copies: Copy[] = []
  let record: LegacyRecord | undefined
  if (raw.accounts !== undefined) {
    validateAccounts(raw.accounts)
    record = { version: 1, revision: 'legacy', mode: 'plain', accounts: raw.accounts }
    copies.push({ id: 'legacy:' + await legacyFingerprint(record), record })
  }
  if (raw.accountVault !== undefined) {
    validateRecord(raw.accountVault)
    record = raw.accountVault
    copies.push({ id: 'legacy:' + await legacyFingerprint(record), record })
  }
  const observed = await legacyFingerprint(raw)
  // Only our exact durable wrapping checkpoint explains two simultaneous sources.
  if (copies.length > 1 && !(journal?.phase === 'prepared' && [journal.source, journal.intermediate].includes(observed))) throw new Error('invalid')
  if (!record && !journal) throw new Error('invalid')
  // During our checkpoint, the journal already preserves the exact observed source's
  // account set (possibly re-encrypted). Do not reintroduce its old ciphertext.
  const checkpointMatches = journal?.phase === 'prepared' && [journal.source, journal.target, journal.intermediate].includes(observed)
  const observedCopies = checkpointMatches ? [] : copies.map(copy => journal?.copies.some(old => old.id === copy.id && canonicalLegacy(old) !== canonicalLegacy(copy))
    ? { ...copy, id: 'observed:' + copy.id } : copy)
  return { raw, journal, record, backend: raw.accountVault !== undefined ? 'accountVault' : 'accounts',
    copies: unique([...(journal?.copies ?? []), ...observedCopies]),
    state: journal?.phase === 'prepared' ? [journal.source, journal.target, journal.intermediate].includes(observed) ? 'pending' : 'conflict'
      : !record ? 'conflict' : record.mode === 'encrypted' && journal?.copies.some(copy => copy.record.mode === 'plain') ? 'pending' : 'ready' }
}

export interface LegacyContext { revision: string; raw: Record<string, unknown>; legacyMode?: LegacyState }
type Protection = { key?: CryptoKey; salt?: string; passwords: string[] }

/** Old-client-compatible writes with local, read-back-verified recovery checkpoints.
 * Chrome Sync has no CAS: comparison/write and comparison/remove gaps remain.
 */
export class LegacyVaultService {
  constructor(private storage: VaultStorage, private read: () => Promise<LegacyContext>) {}
  private async expected(revision: string, allowPending = false) {
    const current = await this.read()
    if (current.revision !== revision) throw new Error('conflict')
    const state = current.legacyMode
    if (!state) throw new Error('syncPending')
    if (!allowPending && state.state !== 'ready') throw new Error(state.state === 'conflict' ? 'syncConflict' : 'syncPending')
    return state
  }
  private async key(record: LegacyRecord) {
    const session = await this.storage.getSession()
    if (record.mode !== 'encrypted' || !session || session.salt !== record.data.salt) {
      if (session) await this.storage.setSession()
      return undefined
    }
    return crypto.subtle.importKey('jwk', session.key, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
  }
  private async accounts(record: LegacyRecord) {
    if (record.mode === 'plain') return record.accounts
    const key = await this.key(record)
    if (!key) throw new Error('locked')
    try { return await decryptAccounts(record.data, key) }
    catch (error) { await this.storage.setSession(); throw error }
  }
  async snapshot(context: LegacyContext): Promise<VaultSnapshot> {
    const state = context.legacyMode!
    const base = { revision: context.revision, storageMode: 'legacy' as const,
      protected: state.record?.mode === 'encrypted' || state.copies.some(copy => copy.record.mode === 'encrypted') }
    if (state.state !== 'ready') return { ...base, accounts: [], locked: true, syncState: state.state }
    const record = state.record!
    const locked = record.mode === 'encrypted' && !(await this.key(record))
    return { ...base, protected: record.mode === 'encrypted', locked, accounts: locked ? [] : await this.accounts(record) }
  }
  private async verify(record: LegacyRecord, password: string) {
    if (record.mode !== 'encrypted') throw new Error('conflict')
    const key = await deriveKey(password, record.data.salt)
    await decryptAccounts(record.data, key)
    return key
  }
  private async remember(key: CryptoKey, salt: string) {
    await this.storage.setSession({ salt, key: await crypto.subtle.exportKey('jwk', key) })
  }
  async unlock(password: string, revision: string) {
    const state = await this.expected(revision), record = state.record!
    const key = await this.verify(record, password)
    await this.expected(revision)
    if (record.mode === 'encrypted') await this.remember(key, record.data.salt)
  }
  /** Preflight every retained version, with zero persistent writes on any failure. */
  private async transform(copies: Copy[], protection: Protection): Promise<Copy[]> {
    const keys = new Map<string, Promise<CryptoKey>>()
    return Promise.all(copies.map(async copy => {
      let accounts: Account[] | undefined
      if (copy.record.mode === 'plain') accounts = copy.record.accounts
      else {
        const data = copy.record.data
        if (protection.key && data.salt === protection.salt) {
          try { accounts = await decryptAccounts(data, protection.key) } catch { /* Try supplied historical passwords. */ }
        }
        for (const [index, password] of protection.passwords.entries()) {
          if (accounts) break
          const id = index + ':' + data.salt
          if (!keys.has(id)) keys.set(id, deriveKey(password, data.salt))
          try { accounts = await decryptAccounts(data, await keys.get(id)!) } catch { /* Fail closed below. */ }
        }
        if (!accounts) throw new Error('recoveryPasswordRequired')
      }
      compatible(accounts)
      if (!protection.key) return { id: copy.id, record: { version: 1, revision: copy.record.revision, mode: 'plain', accounts } }
      const data = await encryptAccounts(accounts, protection.key, protection.salt!)
      await decryptAccounts(data, protection.key)
      return { id: copy.id, record: { version: 1, revision: copy.record.revision, mode: 'encrypted', data } }
    }))
  }
  private async writeJournal(value: LegacyJournal) {
    if (!this.storage.writeLegacyJournal || !this.storage.readLegacyJournal) throw new Error('storageError')
    await this.storage.writeLegacyJournal(value)
    if (canonicalLegacy(await this.storage.readLegacyJournal()) !== canonicalLegacy(value)) throw new Error('storageError')
  }
  private async commit(record: LegacyRecord, revision: string, protection?: Protection, resolving = false) {
    const state = await this.expected(revision, resolving)
    if (!this.storage.writeLegacyJournal || !this.storage.readLegacyJournal) throw new Error('storageError')
    const backend = state.backend === 'accounts' && record.mode === 'plain' && !protection?.key ? 'accounts' : 'accountVault'
    if (backend === 'accounts' && !this.storage.writeAccounts) throw new Error('storageError')
    let copies = unique([...state.copies, { id: crypto.randomUUID(), record }])
    const targetId = copies[copies.length - 1].id
    if (protection) copies = await this.transform(copies, protection)
    const target = copies.find(copy => copy.id === targetId)!.record
    const rawTarget = backend === 'accounts' ? { accounts: (target as Extract<LegacyRecord, { mode: 'plain' }>).accounts } : { accountVault: target }
    const intermediate = backend === 'accountVault' && state.raw.accounts !== undefined ? { ...state.raw, accountVault: target } : undefined
    const journal = await complete({ format: 'mfa-legacy-recovery', version: 1, phase: 'prepared',
      source: await legacyFingerprint(state.raw), target: await legacyFingerprint(rawTarget),
      ...(intermediate ? { intermediate: await legacyFingerprint(intermediate) } : {}), backend, targetId, copies })
    await this.expected(revision, resolving)
    await this.writeJournal(journal)
    // Detect observed V2 arrivals, source changes, and overwritten journals before touching sync.
    const prepared = await this.read()
    if (!prepared.legacyMode || canonicalLegacy(prepared.legacyMode.journal) !== canonicalLegacy(journal) ||
      canonicalLegacy(prepared.legacyMode.raw) !== canonicalLegacy(state.raw)) throw new Error('conflict')
    if (backend === 'accounts') await this.storage.writeAccounts!((target as Extract<LegacyRecord, { mode: 'plain' }>).accounts)
    else await this.storage.write(target)
    let checked = await this.read()
    if (!checked.legacyMode || canonicalLegacy(checked.legacyMode.journal) !== canonicalLegacy(journal) ||
      canonicalLegacy(checked.legacyMode.raw) !== canonicalLegacy(intermediate ?? rawTarget)) throw new Error('conflict')
    if (intermediate) {
      // cleanup compares the complete snapshot and only removes its observed keys.
      await this.storage.cleanup(checked.raw)
      checked = await this.read()
    }
    if (!checked.legacyMode || canonicalLegacy(checked.legacyMode.journal) !== canonicalLegacy(journal) ||
      canonicalLegacy(checked.legacyMode.raw) !== canonicalLegacy(rawTarget)) throw new Error('conflict')
    const { checksum: _checksum, ...body } = journal
    const ready = await complete({ ...body, phase: 'ready' })
    await this.writeJournal(ready)
    const final = await this.read()
    if (!final.legacyMode || final.legacyMode.state !== 'ready' ||
      canonicalLegacy(final.legacyMode.raw) !== canonicalLegacy(rawTarget) ||
      canonicalLegacy(final.legacyMode.journal) !== canonicalLegacy(ready)) throw new Error('conflict')
  }
  async save(accounts: Account[], revision: string) {
    compatible(accounts)
    const state = await this.expected(revision), old = state.record!
    const key = await this.key(old)
    if (old.mode === 'encrypted' && !key) throw new Error('locked')
    if (old.mode === 'encrypted') await decryptAccounts(old.data, key!)
    const record: LegacyRecord = old.mode === 'encrypted'
      ? { version: 1, revision: crypto.randomUUID(), mode: 'encrypted', data: await encryptAccounts(accounts, key!, old.data.salt) }
      : { version: 1, revision: crypto.randomUUID(), mode: 'plain', accounts }
    await this.commit(record, revision)
  }
  async protect(action: 'enable' | 'change' | 'disable', password: string, nextPassword: string, revision: string) {
    const state = await this.expected(revision), old = state.record!
    let accounts: Account[]
    if (action === 'enable') {
      if (old.mode !== 'plain') throw new Error('conflict')
      accounts = old.accounts
    } else accounts = await decryptAccounts((old as Extract<LegacyRecord, { mode: 'encrypted' }>).data, await this.verify(old, password))
    compatible(accounts)
    const plain: LegacyRecord = { version: 1, revision: crypto.randomUUID(), mode: 'plain', accounts }
    if (action === 'disable') {
      await this.commit(plain, revision, { passwords: [password] })
      await this.storage.setSession()
    } else {
      if (nextPassword.length < 8) throw new Error('passwordLength')
      const salt = newSalt(), key = await deriveKey(nextPassword, salt)
      await this.commit(plain, revision, { key, salt, passwords: action === 'change' ? [password, nextPassword] : [nextPassword] })
      await this.remember(key, salt)
    }
  }
  async backup(plain: boolean, password: string, revision: string) {
    const state = await this.expected(revision), record = state.record!
    const accounts = await this.accounts(record)
    if (record.mode === 'encrypted' && plain) await this.verify(record, password)
    await this.expected(revision)
    return JSON.stringify(record.mode === 'encrypted' && !plain ? record.data : { version: '1.0', timestamp: new Date().toISOString(), accounts }, null, 2)
  }
  async resolve(candidateId: string, revision: string, password: string) {
    const state = await this.expected(revision, true)
    const selected = state.copies.find(copy => copy.id === candidateId)?.record
    if (!selected) throw new Error('invalid')
    let record = selected
    const protectedRecord = selected.mode === 'encrypted' ? selected : state.copies.find(copy => copy.record.mode === 'encrypted')?.record
    let key: CryptoKey | undefined
    if (protectedRecord?.mode === 'encrypted') {
      key = await this.verify(protectedRecord, password)
      const accounts = selected.mode === 'encrypted' ? await decryptAccounts(selected.data, key) : selected.accounts
      compatible(accounts)
      record = { version: 1, revision: crypto.randomUUID(), mode: 'encrypted', data: await encryptAccounts(accounts, key, protectedRecord.data.salt) }
    } else if (record.mode === 'plain') compatible(record.accounts)
    // Keep all other versions. Recovery selection is not a password rotation.
    await this.commit(record, revision, key && record.mode === 'encrypted' ? { key, salt: record.data.salt, passwords: [password] } : undefined, true)
    if (key && record.mode === 'encrypted') await this.remember(key, record.data.salt)
    else await this.storage.setSession()
  }
}
