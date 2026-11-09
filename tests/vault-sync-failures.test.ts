import { expect, test } from 'bun:test'
import { VaultService, VAULT_KEY } from '../src/utils/vault'
import { browserSyncStorage, MIGRATION_PREFIX, V2_KEY, type SyncRecord } from '../src/utils/vault-sync'
import { MemoryVaultStorage } from './fixtures/vault-memory'
import { VaultService as StoreVault } from './fixtures/store-2.3.9/vault'
import { ImportExportManager } from '../src/utils/import-export'

const accounts = [{ name: 'Synthetic recovery account', secret: 'A'.repeat(32) }]
const oldPassword = 'synthetic-original-password'
const newPassword = 'synthetic-replacement-password'
async function setup(encrypted = false) {
  const storage = new MemoryVaultStorage({ accounts })
  const old = new StoreVault(storage)
  const snapshot = await old.snapshot()
  if (encrypted) await old.protect('enable', '', oldPassword, snapshot.revision)
  return { storage, service: new VaultService(storage) }
}
const restore = async (text: string, password?: string) =>
  (await ImportExportManager.importAccounts(new File([text], 'recovery.json'), [], password)).newAccounts

test('encrypted migration interrupted before the legacy guard keeps the original ciphertext and password', async () => {
  const { storage, service } = await setup(true)
  const before = structuredClone(storage.data)
  const write = storage.write.bind(storage)
  storage.write = async () => { throw new Error('interrupted') }
  await expect(service.migrate((await service.snapshot()).revision)).rejects.toThrow('interrupted')
  expect(storage.data[VAULT_KEY]).toEqual(before[VAULT_KEY])
  expect(JSON.stringify(storage.local)).not.toContain(accounts[0].secret)
  const resumed = new VaultService(storage)
  expect(await resumed.snapshot()).toMatchObject({ syncState: 'pending', locked: true, protected: true, accounts: [] })
  const recovery = await resumed.recoveryState()
  const candidate = storage.local!.pending!.id
  const backup = await resumed.recoveryBackup(candidate)
  expect(await restore(backup, oldPassword)).toEqual(accounts)
  const unchanged = structuredClone({ data: storage.data, local: storage.local })
  await expect(resumed.resolve(candidate, recovery.revision, 'wrong')).rejects.toThrow('passwordError')
  expect({ data: storage.data, local: storage.local }).toEqual(unchanged)
  storage.write = write
  await resumed.resolve(candidate, recovery.revision, oldPassword)
  expect(await resumed.snapshot()).toMatchObject({ protected: true, locked: false, accounts })
})

for (const first of ['guard', 'candidate'] as const) {
  test(`${first} arriving first on another device never creates an empty vault`, async () => {
    const source = await setup(true)
    await source.service.migrate((await source.service.snapshot()).revision)
    const candidateKey = Object.keys(source.storage.data).find(key => key.startsWith(MIGRATION_PREFIX))!
    const keys = first === 'guard' ? [VAULT_KEY, candidateKey] : [candidateKey, VAULT_KEY]
    const target = new MemoryVaultStorage({ [keys[0]]: source.storage.data[keys[0]] })
    const service = new VaultService(target)
    const before = structuredClone(target.data)
    const initial = await service.snapshot()
    expect(initial.locked).toBe(true)
    expect(initial.accounts).toEqual([])
    if (first === 'guard') {
      expect(initial.syncState).toBe('pending')
      await expect(service.save([], initial.revision)).rejects.toThrow('syncPending')
    } else expect(initial.protected).toBe(true)
    expect(target.data).toEqual(before)
    expect(target.local).toBeUndefined()
    target.data[keys[1]] = structuredClone(source.storage.data[keys[1]])
    await service.unlock(oldPassword)
    expect((await service.snapshot()).accounts).toEqual(accounts)
    expect(target.local).toBeUndefined()
  })
}

test('a competing valid record during write readback preserves both portable candidates', async () => {
  const { storage, service } = await setup()
  await service.migrate((await service.snapshot()).revision)
  const baseline = storage.local!.current!
  const remoteAccounts = [{ name: 'Remote edit', secret: accounts[0].secret, digits: 8 as const }]
  const localAccounts = [{ name: 'Local edit', secret: accounts[0].secret, period: 60 }]
  const competitor: SyncRecord = { id: 'remote-readback', vector: { ...baseline.vector, remote: 1 },
    record: { version: 2, revision: 'remote-readback', mode: 'plain', accounts: remoteAccounts } }
  const write = storage.sync.write
  storage.sync.write = async (value, migration) => {
    await write(value, migration)
    storage.data[V2_KEY] = structuredClone(competitor)
  }
  await expect(service.save(localAccounts, (await service.snapshot()).revision)).rejects.toThrow('conflict')
  expect((await service.snapshot()).syncState).toBe('conflict')
  const localId = storage.local!.pending!.id
  expect(await restore(await service.recoveryBackup(localId))).toEqual(localAccounts)
  expect(await restore(await service.recoveryBackup(competitor.id))).toEqual(remoteAccounts)
  storage.sync.write = write
  await service.resolve(localId, (await service.recoveryState()).revision)
  expect((await service.snapshot()).accounts).toEqual(localAccounts)
  // The rejected branch must remain individually importable after resolving.
  expect(await restore(await service.recoveryBackup(competitor.id))).toEqual(remoteAccounts)
})

test('local journal readback mismatch prevents publishing or guarding the legacy source', async () => {
  const { storage, service } = await setup(true)
  const before = structuredClone(storage.data)
  const write = storage.sync.writeLocal
  storage.sync.writeLocal = async journal => {
    await write(journal)
    storage.local!.counter += 1
  }
  await expect(service.migrate((await service.snapshot()).revision)).rejects.toThrow('storageError')
  expect(storage.data).toEqual(before)
  const pending = storage.local!.pending!.id
  expect(await restore(await service.recoveryBackup(pending), oldPassword)).toEqual(accounts)
})

for (const selection of ['original', 'replacement'] as const) {
  test(`a failed password change can explicitly recover the ${selection} password without losing either backup`, async () => {
    const { storage, service } = await setup(true)
    await service.migrate((await service.snapshot()).revision)
    const oldId = storage.local!.current!.id
    const synchronized = structuredClone(storage.data)
    const write = storage.sync.write
    storage.sync.write = async () => { throw new Error('quota') }
    await expect(service.protect('change', oldPassword, newPassword, (await service.snapshot()).revision)).rejects.toThrow('quota')
    expect(storage.data).toEqual(synchronized)
    expect(await service.snapshot()).toMatchObject({ syncState: 'pending', locked: true, protected: true })
    const newId = storage.local!.pending!.id
    const oldBackup = await service.recoveryBackup(oldId)
    const newBackup = await service.recoveryBackup(newId)
    expect(await restore(oldBackup, oldPassword)).toEqual(accounts)
    expect(await restore(newBackup, newPassword)).toEqual(accounts)
    await expect(restore(oldBackup, newPassword)).rejects.toThrow('passwordError')
    await expect(restore(newBackup, oldPassword)).rejects.toThrow('passwordError')
    expect(JSON.stringify(storage.local)).not.toContain(accounts[0].secret)
    storage.sync.write = write
    await service.resolve(selection === 'original' ? oldId : newId, (await service.recoveryState()).revision,
      selection === 'original' ? oldPassword : newPassword)
    await service.lock()
    await service.unlock(selection === 'original' ? oldPassword : newPassword)
    expect((await service.snapshot()).accounts).toEqual(accounts)
    // Completing the replacement must also rotate its retained historical copy.
    const historicalPassword = selection === 'replacement' ? newPassword : oldPassword
    expect(await restore(await service.recoveryBackup(oldId), historicalPassword)).toEqual(accounts)
    if (selection === 'replacement') await expect(restore(await service.recoveryBackup(oldId), oldPassword)).rejects.toThrow('passwordError')
    expect(await restore(await service.recoveryBackup(newId), newPassword)).toEqual(accounts)
  })
}

async function withChromeQuota(total: number, old: number, run: (writes: Record<string, unknown>[]) => Promise<void>) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'chrome')
  const writes: Record<string, unknown>[] = []
  Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { storage: { sync: {
    getBytesInUse: async (key: string | null) => key === null ? total : key === V2_KEY ? old : 0,
    set: async (values: Record<string, unknown>) => { writes.push(structuredClone(values)) },
  } } } })
  try { await run(writes) }
  finally {
    if (descriptor) Object.defineProperty(globalThis, 'chrome', descriptor)
    else Reflect.deleteProperty(globalThis, 'chrome')
  }
}
const quotaRecord = (): SyncRecord => ({ id: 'quota-candidate', vector: { test: 1 },
  record: { version: 2, revision: 'quota-candidate', mode: 'plain', accounts: [{ name: 'Quota account', secret: accounts[0].secret }] } })

test('browser storage replacement reuses its existing bytes at the total quota but a new migration key cannot', async () => {
  const value = quotaRecord()
  const size = new TextEncoder().encode(V2_KEY + JSON.stringify(value)).length
  await withChromeQuota(102400, size, async writes => {
    await browserSyncStorage.write(value, false)
    expect(writes).toHaveLength(1)
    await expect(browserSyncStorage.write(value, true)).rejects.toThrow('quota')
    expect(writes).toHaveLength(1)
  })
})

test('browser storage accepts the exact per-key byte limit and rejects excess including multibyte names', async () => {
  const value = quotaRecord()
  const overhead = new TextEncoder().encode(V2_KEY + JSON.stringify(value)).length
  if (value.record.mode !== 'plain') throw new Error('fixture')
  value.record.accounts[0].name += 'x'.repeat(8192 - overhead)
  await withChromeQuota(0, 0, async writes => {
    await browserSyncStorage.write(value, false)
    expect(writes).toHaveLength(1)
    if (value.record.mode !== 'plain') throw new Error('fixture')
    value.record.accounts[0].name += 'x'
    await expect(browserSyncStorage.write(value, false)).rejects.toThrow('quota')
    value.record.accounts[0].name = '汉'.repeat(2800)
    await expect(browserSyncStorage.write(value, false)).rejects.toThrow('quota')
    expect(writes).toHaveLength(1)
  })
})
