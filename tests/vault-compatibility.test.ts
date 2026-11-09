import { describe, expect, test } from 'bun:test'
import type { Account } from '../src/types'
import { VaultService, VAULT_KEY, type VaultRecord, type VaultStorage } from '../src/utils/vault'
import { validateAccounts, validateEncrypted } from '../src/utils/vault-crypto'
import { VaultService as StoreVault } from './fixtures/store-2.3.9/vault'
import { validateEncrypted as validateStoreEncrypted } from './fixtures/store-2.3.9/vault-crypto'
import { ImportExportManager } from '../src/utils/import-export'
import { TOTP } from '../src/utils/totp'

const secret = TOTP.base32Encode(new TextEncoder().encode('12345678901234567890'))
const legacy: Account[] = [
  { name: ' Legacy account ', secret, website: 'example.test' },
  { name: 'Steam demo', secret, type: 'steam' },
]
const password = 'synthetic-compatibility-password'
import { MemoryVaultStorage } from './fixtures/vault-memory'
class SharedStorage extends MemoryVaultStorage {
  constructor() { super({ accounts: structuredClone(legacy) }) }
  get record() { return this.currentRecord() }
}
const migrate = async (service: VaultService) => {
  const snapshot = await service.snapshot()
  await service.migrate(snapshot.revision)
}

describe('published 2.3.9 compatibility', () => {
  for (const encrypted of [false, true]) {
    test(`${encrypted ? 'encrypted' : 'plain'} existing accounts are read without writes and can be explicitly migrated`, async () => {
      const storage = new SharedStorage()
      const old = new StoreVault(storage)
      const initial = await old.snapshot()
      if (encrypted) await old.protect('enable', '', password, initial.revision)
      const saved = structuredClone(storage.data)
      const current = new VaultService(storage)
      const compatible = await current.snapshot()
      expect(compatible).toMatchObject({ storageMode: 'legacy', protected: encrypted, locked: false, accounts: legacy })
      expect(compatible.syncState).toBeUndefined()
      expect(storage.data).toEqual(saved)
      expect(storage.local).toBeUndefined()
      expect(storage.legacyLocal).toBeUndefined()
      await migrate(current)
      if (encrypted) { await current.lock(); await current.unlock(password) }
      expect((await current.snapshot()).accounts).toEqual(legacy)
      expect(storage.record.version).toBe(2)
      await expect(old.snapshot()).rejects.toThrow('invalid')
      const edited = legacy.map(a => ({ ...a, name: `${a.name} renamed` }))
      await current.save(edited, (await current.snapshot()).revision)
      expect((await current.snapshot()).accounts).toEqual(edited)
      await expect(old.save(legacy, initial.revision)).rejects.toThrow('invalid')
    })

    for (const parameter of [{ algorithm: 'SHA256' }, { digits: 8 }, { period: 45 }] as const) {
      test(`${encrypted ? 'encrypted' : 'plain'} ${Object.keys(parameter)[0]} blocks old reads and rename writes`, async () => {
        const storage = new SharedStorage()
        const old = new StoreVault(storage)
        const initial = await old.snapshot()
        if (encrypted) await old.protect('enable', '', password, initial.revision)
        const current = new VaultService(storage)
        await migrate(current)
        const accounts = [legacy[0], { ...legacy[1], name: 'New account', type: 'totp' as const, ...parameter }]
        await current.save(accounts, (await current.snapshot()).revision)
        expect(storage.record.version).toBe(2)
        const saved = structuredClone(storage.data)
        // Use the current revision as well as the stale one: the old format reader
        // itself must reject the record, not merely rely on a revision conflict.
        await expect(old.snapshot()).rejects.toThrow('invalid')
        await expect(old.save([{ name: 'renamed', secret }], storage.record.revision)).rejects.toThrow('invalid')
        await expect(old.save(legacy, initial.revision)).rejects.toThrow('invalid')
        expect(storage.data).toEqual(saved)
        expect((await new VaultService(storage).snapshot()).accounts).toEqual(accounts)
      })
    }
  }

  test('parameters and codes survive encryption, password changes, backups, restore and disabling protection', async () => {
    const storage = new SharedStorage()
    const service = new VaultService(storage)
    await migrate(service)
    const accounts: Account[] = [...legacy,
      { name: 'SHA256 eight digits', secret, algorithm: 'SHA256', digits: 8, period: 45 },
      { name: 'SHA512', secret, algorithm: 'SHA512', period: 120 },
    ]
    await service.save(accounts, (await service.snapshot()).revision)
    await service.protect('enable', '', password, (await service.snapshot()).revision)
    const encrypted = await service.backup(false, '')
    const encryptedData = JSON.parse(encrypted)
    expect(encryptedData.version).toBe(2)
    expect(() => validateStoreEncrypted(encryptedData)).toThrow('invalid')
    expect(() => validateEncrypted(encryptedData)).not.toThrow()
    await service.lock()
    await service.unlock(password)
    await service.protect('change', password, password + '-new', (await service.snapshot()).revision)
    expect(storage.record.version).toBe(2)
    const plain = await service.backup(true, password + '-new')
    for (const [backup, key] of [[plain, undefined], [encrypted, password]] as const) {
      const imported = await ImportExportManager.importAccounts(new File([backup], 'backup.json'), [], key)
      expect(imported.invalidCount).toBe(0)
      expect(imported.newAccounts).toEqual(accounts)
      const restored = new VaultService(new MemoryVaultStorage())
      await restored.save(imported.newAccounts, (await restored.snapshot()).revision)
      expect((await restored.snapshot()).accounts).toEqual(accounts)
      for (let i = 0; i < accounts.length; i++) {
        const code = (a: Account) => TOTP.generateTOTP(a.secret, a.period ?? 30, a.type, 59_000, a)
        expect(await code(imported.newAccounts[i])).toBe(await code(accounts[i]))
      }
    }
    await service.protect('disable', password + '-new', '', (await service.snapshot()).revision)
    expect(storage.record.version).toBe(2)
    expect((await service.snapshot()).accounts).toEqual(accounts)
    await service.save(legacy, (await service.snapshot()).revision)
    expect(storage.record.version).toBe(2) // Never downgrade a vault already migrated.
  })

  test('unsupported saved parameters are rejected without replacing existing accounts', async () => {
    const storage = new SharedStorage()
    const service = new VaultService(storage)
    await migrate(service)
    const { revision } = await service.snapshot()
    const saved = structuredClone(storage.data)
    for (const params of [
      { algorithm: 'MD5' }, { digits: 7 }, { period: 0 }, { period: 45.5 },
      { period: 121 }, { period: '45' }, { type: 'steam', algorithm: 'SHA256' },
      { type: 'steam', digits: 8 }, { type: 'steam', period: 60 },
    ]) {
      const invalid = [{ ...legacy[0], ...params }] as Account[]
      expect(() => validateAccounts(invalid)).toThrow('invalid')
      await expect(service.save(invalid, revision)).rejects.toThrow('invalid')
      expect(storage.data).toEqual(saved)
    }
  })
})
