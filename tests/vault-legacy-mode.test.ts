import { expect, test } from 'bun:test'
import type { Account } from '../src/types'
import { VaultService, VAULT_KEY } from '../src/utils/vault'
import { V2_KEY, MIGRATION_PREFIX } from '../src/utils/vault-sync'
import { legacyFingerprint, type LegacyJournal } from '../src/utils/vault-legacy'
import { decryptAccounts, deriveKey, encryptAccounts, newSalt, accountDataVersion } from '../src/utils/vault-crypto'
import { MemoryVaultStorage } from './fixtures/vault-memory'
import { VaultService as PublishedVault } from './fixtures/store-2.3.9/vault'
import { decryptAccounts as publishedDecrypt, deriveKey as publishedKey } from './fixtures/store-2.3.9/vault-crypto'
import { TOTP } from '../src/utils/totp'
import { ImportExportManager } from '../src/utils/import-export'
import { securityError } from '../src/locales/security'
import { LANGUAGE_CONFIGS } from '../src/locales'

const password = 'legacy-original-password', replacement = 'legacy-replacement-password'
const original: Account[] = [{ name: 'TOTP', secret: 'JBSWY3DPEHPK3PXP' }, { name: 'Steam', secret: 'AAAQEAYEAUDAOCAJBIFQYDIOB4IBCEQT', type: 'steam' }]
const edited = [{ ...original[0], name: 'Renamed', website: 'example.test' }, original[1]]
const persisted = (storage: MemoryVaultStorage) => structuredClone({ data: storage.data, local: storage.local, legacy: storage.legacyLocal })
const noV2 = (storage: MemoryVaultStorage) => {
  expect(storage.local).toBeUndefined()
  expect(Object.keys(storage.data).filter(key => key === V2_KEY || key.startsWith(MIGRATION_PREFIX))).toEqual([])
  if (storage.data[VAULT_KEY]) expect(storage.data[VAULT_KEY]).toHaveProperty('version', 1)
}
async function setup(mode: 'raw' | 'plain' | 'encrypted' = 'raw') {
  const storage = new MemoryVaultStorage({ accounts: original })
  if (mode !== 'raw') {
    const old = new PublishedVault(storage)
    const snapshot = await old.snapshot()
    if (mode === 'encrypted') await old.protect('enable', '', password, snapshot.revision)
  }
  storage.session = undefined
  return { storage, service: new VaultService(storage) }
}
async function reseal(journal: LegacyJournal) {
  const { checksum, ...body } = journal
  journal.checksum = await legacyFingerprint(body)
}

for (const mode of ['raw', 'plain', 'encrypted'] as const) {
  test(`${mode}: reads, unlock and code generation never create, migrate or clean account storage`, async () => {
    const { storage, service } = await setup(mode)
    const before = persisted(storage)
    const first = await service.snapshot()
    expect(first).toMatchObject({ storageMode: 'legacy', protected: mode === 'encrypted', locked: mode === 'encrypted' })
    expect(first.syncState).toBeUndefined()
    if (mode === 'encrypted') await service.unlock(password)
    const accounts = (await service.snapshot()).accounts
    expect(accounts).toEqual(original)
    for (const account of accounts) expect(await TOTP.generateTOTP(account.secret, 30, account.type, 59000)).toBeTruthy()
    await service.recoveryState()
    await service.backup(false, '')
    expect(persisted(storage)).toEqual(before)
  })

  test(`${mode}: add, rename, reorder, delete, import and backups stay in the legacy backend`, async () => {
    const { storage, service } = await setup(mode)
    if (mode === 'encrypted') await service.unlock(password)
    const addition = { name: 'Added', secret: original[0].secret }
    for (const accounts of [[...original, addition], [...edited, addition], [addition, ...edited].reverse(), [edited[0]], original]) {
      await service.save(accounts, (await service.snapshot()).revision)
      expect((await service.snapshot()).accounts).toEqual(accounts)
      noV2(storage)
      if (mode === 'raw') { expect(storage.data.accounts).toEqual(accounts); expect(storage.data[VAULT_KEY]).toBeUndefined() }
    }
    const backup = await service.backup(mode !== 'encrypted', mode === 'encrypted' ? password : '')
    const imported = await ImportExportManager.importAccounts(new File([backup], 'legacy.json'), [], mode === 'encrypted' ? password : undefined)
    expect(imported.newAccounts).toEqual(original)
    await service.save(imported.newAccounts, (await service.snapshot()).revision)
    expect(storage.legacyLocal?.phase).toBe('ready')
    const all = JSON.parse(await service.recoveryBackup())
    expect(all.legacyRecovery).toEqual(storage.legacyLocal)
    const before = persisted(storage)
    await expect(service.migrate((await service.snapshot()).revision)).rejects.toThrow('legacyHistoryMigration')
    expect(persisted(storage)).toEqual(before)
  })

  test(`${mode}: password enable/change/disable rekeys every retained copy and never switches to V2`, async () => {
    const { storage, service } = await setup(mode)
    if (mode === 'encrypted') await service.unlock(password)
    await service.save(edited, (await service.snapshot()).revision)
    if (mode !== 'encrypted') await service.protect('enable', '', password, (await service.snapshot()).revision)
    expect(storage.data.accounts).toBeUndefined()
    expect(JSON.stringify(persisted(storage))).not.toContain(original[0].secret)
    await service.protect('change', password, replacement, (await service.snapshot()).revision)
    noV2(storage)
    const copies = storage.legacyLocal!.copies.map(copy => copy.record)
    copies.push(storage.data[VAULT_KEY] as typeof copies[number])
    for (const copy of copies) {
      expect(copy.mode).toBe('encrypted')
      if (copy.mode !== 'encrypted') throw new Error('expected encrypted')
      expect(copy.data.version).toBe(1)
      await expect(decryptAccounts(copy.data, await deriveKey(password, copy.data.salt))).rejects.toThrow('passwordError')
      expect(await decryptAccounts(copy.data, await deriveKey(replacement, copy.data.salt))).toBeArray()
    }
    await service.lock()
    await expect(service.unlock(password)).rejects.toThrow('passwordError')
    await service.unlock(replacement)
    expect((await service.snapshot()).accounts).toEqual(edited)
    await service.protect('disable', replacement, '', (await service.snapshot()).revision)
    expect((await service.snapshot()).protected).toBe(false)
    expect(storage.legacyLocal!.copies.every(copy => copy.record.mode === 'plain')).toBe(true)
    noV2(storage)
  }, 30000)

  for (const params of [{ algorithm: 'SHA256' }, { algorithm: 'SHA512' }, { digits: 8 }, { period: 45 }] as const) {
    test(`${mode}: non-default ${JSON.stringify(params)} is rejected without a write`, async () => {
      const { storage, service } = await setup(mode)
      if (mode === 'encrypted') await service.unlock(password)
      const revision = (await service.snapshot()).revision, before = persisted(storage)
      await expect(service.save([{ ...original[0], ...params }], revision)).rejects.toThrow('legacyUnsupported')
      expect(persisted(storage)).toEqual(before)
    })
  }
}

test('published 2.3.9 can read and edit current plain/encrypted V1 TOTP and Steam data in both directions', async () => {
  for (const encrypted of [false, true]) {
    const { storage, service } = await setup('plain')
    await service.save(edited, (await service.snapshot()).revision)
    if (encrypted) await service.protect('enable', '', password, (await service.snapshot()).revision)
    const old = new PublishedVault(storage)
    await old.lock()
    if (encrypted) await old.unlock(password)
    const snapshot = await old.snapshot()
    expect(snapshot.accounts).toEqual(edited)
    for (const a of snapshot.accounts) {
      const b = (await service.snapshot()).accounts.find(account => account.name === a.name)!
      expect(await TOTP.generateTOTP(a.secret, 30, a.type, 59000)).toBe(await TOTP.generateTOTP(b.secret, 30, b.type, 59000))
    }
    if (encrypted) {
      const backup = JSON.parse(await service.backup(false, ''))
      expect(await publishedDecrypt(backup, await publishedKey(password, backup.salt))).toEqual(edited)
    }
    await old.save(original, snapshot.revision)
    expect((await service.snapshot()).accounts).toEqual(original)
    await service.save(edited, (await service.snapshot()).revision)
    expect((await old.snapshot()).accounts).toEqual(edited)
    noV2(storage)
  }
}, 30000)

test('observed old-client revision and same-revision content changes reject stale saves', async () => {
  const { storage, service } = await setup('plain')
  const stale = await service.snapshot()
  const old = new PublishedVault(storage)
  await old.save(edited, (await old.snapshot()).revision)
  const before = persisted(storage)
  await expect(service.save([], stale.revision)).rejects.toThrow('conflict')
  expect(persisted(storage)).toEqual(before)
  const observed = await service.snapshot()
  ;(storage.data[VAULT_KEY] as { accounts: Account[] }).accounts = original
  const changed = persisted(storage)
  await expect(service.save([], observed.revision)).rejects.toThrow('conflict')
  expect(persisted(storage)).toEqual(changed)
})

test('legacy journal changes participate in optimistic revision checks', async () => {
  const { storage, service } = await setup()
  await service.save(edited, (await service.snapshot()).revision)
  const stale = await service.snapshot()
  storage.legacyLocal!.copies.push({ id: 'other-history', record: { version: 1, revision: 'other', mode: 'plain', accounts: original } })
  await reseal(storage.legacyLocal!)
  const before = persisted(storage)
  await expect(service.save([], stale.revision)).rejects.toThrow('conflict')
  expect(persisted(storage)).toEqual(before)
})

for (const action of ['enable', 'change', 'disable'] as const) {
  test(`${action}: historical unknown password or corrupt ciphertext is a zero-write failure`, async () => {
    for (const corrupt of [false, true]) {
      const { storage, service } = await setup(action === 'enable' ? 'plain' : 'encrypted')
      if (action !== 'enable') await service.unlock(password)
      await service.save(edited, (await service.snapshot()).revision)
      const salt = newSalt(), key = await deriveKey('other-unavailable-password', salt)
      const data = await encryptAccounts(original, key, salt)
      if (corrupt) data.ciphertext = (data.ciphertext.startsWith('A') ? 'B' : 'A') + data.ciphertext.slice(1)
      storage.legacyLocal!.copies.push({ id: 'history-unknown', record: { version: 1, revision: 'history-unknown', mode: 'encrypted', data } })
      await reseal(storage.legacyLocal!)
      const revision = (await service.snapshot()).revision, before = persisted(storage)
      const session = structuredClone(storage.session)
      await expect(service.protect(action, action === 'enable' ? '' : password, replacement, revision)).rejects.toThrow('recoveryPasswordRequired')
      expect(persisted(storage)).toEqual(before)
      expect(storage.session).toEqual(session)
    }
  }, 30000)
}

for (const failure of ['prepare throws', 'prepare no-op', 'sync throws', 'sync no-op', 'finalize throws', 'finalize no-op'] as const) {
  test(`${failure}: no false success and reboot retains original/prepared legacy versions`, async () => {
    const { storage, service } = await setup()
    const originalWrite = storage.writeAccounts.bind(storage), journalWrite = storage.writeLegacyJournal.bind(storage)
    let writes = 0
    storage.writeLegacyJournal = async value => {
      writes++
      if (failure === 'prepare throws' && writes === 1 || failure === 'finalize throws' && writes === 2) throw new Error('storageError')
      if (failure === 'prepare no-op' && writes === 1 || failure === 'finalize no-op' && writes === 2) return
      await journalWrite(value)
    }
    storage.writeAccounts = async value => {
      if (failure === 'sync throws') throw new Error('storageError')
      if (failure === 'sync no-op') return
      await originalWrite(value)
    }
    await expect(service.save(edited, (await service.snapshot()).revision)).rejects.toThrow()
    noV2(storage)
    const reboot = new VaultService(storage)
    if (failure.startsWith('prepare')) {
      expect((await reboot.snapshot()).accounts).toEqual(original)
      expect(storage.data.accounts).toEqual(original)
    } else {
      expect((await reboot.snapshot()).syncState).toBe('pending')
      const backup = await reboot.recoveryBackup()
      expect(backup).toContain('Renamed'); expect(backup).toContain('TOTP')
      storage.writeAccounts = originalWrite; storage.writeLegacyJournal = journalWrite
      const recovery = await reboot.recoveryState()
      await reboot.resolve(storage.legacyLocal!.targetId, recovery.revision)
      expect((await reboot.snapshot()).accounts).toEqual(edited)
    }
  })
}

for (const action of ['enable', 'change', 'disable'] as const) {
  for (const stage of ['sync', 'finalize'] as const) {
    test(`${action} interrupted at ${stage}: checkpoint retains original and prepared versions, recoverable after restart`, async () => {
      const { storage, service } = await setup(action === 'enable' ? 'raw' : 'encrypted')
      if (action !== 'enable') await service.unlock(password)
      await service.save(edited, (await service.snapshot()).revision)
      const write = storage.write.bind(storage), journal = storage.writeLegacyJournal.bind(storage)
      let writes = 0
      storage.write = async record => { if (stage === 'sync') throw new Error('interrupted'); await write(record) }
      storage.writeLegacyJournal = async value => { if (++writes === 2 && stage === 'finalize') throw new Error('interrupted'); await journal(value) }
      await expect(service.protect(action, action === 'enable' ? '' : password, replacement, (await service.snapshot()).revision)).rejects.toThrow('interrupted')
      storage.session = undefined
      const reboot = new VaultService(storage)
      expect((await reboot.snapshot()).syncState).toBe('pending')
      const recovery = await reboot.recoveryState()
      const prepared = storage.legacyLocal!.copies.find(copy => copy.id === storage.legacyLocal!.targetId)!
      expect(recovery.candidates.some(copy => copy.id === prepared.id)).toBe(true)
      const expectedPassword = action === 'disable' ? undefined : replacement
      const results = await Promise.all(recovery.candidates.map(async candidate => {
        const backup = await reboot.recoveryBackup(candidate.id)
        return (await ImportExportManager.importAccounts(new File([backup], 'copy.json'), [], expectedPassword)).newAccounts
      }))
      expect(results.some(accounts => accounts[0].name === 'TOTP')).toBe(true)
      expect(results.some(accounts => accounts[0].name === 'Renamed')).toBe(true)
      storage.write = write; storage.writeLegacyJournal = journal
      await reboot.resolve(prepared.id, recovery.revision, expectedPassword)
      expect((await reboot.snapshot()).accounts).toEqual(edited)
      noV2(storage)
      if (action !== 'disable') {
        for (const copy of storage.legacyLocal!.copies) {
          expect(copy.record.mode).toBe('encrypted')
          if (copy.record.mode === 'encrypted') await expect(decryptAccounts(copy.record.data, await deriveKey(password, copy.record.data.salt))).rejects.toThrow('passwordError')
        }
      }
    }, 30000)
  }
}

test('interrupted raw-to-V1 cleanup is recoverable and never silently migrated by reads', async () => {
  const { storage, service } = await setup()
  storage.failCleanup = true
  await expect(service.protect('enable', '', password, (await service.snapshot()).revision)).rejects.toThrow('storageError')
  expect(storage.data.accounts).toEqual(original)
  const reboot = new VaultService(storage), before = persisted(storage)
  expect((await reboot.snapshot()).syncState).toBe('pending')
  await expect(reboot.unlock(password)).rejects.toThrow('syncPending')
  expect(persisted(storage)).toEqual(before)
  storage.failCleanup = false
  const recovery = await reboot.recoveryState()
  await reboot.resolve(storage.legacyLocal!.targetId, recovery.revision, password)
  expect(storage.data.accounts).toBeUndefined()
  expect((await reboot.snapshot()).accounts).toEqual(original)
  noV2(storage)
})

for (const evidence of ['invalid remote', 'valid remote', 'invalid V2 journal', 'migrated guard', 'unknown legacy journal', 'duplicate legacy sources', 'local accounts', 'local state'] as const) {
  test(`${evidence}: never downgrade, ignore or delete ambiguous legacy history`, async () => {
    const { storage, service } = await setup()
    await service.save(edited, (await service.snapshot()).revision)
    if (evidence === 'invalid remote') storage.data[V2_KEY] = { unknown: 'keep' }
    if (evidence === 'valid remote') storage.data[V2_KEY] = { id: 'remote', vector: { remote: 1 }, record: { version: 2, revision: 'remote', mode: 'plain', accounts: original } }
    if (evidence === 'invalid V2 journal') storage.local = { unknown: 'keep' } as never
    if (evidence === 'migrated guard') storage.data[VAULT_KEY] = { version: 2, mode: 'migrated', target: V2_KEY, revision: 'remote' }
    if (evidence === 'unknown legacy journal') storage.legacyLocal = { ...storage.legacyLocal!, unknown: 'keep' } as never
    if (evidence === 'duplicate legacy sources') storage.data[VAULT_KEY] = { version: 1, revision: 'other', mode: 'plain', accounts: original }
    if (evidence.startsWith('local ')) {
      const read = storage.read.bind(storage)
      storage.read = async () => ({ ...await read(), localLegacy: { [evidence.slice(6)]: { preserve: 'unknown local data' } } })
    }
    const before = persisted(storage), snapshot = await service.snapshot()
    expect(snapshot.locked).toBe(true)
    expect(snapshot.syncState).toBe('pending')
    await expect(service.save([], snapshot.revision)).rejects.toThrow('syncPending')
    await expect(service.protect('enable', '', password, snapshot.revision)).rejects.toThrow('syncPending')
    expect(persisted(storage)).toEqual(before)
    expect(JSON.parse(await service.recoveryBackup()).legacyRecovery).toEqual(storage.legacyLocal)
  })
}

test('V2 evidence arriving after preparation blocks sync writes and preserves both histories', async () => {
  const { storage, service } = await setup()
  const write = storage.writeLegacyJournal.bind(storage)
  storage.writeLegacyJournal = async journal => { await write(journal); storage.data[V2_KEY] = { unknown: 'late V2' } }
  await expect(service.save(edited, (await service.snapshot()).revision)).rejects.toThrow('conflict')
  expect(storage.data.accounts).toEqual(original)
  expect(storage.legacyLocal?.phase).toBe('prepared')
  expect(await service.recoveryBackup()).toContain('late V2')
})

test('all locales have explicit legacy capability and migration-history errors', () => {
  for (const locale of LANGUAGE_CONFIGS) {
    expect(securityError(locale.code, new Error('legacyUnsupported'))).not.toBe(securityError(locale.code, new Error('storageError')))
    expect(securityError(locale.code, new Error('legacyHistoryMigration'))).not.toBe(securityError(locale.code, new Error('storageError')))
  }
  expect(securityError('en-US', new Error('legacyUnsupported'))).toContain('do not change')
  expect(securityError('zh-CN', new Error('legacyUnsupported'))).toContain('不要')
  expect(accountDataVersion(original)).toBe(1)
  expect(accountDataVersion([{ ...original[0], algorithm: 'SHA256' }])).toBe(2)
})

test('an older client enabling protection cannot leave local plaintext history hidden behind a protected UI', async () => {
  const { storage, service } = await setup('plain')
  await service.save(edited, (await service.snapshot()).revision)
  const old = new PublishedVault(storage)
  await old.protect('enable', '', password, (await old.snapshot()).revision)
  const before = persisted(storage)
  const snapshot = await service.snapshot()
  expect(snapshot).toMatchObject({ protected: true, locked: true, syncState: 'pending', accounts: [] })
  await expect(service.unlock(password)).rejects.toThrow('syncPending')
  await expect(service.save(original, snapshot.revision)).rejects.toThrow('syncPending')
  expect(persisted(storage)).toEqual(before)
  const recovery = await service.recoveryState()
  expect(recovery).toHaveProperty('legacyProtectionMismatch', true)
  const encrypted = recovery.candidates.find(candidate => candidate.protected)!
  await service.resolve(encrypted.id, recovery.revision, password)
  expect((await service.snapshot()).accounts).toEqual(edited)
  expect(JSON.stringify(persisted(storage))).not.toContain(original[0].secret)
  noV2(storage)
})

test('an older client changing passwords keeps prior encrypted history and blocks a new rotation with unknown historical password', async () => {
  const { storage, service } = await setup('encrypted')
  await service.unlock(password)
  await service.save(edited, (await service.snapshot()).revision)
  const old = new PublishedVault(storage)
  await old.protect('change', password, replacement, (await old.snapshot()).revision)
  await service.unlock(replacement)
  expect((await service.snapshot()).accounts).toEqual(edited)
  await service.save(original, (await service.snapshot()).revision)
  const before = persisted(storage)
  await expect(service.protect('change', replacement, 'third-password-synthetic', (await service.snapshot()).revision)).rejects.toThrow('recoveryPasswordRequired')
  expect(persisted(storage)).toEqual(before)
  noV2(storage)
})

test('sync state is preserved and cannot be bypassed by migration', async () => {
  const { storage, service } = await setup()
  storage.data.state = { uniqueSecret: 'do not discard' }
  const before = persisted(storage), snapshot = await service.snapshot()
  expect(snapshot.syncState).toBe('pending')
  await expect(service.save([], snapshot.revision)).rejects.toThrow('syncPending')
  await expect(service.migrate(snapshot.revision)).rejects.toThrow()
  expect(persisted(storage)).toEqual(before)
  expect(await service.recoveryBackup()).toContain('do not discard')
})

test('encrypted payload shape and parameter version are validated independently of the V1 outer vault', async () => {
  const salt = newSalt(), key = await deriveKey(password, salt)
  const extended = [{ ...original[0], algorithm: 'SHA256' as const }]
  const v2 = await encryptAccounts(extended, key, salt)
  expect(v2.version).toBe(2)
  await expect(decryptAccounts({ ...v2, version: 1 }, key)).rejects.toThrow('invalid')
  for (const data of [v2, { ...v2, version: 1 as const }]) {
    const storage = new MemoryVaultStorage({ accountVault: { version: 1, revision: 'envelope-mismatch', mode: 'encrypted', data } })
    const service = new VaultService(storage), before = persisted(storage)
    await expect(service.unlock(password)).rejects.toThrow()
    expect(persisted(storage)).toEqual(before)
  }
})

test('published client can wrap a raw array after a new-client save without making the local history unusable', async () => {
  const { storage, service } = await setup('raw')
  await service.save(edited, (await service.snapshot()).revision)
  expect(storage.data.accountVault).toBeUndefined()
  const old = new PublishedVault(storage)
  const wrapped = await old.snapshot()
  expect(wrapped.accounts).toEqual(edited)
  expect(storage.data.accounts).toBeUndefined()
  await old.save(original, wrapped.revision)
  expect((await service.snapshot()).accounts).toEqual(original)
  await service.save(edited, (await service.snapshot()).revision)
  expect((await old.snapshot()).accounts).toEqual(edited)
  noV2(storage)
})
