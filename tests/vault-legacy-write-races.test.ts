import { test, expect } from 'bun:test'
import { VaultService } from '../src/utils/vault'
import { V2_KEY } from '../src/utils/vault-sync'
import { MemoryVaultStorage } from './fixtures/vault-memory'

const original = [{ name: 'Original', secret: 'JBSWY3DPEHPK3PXP' }]
const desired = [{ ...original[0], name: 'Desired' }]
const late = [{ ...original[0], name: 'Late independent write' }]
const password = 'legacy-race-password'

for (const timing of ['journal preparation', 'account write', 'journal finalization'] as const) {
  test(`a legacy account replacement observed at ${timing} fails without falsely reporting success`, async () => {
    const storage = new MemoryVaultStorage({ accounts: original }), service = new VaultService(storage)
    const journal = storage.writeLegacyJournal.bind(storage), write = storage.writeAccounts.bind(storage)
    storage.writeLegacyJournal = async value => {
      await journal(value)
      if (timing === 'journal preparation' && value.phase === 'prepared' || timing === 'journal finalization' && value.phase === 'ready') storage.data.accounts = structuredClone(late)
    }
    storage.writeAccounts = async value => { await write(value); if (timing === 'account write') storage.data.accounts = structuredClone(late) }
    await expect(service.save(desired, (await service.snapshot()).revision)).rejects.toThrow('conflict')
    expect(storage.data.accounts).toEqual(late)
    const recovery = await new VaultService(storage).recoveryBackup()
    expect(recovery).toContain('Original')
    expect(recovery).toContain('Desired')
    expect(recovery).toContain('Late independent write')
  })
}

for (const inject of ['accounts', 'state', 'local history', 'V2'] as const) {
  test(`raw wrapping never cleans when ${inject} changes at the V1 write`, async () => {
    const storage = new MemoryVaultStorage({ accounts: original }), service = new VaultService(storage)
    const write = storage.write.bind(storage)
    let cleanups = 0
    const cleanup = storage.cleanup.bind(storage)
    storage.cleanup = async expected => { cleanups++; await cleanup(expected) }
    storage.write = async record => {
      await write(record)
      if (inject === 'accounts') storage.data.accounts = structuredClone(late)
      if (inject === 'state') storage.data.state = { secret: 'unknown draft' }
      if (inject === 'local history') storage.legacyLocal = { unknown: 'unknown history' } as never
      if (inject === 'V2') storage.data[V2_KEY] = { unknown: 'late V2' }
    }
    await expect(service.protect('enable', '', password, (await service.snapshot()).revision)).rejects.toThrow('conflict')
    expect(cleanups).toBe(0)
    expect(storage.data.accounts).toEqual(inject === 'accounts' ? late : original)
    const raw = await service.recoveryBackup()
    expect(raw).toContain(inject === 'accounts' ? 'Late independent write' : inject === 'state' ? 'unknown draft' : inject === 'local history' ? 'unknown history' : 'late V2')
  })
}

test('cleanup receives the already verified source snapshot, never a fresh enlarged deletion set', async () => {
  const storage = new MemoryVaultStorage({ accounts: original }), service = new VaultService(storage)
  const cleanup = storage.cleanup.bind(storage)
  storage.cleanup = async expected => {
    expect(expected).toHaveProperty('accounts', original)
    expect(expected).not.toHaveProperty('state')
    storage.data.state = { unique: 'late data' }
    await cleanup(expected)
  }
  await expect(service.protect('enable', '', password, (await service.snapshot()).revision)).rejects.toThrow('syncConflict')
  expect(storage.data.accounts).toEqual(original)
  expect(storage.data.state).toEqual({ unique: 'late data' })
})

test('a V2 writer does not ignore a pre-existing untracked sync state', async () => {
  const storage = new MemoryVaultStorage(), service = new VaultService(storage)
  await service.save(original, 'empty')
  storage.data.state = { preserve: 'unknown history' }
  const before = structuredClone({ sync: storage.data, local: storage.local })
  expect((await service.snapshot()).syncState).toBe('pending')
  await expect(service.protect('enable', '', password, (await service.snapshot()).revision)).rejects.toThrow('syncPending')
  expect({ sync: storage.data, local: storage.local }).toEqual(before)
})
