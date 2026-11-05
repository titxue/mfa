import { expect, test } from 'bun:test'
import { VaultService, VAULT_KEY } from '../src/utils/vault'
import { V2_KEY, MIGRATION_PREFIX } from '../src/utils/vault-sync'
import { MemoryVaultStorage } from './fixtures/vault-memory'
import { VaultService as StoreVault } from './fixtures/store-2.3.9/vault'
import { ImportExportManager } from '../src/utils/import-export'

const secret = 'A'.repeat(32)
const original = [{ name: 'Original', secret }]
const password = 'synthetic-protocol-password'
const serviceFor = (data: Record<string, unknown> = { accounts: original }) => {
  const storage = new MemoryVaultStorage(data)
  return { storage, service: new VaultService(storage) }
}
const migrate = async (service: VaultService) => service.migrate((await service.snapshot()).revision)
const syncKeys = (storage: MemoryVaultStorage) => Object.keys(storage.data).filter(k => k === V2_KEY || k.startsWith(MIGRATION_PREFIX))
const deliver = (from: MemoryVaultStorage, to: MemoryVaultStorage) => {
  for (const key of syncKeys(from)) to.data[key] = structuredClone(from.data[key])
}

test('empty and legacy snapshots never initialize or migrate storage', async () => {
  for (const data of [{}, { accounts: original, state: { draft: 'unchanged' } }]) {
    const { storage, service } = serviceFor(data)
    const before = structuredClone(storage.data)
    for (let i = 0; i < 3; i++) { await service.snapshot(); await service.recoveryState() }
    expect(storage.data).toEqual(before)
    expect(storage.local).toBeUndefined()
    if ('accounts' in data) {
      expect((await service.snapshot()).syncState).toBe('migration')
      await expect(service.save([], (await service.snapshot()).revision)).rejects.toThrow('migrationRequired')
    } else {
      await service.save(original, 'empty')
      expect(syncKeys(storage).every(key => key.startsWith(MIGRATION_PREFIX))).toBe(true)
      expect((await service.snapshot()).accounts).toEqual(original)
    }
  }
})

test('third device seeing V1 first never promotes it over delayed V2', async () => {
  const a = serviceFor()
  const stale = structuredClone(a.storage.data)
  await migrate(a.service)
  const extended = [{ name: 'New SHA256', secret, algorithm: 'SHA256' as const, digits: 8 as const }]
  await a.service.save(extended, (await a.service.snapshot()).revision)
  const c = serviceFor(stale)
  expect((await c.service.snapshot()).syncState).toBe('migration')
  expect(c.storage.data).toEqual(stale)
  expect(c.storage.local).toBeUndefined()
  deliver(a.storage, c.storage)
  expect((await c.service.snapshot()).syncState).toBe('conflict')
  expect(await c.service.recoveryBackup()).toContain('New SHA256')
  expect(c.storage.data.accounts).toEqual(original)
  expect(c.storage.local).toBeUndefined()
})

test('an offline published client can write V1 but cannot overwrite protected V2', async () => {
  const a = serviceFor()
  const old = new StoreVault(a.storage)
  await old.snapshot()
  const offline = new MemoryVaultStorage(a.storage.data)
  const offlineOld = new StoreVault(offline)
  const offlineRevision = (await offlineOld.snapshot()).revision
  await migrate(a.service)
  const extended = [{ name: 'Protected SHA512', secret, algorithm: 'SHA512' as const }]
  await a.service.save(extended, (await a.service.snapshot()).revision)
  await a.service.protect('enable', '', password, (await a.service.snapshot()).revision)
  const before = structuredClone(a.storage.data[V2_KEY])
  await offlineOld.save([{ name: 'Offline rename', secret }], offlineRevision)
  a.storage.data[VAULT_KEY] = structuredClone(offline.data[VAULT_KEY])
  await a.service.lock()
  expect(await a.service.snapshot()).toMatchObject({ protected: true, locked: true, accounts: [] })
  expect((await a.service.snapshot()).syncState).toBe('conflict')
  await expect(a.service.unlock(password)).rejects.toThrow('syncConflict')
  expect(a.storage.data[V2_KEY]).toEqual(before)
  const recovery = await a.service.recoveryState()
  expect(recovery.protected).toBe(true)
  const legacy = recovery.candidates.find(c => c.id.startsWith('legacy:'))!
  expect(JSON.parse(await a.service.recoveryBackup(legacy.id)).accounts[0].name).toBe('Offline rename')
  await expect(a.service.resolve(legacy.id, recovery.revision, 'wrong')).rejects.toThrow('passwordError')
  expect(a.storage.data[V2_KEY]).toEqual(before)
  await a.service.resolve(legacy.id, recovery.revision, password)
  expect(await a.service.snapshot()).toMatchObject({ protected: true, locked: false, accounts: [{ name: 'Offline rename', secret }] })
  const restoredCandidates = await a.service.recoveryState()
  const records = await Promise.all(restoredCandidates.candidates.map(async candidate => {
    const text = await a.service.recoveryBackup(candidate.id)
    return (await ImportExportManager.importAccounts(new File([text], 'candidate.json'), [], password)).newAccounts
  }))
  expect(records.some(accounts => accounts.some(account => account.name === 'Protected SHA512'))).toBe(true)
  expect(records.some(accounts => accounts.some(account => account.name === 'Offline rename'))).toBe(true)
})

test('two explicit offline migrations remain separate and selection retains both recoverable branches', async () => {
  const a = serviceFor({ accounts: [{ name: 'Branch A', secret }] })
  const b = serviceFor({ accounts: [{ name: 'Branch B', secret }] })
  await migrate(a.service); await migrate(b.service)
  expect(syncKeys(a.storage)[0]).not.toBe(syncKeys(b.storage)[0])
  const bId = b.storage.local!.current!.id
  deliver(b.storage, a.storage)
  const state = await a.service.recoveryState()
  expect(state.state).toBe('conflict')
  expect((await a.service.snapshot()).locked).toBe(true)
  await expect(a.service.save([], (await a.service.snapshot()).revision)).rejects.toThrow('syncConflict')
  const selected = await a.service.recoveryBackup(bId)
  expect((await ImportExportManager.importAccounts(new File([selected], 'branch.json'), [])).newAccounts[0].name).toBe('Branch B')
  await expect(a.service.resolve(bId, 'stale-recovery-revision')).rejects.toThrow('conflict')
  await a.service.resolve(bId, state.revision)
  expect((await a.service.snapshot()).accounts[0].name).toBe('Branch B')
  const all = await a.service.recoveryBackup()
  expect(all).toContain('Branch A')
  expect(all).toContain('Branch B')
})

test('concurrent new-client saves retain local branches after last-writer delivery', async () => {
  const a = serviceFor(); await migrate(a.service)
  const b = serviceFor(a.storage.data)
  await a.service.save([{ name: 'A edit', secret }], (await a.service.snapshot()).revision)
  await b.service.save([{ name: 'B edit', secret }], (await b.service.snapshot()).revision)
  const aWritten = structuredClone(a.storage.data[V2_KEY])
  a.storage.data[V2_KEY] = structuredClone(b.storage.data[V2_KEY])
  b.storage.data[V2_KEY] = aWritten
  for (const device of [a, b]) {
    expect((await device.service.snapshot()).syncState).toBe('conflict')
    const backup = await device.service.recoveryBackup()
    expect(backup).toContain('A edit'); expect(backup).toContain('B edit')
  }
  const recovery = await a.service.recoveryState()
  const bId = b.storage.local!.current!.id
  await a.service.resolve(bId, recovery.revision)
  expect((await a.service.snapshot()).accounts[0].name).toBe('B edit')
  const recoverable = await a.service.recoveryBackup()
  expect(recoverable).toContain('A edit'); expect(recoverable).toContain('B edit')
})

test('local recovery failure prevents any synchronized write', async () => {
  const { storage, service } = serviceFor()
  const before = structuredClone(storage.data)
  storage.sync.writeLocal = async () => { throw new Error('quota') }
  await expect(migrate(service)).rejects.toThrow('quota')
  expect(storage.data).toEqual(before)
})

test('synchronized quota failure retains baseline and pending data for explicit retry', async () => {
  const { storage, service } = serviceFor(); await migrate(service)
  const before = structuredClone(storage.data)
  const write = storage.sync.write
  storage.sync.write = async () => { throw new Error('quota') }
  await expect(service.save([{ name: 'Pending edit', secret }], (await service.snapshot()).revision)).rejects.toThrow('quota')
  expect(storage.data).toEqual(before)
  expect((await service.snapshot()).syncState).toBe('pending')
  const exportAll = await service.recoveryBackup()
  expect(exportAll).toContain('Original'); expect(exportAll).toContain('Pending edit')
  storage.sync.write = write
  const state = await service.recoveryState()
  await service.resolve(storage.local!.pending!.id, state.revision)
  expect((await service.snapshot()).accounts[0].name).toBe('Pending edit')
})

test('interruption after candidate persistence never cleans the original before guard completion', async () => {
  const { storage, service } = serviceFor({ accounts: original, state: { draft: 'old draft' } })
  const write = storage.write.bind(storage)
  storage.write = async () => { throw new Error('interrupted') }
  await expect(migrate(service)).rejects.toThrow('interrupted')
  expect(storage.data.accounts).toEqual(original)
  expect(storage.data.state).toEqual({ draft: 'old draft' })
  expect(syncKeys(storage)).toHaveLength(1)
  expect((await new VaultService(storage).snapshot()).syncState).toBe('pending')
  storage.write = write
  const state = await service.recoveryState()
  await service.resolve(storage.local!.pending!.id, state.revision)
  expect((await service.snapshot()).accounts).toEqual(original)
})

test('enabling protection encrypts local recovery copies and removes obsolete synchronized plaintext', async () => {
  const { storage, service } = serviceFor(); await migrate(service)
  await service.protect('enable', '', password, (await service.snapshot()).revision)
  expect(JSON.stringify(storage.local)).not.toContain(secret)
  expect(JSON.stringify(storage.data)).not.toContain(secret)
  const before = structuredClone(storage.data)
  await service.lock()
  await expect(service.unlock('wrong')).rejects.toThrow('passwordError')
  expect(storage.data).toEqual(before)
  await service.unlock(password)
  expect((await service.snapshot()).accounts).toEqual(original)
})

test('malformed synchronized records block saves but remain available in the raw recovery export', async () => {
  const { storage, service } = serviceFor({ [V2_KEY]: { unknown: 'preserve-this-data' } })
  const before = structuredClone(storage.data)
  expect((await service.snapshot()).syncState).toBe('pending')
  await expect(service.save([], (await service.snapshot()).revision)).rejects.toThrow('syncPending')
  expect(await service.recoveryBackup()).toContain('preserve-this-data')
  expect(storage.data).toEqual(before)
})

test('fresh installation can explicitly enable protection without an automatic empty write', async () => {
  const { storage, service } = serviceFor({})
  expect(await service.snapshot()).toMatchObject({ revision: 'empty', accounts: [], locked: false })
  expect(storage.data).toEqual({})
  await service.protect('enable', '', password, 'empty')
  expect(await service.snapshot()).toMatchObject({ protected: true, locked: false, accounts: [] })
  await service.save(original, (await service.snapshot()).revision)
  expect((await service.snapshot()).accounts).toEqual(original)
  expect(JSON.stringify(storage.data)).not.toContain(secret)
})

test('custom storage without a durable protocol port fails writes instead of using an unsafe fallback', async () => {
  const storage = new MemoryVaultStorage({ accounts: original })
  const service = new VaultService({
    read: storage.read.bind(storage), write: storage.write.bind(storage), cleanup: storage.cleanup.bind(storage),
    getSession: storage.getSession.bind(storage), setSession: storage.setSession.bind(storage),
  })
  const before = structuredClone(storage.data)
  await expect(migrate(service)).rejects.toThrow('storageError')
  expect(storage.data).toEqual(before)
})
