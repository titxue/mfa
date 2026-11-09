import { expect, test } from 'bun:test'
import type { Account } from '../src/types'
import { VaultService } from '../src/utils/vault'
import { decryptAccounts, deriveKey, encryptAccounts, fromBase64, newSalt, toBase64 } from '../src/utils/vault-crypto'
import { MIGRATION_PREFIX, type SyncRecord } from '../src/utils/vault-sync'
import { MemoryVaultStorage } from './fixtures/vault-memory'
import { VaultService as StoreVault } from './fixtures/store-2.3.9/vault'

const oldPassword = 'synthetic-race-original'
const newPassword = 'synthetic-race-replacement'
const historicalAccounts: Account[] = [{ name: 'Historical branch', secret: 'A'.repeat(32) }]
const currentAccounts: Account[] = [{ name: 'Current branch', secret: 'B'.repeat(32) }]
const concurrentAccounts: Account[] = [{ name: 'Concurrent branch', secret: 'C'.repeat(32) }]

async function setup() {
  const storage = new MemoryVaultStorage(), service = new VaultService(storage)
  await service.protect('enable', '', oldPassword, 'empty')
  await service.save(historicalAccounts, (await service.snapshot()).revision)
  const historical = structuredClone(storage.local!.current!)
  await service.save(currentAccounts, (await service.snapshot()).revision)
  return { storage, service, historical }
}

async function open(record: SyncRecord, password: string) {
  if (record.record.mode !== 'encrypted') throw new Error('expected encrypted record')
  return decryptAccounts(record.record.data, await deriveKey(password, record.record.data.salt))
}

test('a dominated old-password branch arriving in the final state read prevents successful rotation', async () => {
  const { storage, service, historical } = await setup()
  const read = storage.sync.read, remove = storage.sync.removeCandidates
  let afterRemoval = false, readsAfterRemoval = 0
  storage.sync.removeCandidates = async ids => { await remove(ids); afterRemoval = true }
  storage.sync.read = async () => {
    // The first read verifies deletion. The second is commit's final state read.
    if (afterRemoval && ++readsAfterRemoval === 2) {
      storage.data[MIGRATION_PREFIX + historical.id] = structuredClone(historical)
    }
    return read()
  }
  await expect(service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision))
    .rejects.toThrow('conflict')
  expect(readsAfterRemoval).toBe(2)
  expect(storage.local!.pending).toBeDefined()
  expect(storage.local!.rekey).toBeDefined()
  expect(await open(storage.data[MIGRATION_PREFIX + historical.id] as SyncRecord, oldPassword))
    .toEqual(historicalAccounts)
  expect(await open(storage.local!.pending!, newPassword)).toEqual(currentAccounts)
}, 30_000)

test('a concurrent local archive update during the final read is retained instead of overwritten', async () => {
  const { storage, service } = await setup()
  const salt = newSalt(), key = await deriveKey(oldPassword, salt)
  const concurrent: SyncRecord = {
    id: 'synthetic-concurrent-local-history', vector: { concurrentDevice: 1 }, recoveryOnly: true,
    record: { version: 2, revision: 'synthetic-concurrent-local-history', mode: 'encrypted',
      data: await encryptAccounts(concurrentAccounts, key, salt) },
  }
  const readLocal = storage.sync.readLocal, remove = storage.sync.removeCandidates
  let afterRemoval = false, injected = false
  storage.sync.removeCandidates = async ids => { await remove(ids); afterRemoval = true }
  storage.sync.readLocal = async () => {
    if (afterRemoval && !injected) {
      storage.local!.conflicts.push(structuredClone(concurrent))
      injected = true
    }
    return readLocal()
  }
  await expect(service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision))
    .rejects.toThrow('conflict')
  expect(injected).toBe(true)
  expect(storage.local!.pending).toBeDefined()
  const retained = storage.local!.conflicts.find(record => record.id === concurrent.id)
  expect(retained).toEqual(concurrent)
  expect(await open(retained!, oldPassword)).toEqual(concurrentAccounts)
  expect(await open(storage.local!.pending!, newPassword)).toEqual(currentAccounts)
}, 30_000)

test('legacy plaintext arriving after cleanup is detected by the final state read', async () => {
  const { storage, service } = await setup()
  const read = storage.read.bind(storage), cleanup = storage.cleanup.bind(storage)
  let afterCleanup = false, readsAfterCleanup = 0
  storage.cleanup = async () => { await cleanup(); afterCleanup = true }
  storage.read = async () => {
    // The first read verifies cleanup. The second is commit's final state read.
    if (afterCleanup && ++readsAfterCleanup === 2) storage.data.accounts = structuredClone(concurrentAccounts)
    return read()
  }
  await expect(service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision))
    .rejects.toThrow('conflict')
  expect(readsAfterCleanup).toBe(2)
  expect(storage.data.accounts).toEqual(concurrentAccounts)
  expect(storage.local!.pending).toBeDefined()
  expect(storage.local!.rekey).toBeDefined()
  expect(await open(storage.local!.pending!, newPassword)).toEqual(currentAccounts)
}, 30_000)

for (const damage of ['missing legacy', 'corrupt legacy ciphertext', 'truncated conflicts'] as const) {
  test(`a checkpoint with ${damage} cannot discard the unique original legacy history`, async () => {
    const storage = new MemoryVaultStorage({ accounts: historicalAccounts })
    const published = new StoreVault(storage)
    await published.protect('enable', '', oldPassword, (await published.snapshot()).revision)
    const service = new VaultService(storage)
    await service.migrate((await service.snapshot()).revision)
    await service.save(currentAccounts, (await service.snapshot()).revision)
    const write = storage.sync.write
    storage.sync.write = async () => { throw new Error('synthetic-publish-failure') }
    await expect(service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision))
      .rejects.toThrow('synthetic-publish-failure')
    storage.sync.write = write

    const targetId = storage.local!.pending!.id
    const checkpoint = storage.local!.rekey!
    expect(checkpoint.legacy).toBeDefined()
    expect(checkpoint.conflicts.length).toBeGreaterThan(0)
    if (damage === 'missing legacy') delete checkpoint.legacy
    else if (damage === 'truncated conflicts') checkpoint.conflicts = []
    else {
      if (checkpoint.legacy?.mode !== 'encrypted') throw new Error('expected encrypted checkpoint')
      const bytes = fromBase64(checkpoint.legacy.data.ciphertext)
      bytes[0] ^= 1
      checkpoint.legacy.data.ciphertext = toBase64(bytes)
    }
    const before = structuredClone({ data: storage.data, local: storage.local, session: storage.session })
    const restarted = new VaultService(storage)
    const recovery = await restarted.recoveryState()
    expect(recovery.state).toBe('pending')
    await expect(restarted.resolve(targetId, recovery.revision, newPassword)).rejects.toThrow('syncPending')
    expect({ data: storage.data, local: storage.local, session: storage.session }).toEqual(before)
    const legacy = storage.local!.legacy!
    if (legacy.mode !== 'encrypted') throw new Error('expected original encrypted history')
    expect(await decryptAccounts(legacy.data, await deriveKey(oldPassword, legacy.data.salt)))
      .toEqual(historicalAccounts)
    expect(await open(storage.local!.pending!, newPassword)).toEqual(currentAccounts)
  }, 30_000)
}
