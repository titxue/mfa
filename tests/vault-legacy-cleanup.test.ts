import { afterEach, expect, test } from 'bun:test'
import type { Account } from '../src/types'
import { browserVaultStorage, VAULT_KEY, VaultService, type VaultStorage } from '../src/utils/vault'
import { RECOVERY_KEY } from '../src/utils/vault-sync'
import { MemoryVaultStorage } from './fixtures/vault-memory'

const oldPassword = 'synthetic-legacy-original'
const nextPassword = 'synthetic-legacy-replacement'
const currentAccounts: Account[] = [{ name: 'Current', secret: 'A'.repeat(32) }]
const lateAccounts: Account[] = [{ name: 'Late unique account', secret: 'B'.repeat(32), algorithm: 'SHA256', digits: 8, period: 45 }]
const originalChrome = Object.getOwnPropertyDescriptor(globalThis, 'chrome')
afterEach(() => {
  if (originalChrome) Object.defineProperty(globalThis, 'chrome', originalChrome)
  else Reflect.deleteProperty(globalThis, 'chrome')
})

function area(data: Record<string, unknown> = {}) {
  const writes: unknown[] = [], removals: string[][] = []
  return {
    data, writes, removals,
    async get(keys: string | string[] | null) {
      return structuredClone(keys === null ? data : Object.fromEntries(
        (typeof keys === 'string' ? [keys] : keys).filter(key => key in data).map(key => [key, data[key]])))
    },
    async set(values: Record<string, unknown>) { writes.push(structuredClone(values)); Object.assign(data, structuredClone(values)) },
    async remove(keys: string | string[]) {
      const list = typeof keys === 'string' ? [keys] : keys
      removals.push([...list]); list.forEach(key => { delete data[key] })
    },
    async getBytesInUse() { return 0 },
    async setAccessLevel() {},
  }
}

async function setup(protectedVault = true) {
  const memory = new MemoryVaultStorage(), initial = new VaultService(memory)
  if (protectedVault) await initial.protect('enable', '', oldPassword, 'empty')
  await initial.save(currentAccounts, (await initial.snapshot()).revision)
  const sync = area(structuredClone(memory.data))
  const local = area({ [RECOVERY_KEY]: structuredClone(memory.local) })
  const session = area(memory.session ? { vaultSession: structuredClone(memory.session) } : {})
  Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { storage: { sync, local, session } } })
  const storage: VaultStorage = { ...browserVaultStorage }
  return { sync, local, session, storage, service: new VaultService(storage) }
}

for (const action of ['enable', 'change'] as const) {
  for (const timing of ['guard write', 'cleanup entry', 'cleanup read returned'] as const) {
    test(`${action}: unique sync accounts arriving at ${timing} survive with a failed transaction`, async () => {
      const { sync, local, session, storage, service } = await setup(action === 'change')
      const revision = (await service.snapshot()).revision
      const beforeSession = structuredClone(session.data)
      let injected = false, inCleanup = false
      const inject = () => { sync.data.accounts = structuredClone(lateAccounts); injected = true }
      const write = storage.write.bind(storage), cleanup = storage.cleanup.bind(storage), get = sync.get.bind(sync)
      storage.write = async value => { await write(value); if (timing === 'guard write') inject() }
      storage.cleanup = async expected => {
        inCleanup = true
        if (timing === 'cleanup entry') inject()
        await cleanup(expected)
      }
      sync.get = async keys => {
        const observed = await get(keys)
        // Simulate delivery after cleanup's comparison snapshot has already been
        // read. An empty initial deletion set must not become a wildcard delete.
        if (timing === 'cleanup read returned' && inCleanup && !injected && Array.isArray(keys) && keys.includes(VAULT_KEY)) inject()
        return observed
      }
      await expect(service.protect(action, action === 'change' ? oldPassword : '', nextPassword, revision))
        .rejects.toThrow('syncConflict')
      expect(injected).toBe(true)
      expect(sync.data.accounts).toEqual(lateAccounts)
      expect(sync.removals.flat()).not.toContain('accounts')
      expect(local.removals).toEqual([])
      expect(session.data).toEqual(beforeSession)
      expect(local.data[RECOVERY_KEY]).toHaveProperty('pending')
      expect(local.data[RECOVERY_KEY]).toHaveProperty('rekey')
      expect(await service.recoveryBackup()).toContain('Late unique account')
    }, 30_000)
  }
}

for (const key of ['accounts', 'state'] as const) {
  test(`a pre-existing local ${key} copy is exported and blocks writes without deleting it`, async () => {
    const { sync, local, session, service } = await setup()
    local.data[key] = key === 'accounts' ? structuredClone(lateAccounts) : { draft: structuredClone(lateAccounts) }
    const before = structuredClone({ sync: sync.data, local: local.data, session: session.data })
    const snapshot = await service.snapshot()
    expect(snapshot).toMatchObject({ locked: true, accounts: [], syncState: 'pending' })
    await expect(service.protect('change', oldPassword, nextPassword, snapshot.revision)).rejects.toThrow('syncPending')
    expect({ sync: sync.data, local: local.data, session: session.data }).toEqual(before)
    expect([...sync.writes, ...local.writes, ...session.writes]).toEqual([])
    expect([...sync.removals, ...local.removals, ...session.removals]).toEqual([])
    const bundle = JSON.parse(await service.recoveryBackup())
    expect(bundle.legacy.localLegacy[key]).toEqual(local.data[key])
  }, 30_000)

  test(`a local ${key} copy arriving after the cleanup snapshot is never deleted`, async () => {
    const { sync, local, storage, service } = await setup()
    const revision = (await service.snapshot()).revision
    const cleanup = storage.cleanup.bind(storage), get = local.get.bind(local)
    let inCleanup = false, injected = false
    storage.cleanup = async expected => { inCleanup = true; await cleanup(expected) }
    local.get = async keys => {
      const observed = await get(keys)
      if (inCleanup && !injected && Array.isArray(keys) && keys.includes('accounts')) {
        local.data[key] = key === 'accounts' ? structuredClone(lateAccounts) : { draft: structuredClone(lateAccounts) }
        injected = true
      }
      return observed
    }
    await expect(service.protect('change', oldPassword, nextPassword, revision)).rejects.toThrow('syncConflict')
    expect(injected).toBe(true)
    expect(local.data[key]).toBeDefined()
    expect(local.removals).toEqual([])
    expect(sync.removals.flat()).not.toContain('accounts')
    expect(await service.recoveryBackup()).toContain('Late unique account')
    expect((await service.snapshot()).syncState).toBe('pending')
  }, 30_000)
}

test('legacy cleanup rejects a changed observed key instead of removing its replacement', async () => {
  const { sync, storage } = await setup()
  sync.data.accounts = structuredClone(currentAccounts)
  const expected = await storage.read()
  sync.data.accounts = structuredClone(lateAccounts)
  await expect(storage.cleanup(expected)).rejects.toThrow('syncConflict')
  expect(sync.data.accounts).toEqual(lateAccounts)
  expect(sync.removals).toEqual([])
})
