import { describe, expect, test } from 'bun:test'
import type { Account } from '../src/types'
import { ImportExportManager } from '../src/utils/import-export'
import { VAULT_KEY, VaultService, type VaultRecord } from '../src/utils/vault'
import { deriveKey, encryptAccounts, fromBase64, newSalt, toBase64 } from '../src/utils/vault-crypto'
import { securityError, securityStrings } from '../src/locales/security'
import { LANGUAGE_CONFIGS } from '../src/locales'
import { MIGRATION_PREFIX, V2_KEY, type SyncRecord } from '../src/utils/vault-sync'
import { MemoryVaultStorage } from './fixtures/vault-memory'
import { VaultService as StoreVault } from './fixtures/store-2.3.9/vault'

const oldPassword = 'synthetic-rekey-original'
const newPassword = 'synthetic-rekey-replacement'
const thirdPassword = 'synthetic-rekey-third'
const unrelatedPassword = 'synthetic-rekey-unrelated'
const legacyAccounts: Account[] = [
  { name: 'Original account', secret: 'A'.repeat(32), website: 'original.example.test' },
  { name: 'Original Steam', secret: 'B'.repeat(32), type: 'steam' },
]
const currentAccounts: Account[] = [
  { name: 'SHA256 eight digits', secret: 'C'.repeat(32), algorithm: 'SHA256', digits: 8, period: 45,
    website: 'current.example.test' },
  { name: 'SHA512 slow', secret: 'D'.repeat(32), algorithm: 'SHA512', digits: 8, period: 120 },
]
const historicalAccounts: Account[] = [
  { name: 'Only in recovery history', secret: 'E'.repeat(32), algorithm: 'SHA256', digits: 8, period: 60,
    website: 'history.example.test' },
]

async function restore(text: string, password?: string): Promise<Account[]> {
  const result = await ImportExportManager.importAccounts(new File([text], 'rekey-recovery.json'), [], password)
  expect(result.invalidCount).toBe(0)
  expect(result.duplicateCount).toBe(0)
  return result.newAccounts
}

async function encryptedRecord(id: string, accounts: Account[], password = oldPassword): Promise<VaultRecord> {
  const salt = newSalt(), key = await deriveKey(password, salt)
  return { version: 2, revision: id, mode: 'encrypted', data: await encryptAccounts(accounts, key, salt) }
}

async function migratedVault() {
  const storage = new MemoryVaultStorage({ accounts: legacyAccounts })
  const published = new StoreVault(storage)
  await published.protect('enable', '', oldPassword, (await published.snapshot()).revision)
  expect(storage.data[VAULT_KEY]).toMatchObject({ version: 1, mode: 'encrypted', data: { version: 1 } })
  const service = new VaultService(storage)
  await service.migrate((await service.snapshot()).revision)
  return { storage, service }
}

async function addHistory(storage: MemoryVaultStorage, password = oldPassword): Promise<SyncRecord> {
  const history: SyncRecord = {
    id: 'synthetic-historical-branch', vector: { historicalDevice: 1 }, recoveryOnly: true,
    record: await encryptedRecord('synthetic-historical-branch', historicalAccounts, password),
  }
  storage.local!.conflicts.push(history)
  return history
}

// Inspect the raw bundle too: the public candidate list can de-duplicate records
// by ID and otherwise hide a stale ciphertext in a second storage location.
function recordsIn(value: unknown): VaultRecord[] {
  if (!value || typeof value !== 'object') return []
  const record = value as Partial<VaultRecord>
  if ((record.version === 1 || record.version === 2) &&
      (record.mode === 'encrypted' || record.mode === 'plain') && typeof record.revision === 'string') {
    return [record as VaultRecord]
  }
  return Object.values(value).flatMap(recordsIn)
}

async function expectAllInternalCopiesRekeyed(
  service: VaultService, password: string, rejectedPasswords: string[], expectedContents: Account[][],
) {
  const candidates = (await service.recoveryState()).candidates
  expect(candidates.length).toBeGreaterThan(0)
  const backups: string[] = []
  for (const candidate of candidates) {
    expect(candidate.protected).toBe(true)
    backups.push(await service.recoveryBackup(candidate.id))
  }
  const bundle = await service.recoveryBackup()
  for (const record of recordsIn(JSON.parse(bundle))) {
    expect(record.mode).toBe('encrypted')
    if (record.mode === 'encrypted') backups.push(JSON.stringify(record.data))
  }
  for (const accounts of expectedContents) for (const account of accounts) expect(bundle).not.toContain(account.secret)

  const recovered: Account[][] = []
  // Identical serialized copies need only be decrypted once. This deliberately
  // does not deduplicate by record ID, salt, or account names.
  for (const backup of new Set(backups.map(value => JSON.stringify(JSON.parse(value))))) {
    for (const rejected of rejectedPasswords) await expect(restore(backup, rejected)).rejects.toThrow('passwordError')
    const accounts = await restore(backup, password)
    expect(expectedContents).toContainEqual(accounts)
    recovered.push(accounts)
  }
  for (const expected of expectedContents) expect(recovered).toContainEqual(expected)
}

function savedStorage(storage: MemoryVaultStorage) {
  return structuredClone({ data: storage.data, local: storage.local, session: storage.session })
}

async function expectNoWritesOnRejection(
  storage: MemoryVaultStorage, service: VaultService, action: 'enable' | 'change', password: string, nextPassword: string,
) {
  const revision = (await service.snapshot()).revision
  const before = savedStorage(storage), writes: string[] = []
  const write = storage.write.bind(storage), cleanup = storage.cleanup.bind(storage), session = storage.setSession.bind(storage)
  const remote = storage.sync.write, local = storage.sync.writeLocal, remove = storage.sync.removeCandidates
  storage.write = async value => { writes.push('legacy'); await write(value) }
  storage.cleanup = async () => { writes.push('cleanup'); await cleanup() }
  storage.setSession = async value => { writes.push('session'); await session(value) }
  storage.sync.write = async (value, migration) => { writes.push('remote'); await remote(value, migration) }
  storage.sync.writeLocal = async value => { writes.push('local'); await local(value) }
  storage.sync.removeCandidates = async ids => { writes.push('removeCandidates'); await remove(ids) }
  await expect(service.protect(action, password, nextPassword, revision)).rejects.toThrow('recoveryPasswordRequired')
  expect(writes).toEqual([])
  expect(savedStorage(storage)).toEqual(before)
}

async function expectRecoverablePasswordBranches(storage: MemoryVaultStorage, oldId: string, accounts: Account[]) {
  const restarted = new VaultService(storage)
  const newId = storage.local!.pending!.id
  expect(newId).not.toBe(oldId)
  expect(await restarted.snapshot()).toMatchObject({ protected: true, locked: true, syncState: 'pending', accounts: [] })
  const oldBackup = await restarted.recoveryBackup(oldId), newBackup = await restarted.recoveryBackup(newId)
  expect(await restore(oldBackup, oldPassword)).toEqual(accounts)
  expect(await restore(newBackup, newPassword)).toEqual(accounts)
  await expect(restore(oldBackup, newPassword)).rejects.toThrow('passwordError')
  await expect(restore(newBackup, oldPassword)).rejects.toThrow('passwordError')
  return { restarted, newId }
}

describe('password rotation rekeys every internal recovery copy', () => {
  test('encrypted V1 migration, edits, change and lock revoke the old password without losing account parameters', async () => {
    const { storage, service } = await migratedVault()
    // A file already exported to the user is outside the internal rekey scope.
    const externalBackup = await service.backup(false, '')
    await service.save(currentAccounts, (await service.snapshot()).revision)
    await service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision)
    await service.lock()
    expect(await service.snapshot()).toMatchObject({ protected: true, locked: true, accounts: [] })
    await expect(service.unlock(oldPassword)).rejects.toThrow('passwordError')
    await expectAllInternalCopiesRekeyed(new VaultService(storage), newPassword, [oldPassword], [legacyAccounts, currentAccounts])
    await service.unlock(newPassword)
    expect((await service.snapshot()).accounts).toEqual(currentAccounts)
    expect(await restore(externalBackup, oldPassword)).toEqual(legacyAccounts)
  }, 30_000)

  test('consecutive password changes revoke every earlier password in the full recovery bundle', async () => {
    const { service } = await migratedVault()
    await service.save(currentAccounts, (await service.snapshot()).revision)
    await service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision)
    await service.lock()
    await service.unlock(newPassword)
    await service.protect('change', newPassword, thirdPassword, (await service.snapshot()).revision)
    await service.lock()
    await expectAllInternalCopiesRekeyed(service, thirdPassword, [oldPassword, newPassword], [legacyAccounts, currentAccounts])
    await service.unlock(thirdPassword)
    expect((await service.snapshot()).accounts).toEqual(currentAccounts)
  }, 30_000)

  test('unique archived accounts survive re-encryption instead of being removed or replaced with the current accounts', async () => {
    const { storage, service } = await migratedVault()
    await service.save(currentAccounts, (await service.snapshot()).revision)
    const history = await addHistory(storage)
    await service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision)
    await service.lock()
    expect(await restore(await service.recoveryBackup(history.id), newPassword)).toEqual(historicalAccounts)
    await expectAllInternalCopiesRekeyed(service, newPassword, [oldPassword], [legacyAccounts, currentAccounts, historicalAccounts])
  }, 30_000)

  for (const location of ['legacy', 'conflicts'] as const) {
    for (const problem of ['different password', 'corrupt ciphertext'] as const) {
      test(`${location} with ${problem} rejects a password change before any persistent or session write`, async () => {
        const { storage, service } = await migratedVault()
        const history = await addHistory(storage, problem === 'different password' ? unrelatedPassword : oldPassword)
        if (problem === 'corrupt ciphertext' && history.record.mode === 'encrypted') {
          const bytes = fromBase64(history.record.data.ciphertext)
          bytes[0] ^= 1
          history.record.data.ciphertext = toBase64(bytes)
        }
        if (location === 'legacy') {
          storage.local!.legacy = history.record
          storage.local!.conflicts = []
        }
        await expectNoWritesOnRejection(storage, service, 'change', oldPassword, newPassword)
        expect((await service.snapshot()).accounts).toEqual(legacyAccounts)
      }, 30_000)
    }
  }

  test('a dominated remote copy using a different password also rejects rotation without writes', async () => {
    const { storage, service } = await migratedVault()
    const older = structuredClone(storage.local!.current!)
    await service.save(currentAccounts, (await service.snapshot()).revision)
    older.record = await encryptedRecord(older.id, historicalAccounts, unrelatedPassword)
    storage.data[MIGRATION_PREFIX + older.id] = older
    await expectNoWritesOnRejection(storage, service, 'change', oldPassword, newPassword)
  }, 30_000)

  for (const failure of ['throw', 'silent no-op'] as const) {
    test(`a ${failure} on the final local write reports failure and retains recoverable old and new branches`, async () => {
      const { storage, service } = await migratedVault()
      const history = await addHistory(storage)
      const oldId = storage.local!.current!.id
      const write = storage.sync.writeLocal
      let localWrites = 0
      storage.sync.writeLocal = async journal => {
        if (++localWrites === 2) {
          if (failure === 'throw') throw new Error('synthetic-final-local-failure')
          return
        }
        await write(journal)
      }
      await expect(service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision)).rejects.toThrow()
      expect(localWrites).toBe(2)
      const { restarted, newId } = await expectRecoverablePasswordBranches(storage, oldId, legacyAccounts)
      expect(await restore(await restarted.recoveryBackup(history.id), oldPassword)).toEqual(historicalAccounts)
      storage.sync.writeLocal = write
      await restarted.resolve(newId, (await restarted.recoveryState()).revision, newPassword)
      await restarted.lock()
      await restarted.unlock(newPassword)
      expect((await restarted.snapshot()).accounts).toEqual(legacyAccounts)
      // Selecting the prepared replacement completes that rekey transaction,
      // including its historical copies, rather than merely unlocking the head.
      await expectAllInternalCopiesRekeyed(restarted, newPassword, [oldPassword], [legacyAccounts, historicalAccounts])
    }, 30_000)
  }

  test('silently retaining dominated migration ciphertext cannot report a successful password change', async () => {
    const { storage, service } = await migratedVault()
    const oldId = storage.local!.current!.id
    const migrationKey = MIGRATION_PREFIX + oldId
    const oldCiphertext = structuredClone(storage.data[migrationKey])
    storage.sync.removeCandidates = async () => {}
    await expect(service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision)).rejects.toThrow()
    expect(storage.data[migrationKey]).toEqual(oldCiphertext)
    await expectRecoverablePasswordBranches(storage, oldId, legacyAccounts)
  }, 30_000)

  test('rolling back a failed change preserves both passwords and retrying the same replacement rekeys both branches', async () => {
    const { storage, service } = await migratedVault()
    await service.save(currentAccounts, (await service.snapshot()).revision)
    await addHistory(storage)
    const oldId = storage.local!.current!.id, write = storage.sync.write
    storage.sync.write = async () => { throw new Error('synthetic-publish-failure') }
    await expect(service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision))
      .rejects.toThrow('synthetic-publish-failure')
    const { restarted, newId } = await expectRecoverablePasswordBranches(storage, oldId, currentAccounts)
    storage.sync.write = write
    await restarted.resolve(oldId, (await restarted.recoveryState()).revision, oldPassword)
    await restarted.lock()
    await restarted.unlock(oldPassword)
    expect((await restarted.snapshot()).accounts).toEqual(currentAccounts)
    expect(await restore(await restarted.recoveryBackup(newId), newPassword)).toEqual(currentAccounts)
    // Rollback intentionally retains the encrypted replacement branch. Its known
    // password must not make an otherwise valid retry permanently impossible.
    await restarted.protect('change', oldPassword, newPassword, (await restarted.snapshot()).revision)
    await restarted.lock()
    await expectAllInternalCopiesRekeyed(restarted, newPassword, [oldPassword],
      [legacyAccounts, currentAccounts, historicalAccounts])
  }, 30_000)

  test('silently retaining legacy plaintext during cleanup cannot report a successful password change', async () => {
    const { storage, service } = await migratedVault()
    const oldId = storage.local!.current!.id
    // Simulate a legacy write racing cleanup: no-op cleanup must not report success.
    storage.cleanup = async () => {
      storage.data.accounts = structuredClone(legacyAccounts)
      storage.data.state = { formVisible: true, secretValue: legacyAccounts[0].secret }
    }
    await expect(service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision)).rejects.toThrow()
    expect(storage.data.accounts).toEqual(legacyAccounts)
    await expectRecoverablePasswordBranches(storage, oldId, legacyAccounts)
  }, 30_000)

  test('untracked legacy plaintext is preserved and blocks rotation before writing', async () => {
    const { storage, service } = await migratedVault()
    storage.data.accounts = structuredClone(historicalAccounts)
    const before = savedStorage(storage)
    await expect(service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision)).rejects.toThrow('syncConflict')
    expect(savedStorage(storage)).toEqual(before)
  }, 30_000)

  test('with no local journal, unique dominated remote accounts are saved before their source is deleted', async () => {
    const historical: SyncRecord = { id: 'synthetic-remote-history', vector: { remote: 1 },
      record: await encryptedRecord('synthetic-remote-history', historicalAccounts) }
    const current: SyncRecord = { id: 'synthetic-remote-current', vector: { remote: 2 },
      record: await encryptedRecord('synthetic-remote-current', currentAccounts) }
    const storage = new MemoryVaultStorage({
      [V2_KEY]: current, [MIGRATION_PREFIX + historical.id]: historical,
      [VAULT_KEY]: { version: 2, revision: current.id, mode: 'migrated', target: V2_KEY },
    })
    const service = new VaultService(storage), remove = storage.sync.removeCandidates
    expect(storage.local).toBeUndefined()
    let checkedBeforeDeletion = false
    storage.sync.removeCandidates = async ids => {
      if (ids.includes(historical.id)) {
        const durableCopy = recordsIn(storage.local).find(record => record.revision === historical.id)
        expect(durableCopy?.mode).toBe('encrypted')
        if (!durableCopy || durableCopy.mode !== 'encrypted') throw new Error('missing durable history')
        expect(await restore(JSON.stringify(durableCopy.data), oldPassword)).toEqual(historicalAccounts)
        checkedBeforeDeletion = true
      }
      await remove(ids)
    }
    await service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision)
    expect(checkedBeforeDeletion).toBe(true)
    expect(storage.data[MIGRATION_PREFIX + historical.id]).toBeUndefined()
    await service.lock()
    await expectAllInternalCopiesRekeyed(service, newPassword, [oldPassword], [currentAccounts, historicalAccounts])
  }, 30_000)
})

describe('enabling protection cannot bypass encrypted recovery history', () => {
  test('disable then enable with a different password fails closed without changing storage', async () => {
    const { storage, service } = await migratedVault()
    await service.protect('disable', oldPassword, '', (await service.snapshot()).revision)
    await expectNoWritesOnRejection(storage, service, 'enable', '', newPassword)
    expect((await service.snapshot()).accounts).toEqual(legacyAccounts)
  }, 30_000)

  test('re-enable with the historical password then change it rekeys all retained history', async () => {
    const { service } = await migratedVault()
    await service.save(currentAccounts, (await service.snapshot()).revision)
    await service.protect('disable', oldPassword, '', (await service.snapshot()).revision)
    await service.protect('enable', '', oldPassword, (await service.snapshot()).revision)
    await service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision)
    await service.lock()
    await expectAllInternalCopiesRekeyed(service, newPassword, [oldPassword], [legacyAccounts, currentAccounts])
    await service.unlock(newPassword)
    expect((await service.snapshot()).accounts).toEqual(currentAccounts)
  }, 30_000)
})


test('all languages explain recovery-password preflight rejection without suggesting deletion', () => {
  const english = securityError('en-US', new Error('recoveryPasswordRequired'))
  for (const { code } of LANGUAGE_CONFIGS) {
    const message = securityError(code, new Error('recoveryPasswordRequired'))
    expect(message.length).toBeGreaterThan(10)
    expect(message).toBe(securityError(code, 'recoveryPasswordRequired'))
    expect(message).not.toBe(securityStrings(code).storageError)
    if (code !== 'en-US') expect(message).not.toBe(english)
    expect(securityError(code, new Error('passwordError'))).toBe(securityStrings(code).passwordError)
  }
  expect(securityError('unknown', new Error('recoveryPasswordRequired'))).toBe(english)
})

for (const stage of ['prepare throw', 'prepare no-op', 'publish', 'guard throw', 'guard no-op', 'cleanup', 'remove candidates'] as const) {
  test(`password rotation failure at ${stage} never reports success or loses original recovery contents`, async () => {
    const { storage, service } = await migratedVault()
    const history = await addHistory(storage)
    const before = savedStorage(storage)
    if (stage === 'prepare throw') storage.sync.writeLocal = async () => { throw new Error('synthetic-prepare') }
    if (stage === 'prepare no-op') storage.sync.writeLocal = async () => {}
    if (stage === 'publish') storage.sync.write = async () => { throw new Error('quota') }
    if (stage === 'guard throw') storage.write = async () => { throw new Error('synthetic-guard') }
    if (stage === 'guard no-op') storage.write = async () => {}
    if (stage === 'cleanup') storage.cleanup = async () => { throw new Error('synthetic-cleanup') }
    if (stage === 'remove candidates') storage.sync.removeCandidates = async () => { throw new Error('synthetic-removal') }
    await expect(service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision)).rejects.toThrow()
    expect(await restore(await service.recoveryBackup(history.id), oldPassword)).toEqual(historicalAccounts)
    if (stage.startsWith('prepare')) expect(savedStorage(storage)).toEqual(before)
    else await expectRecoverablePasswordBranches(storage, before.local!.current!.id, legacyAccounts)
  }, 30_000)
}
