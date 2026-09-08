import { describe, test, expect } from 'bun:test'
import { VaultService, VAULT_KEY, browserVaultStorage, type VaultRecord, type VaultStorage } from '../src/utils/vault'
import { deriveKey, newSalt, encryptAccounts, decryptAccounts } from '../src/utils/vault-crypto'
import { ImportExportManager } from '../src/utils/import-export'
import { securityStrings, securitySettingsStrings, unlockStrings } from '../src/locales/security'
import { LANGUAGE_CONFIGS } from '../src/locales'

const accounts = [{ name: 'Test account', secret: 'JBSWY3DPEHPK3PXP', website: 'example.test' }]
const password = 'test-password-123'
class MemoryStorage implements VaultStorage {
  data: Record<string, unknown> = { accounts: structuredClone(accounts), state: { secretValue: accounts[0].secret } }
  session: Awaited<ReturnType<VaultStorage['getSession']>>
  failWrite = false
  failCleanup = false
  async read() { return structuredClone(this.data) }
  async write(record: VaultRecord) {
    if (this.failWrite) throw new Error('storageError')
    this.data[VAULT_KEY] = structuredClone(record)
  }
  async cleanup() {
    if (this.failCleanup) throw new Error('storageError')
    delete this.data.accounts; delete this.data.state
  }
  async getSession() { return structuredClone(this.session) }
  async setSession(value?: typeof this.session) { this.session = structuredClone(value) }
}
const setup = async () => {
  const storage = new MemoryStorage()
  const service = new VaultService(storage)
  await service.snapshot()
  return { storage, service }
}
const protect = async (service: VaultService) => {
  const snapshot = await service.snapshot()
  await service.protect('enable', '', password, snapshot.revision)
}

describe('vault encryption and lifecycle', () => {
  test('migrates the legacy accounts and clears secret-bearing form state', async () => {
    const { storage, service } = await setup()
    expect(await service.snapshot()).toMatchObject({ accounts, protected: false, locked: false })
    expect(storage.data.accounts).toBeUndefined()
    expect(storage.data.state).toBeUndefined()
  })
  test('encrypts all account fields; session is separate from persistent data', async () => {
    const { storage, service } = await setup()
    await protect(service)
    const serialized = JSON.stringify(storage.data)
    for (const value of Object.values(accounts[0])) expect(serialized).not.toContain(value)
    expect(serialized).not.toContain(password)
    expect(storage.session?.key.k).toBeDefined()
    expect(await service.snapshot()).toMatchObject({ accounts, protected: true, locked: false })
    await service.lock()
    expect(await service.snapshot()).toMatchObject({ accounts: [], protected: true, locked: true })
    await service.unlock(password)
    expect((await service.snapshot()).accounts).toEqual(accounts)
  })
  test('wrong passwords and tampering do not overwrite accounts', async () => {
    const { storage, service } = await setup()
    await protect(service); await service.lock()
    const saved = structuredClone(storage.data)
    await expect(service.unlock('wrong')).rejects.toThrow('passwordError')
    expect(storage.data).toEqual(saved)
    const record = storage.data[VAULT_KEY] as Extract<VaultRecord, { mode: 'encrypted' }>
    record.data.ciphertext = (record.data.ciphertext.startsWith('A') ? 'B' : 'A') + record.data.ciphertext.slice(1)
    await expect(service.unlock(password)).rejects.toThrow('passwordError')
  })
  test('each encryption uses a different IV and ciphertext', async () => {
    const salt = newSalt(), key = await deriveKey(password, salt)
    const a = await encryptAccounts(accounts, key, salt), b = await encryptAccounts(accounts, key, salt)
    expect(a.iv).not.toBe(b.iv); expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(await decryptAccounts(a, key)).toEqual(accounts)
  })
  test('changing password invalidates old password; disabling requires password', async () => {
    const { service } = await setup(); await protect(service)
    let snapshot = await service.snapshot()
    await expect(service.protect('disable', 'wrong', '', snapshot.revision)).rejects.toThrow('passwordError')
    await service.protect('change', password, 'new-password-456', snapshot.revision)
    await service.lock()
    await expect(service.unlock(password)).rejects.toThrow('passwordError')
    await service.unlock('new-password-456')
    snapshot = await service.snapshot()
    await service.protect('disable', 'new-password-456', '', snapshot.revision)
    expect(await service.snapshot()).toMatchObject({ protected: false, locked: false, accounts })
  })
  test('worker restart retains session; browser restart clears it', async () => {
    const { service, storage } = await setup(); await protect(service)
    const worker = new VaultService(storage)
    expect((await worker.snapshot()).locked).toBe(false)
    storage.session = undefined
    expect((await new VaultService(storage).snapshot()).locked).toBe(true)
  })
  test('unknown format is preserved and cannot be overwritten', async () => {
    const { service, storage } = await setup()
    storage.data[VAULT_KEY] = { version: 42, revision: 'future' }
    await expect(service.snapshot()).rejects.toThrow('invalid')
    await expect(service.save([], 'future')).rejects.toThrow('invalid')
    expect(storage.data[VAULT_KEY]).toEqual({ version: 42, revision: 'future' })
  })
  test('failed encryption write preserves the original record and protection mode', async () => {
    const { service, storage } = await setup()
    const saved = structuredClone(storage.data)
    storage.failWrite = true
    await expect(protect(service)).rejects.toThrow('storageError')
    expect(storage.data).toEqual(saved)
    expect(storage.session).toBeUndefined()
  })
  test('Chrome may reorder object properties on storage readback', async () => {
    const { service, storage } = await setup()
    const write = storage.write.bind(storage)
    storage.write = async record => {
      const reordered = JSON.parse(JSON.stringify(record), (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value)
      await write(reordered)
    }
    await protect(service)
    expect((await service.snapshot()).locked).toBe(false)
    await service.save(accounts, (await service.snapshot()).revision)
    expect((await service.snapshot()).accounts).toEqual(accounts)
  })
  test('failed cleanup is retried without reimporting stale plaintext', async () => {
    const { service, storage } = await setup()
    storage.data.accounts = [{ name: 'stale', secret: 'STALE' }]
    storage.failCleanup = true
    await expect(service.snapshot()).rejects.toThrow('storageError')
    storage.failCleanup = false
    expect((await service.snapshot()).accounts).toEqual(accounts)
    expect(storage.data.accounts).toBeUndefined()
  })
  test('locked save fails and does not overwrite encrypted data', async () => {
    const { service, storage } = await setup(); await protect(service); await service.lock()
    const saved = structuredClone(storage.data)
    await expect(service.save([], (await service.snapshot()).revision)).rejects.toThrow('locked')
    expect(storage.data).toEqual(saved)
  })
  test('password minimum and malformed account data are rejected', async () => {
    const { service } = await setup()
    const { revision } = await service.snapshot()
    await expect(service.protect('enable', '', 'short', revision)).rejects.toThrow('passwordLength')
    await expect(service.save([{ name: '', secret: 'x' }], revision)).rejects.toThrow('invalid')
  })
})

describe('two devices sharing sync storage', () => {
  test('remote changes, stale revisions, remote protection and rekey', async () => {
    const { service: a, storage: sa } = await setup()
    const sb = new MemoryStorage()
    // Shared cloud data but independent device sessions.
    sb.data = sa.data
    const b = new VaultService(sb)
    const stale = await b.snapshot()
    const updated = [...accounts, { name: 'Second', secret: accounts[0].secret }]
    await a.save(updated, stale.revision)
    expect((await b.snapshot()).accounts).toEqual(updated)
    await expect(b.save([], stale.revision)).rejects.toThrow('conflict')
    await protect(a)
    expect((await b.snapshot()).locked).toBe(true)
    await b.unlock(password)
    await a.protect('change', password, 'new-password-456', (await a.snapshot()).revision)
    expect((await b.snapshot()).locked).toBe(true)
    expect(sb.session).toBeUndefined()
    await b.unlock('new-password-456')
    await b.save([...updated].reverse(), (await b.snapshot()).revision)
    expect((await a.snapshot()).accounts).toEqual([...updated].reverse())
    await a.protect('disable', 'new-password-456', '', (await a.snapshot()).revision)
    expect((await b.snapshot()).protected).toBe(false)
  })
  test('local operation queue survives a failure', async () => {
    const { service } = await setup()
    const first = service.run(async () => { throw new Error('first') })
    const second = service.run(() => service.snapshot())
    await expect(first).rejects.toThrow('first')
    expect((await second).accounts).toEqual(accounts)
  })
})

describe('backups and translations', () => {
  test('encrypted backup keeps its original password after rekey', async () => {
    const { service } = await setup(); await protect(service)
    const backup = await service.backup(false, '')
    expect(backup).not.toContain(accounts[0].secret)
    await service.protect('change', password, 'new-password-456', (await service.snapshot()).revision)
    const result = await ImportExportManager.importAccounts(new File([backup], 'backup.json'), [], password)
    expect(result.newAccounts).toEqual(accounts)
    await expect(ImportExportManager.importAccounts(new File([backup], 'backup.json'), [], 'wrong')).rejects.toThrow('passwordError')
  })
  test('plain export requires current password and preserves website; import deduplicates within file', async () => {
    const { service } = await setup(); await protect(service)
    await expect(service.backup(true, 'wrong')).rejects.toThrow('passwordError')
    const backup = await service.backup(true, password)
    expect(JSON.parse(backup).accounts).toEqual(accounts)
    const file = new File([JSON.stringify({ accounts: [...accounts, ...accounts] })], 'legacy.json')
    const result = await ImportExportManager.importAccounts(file, [])
    expect(result.newAccounts).toEqual(accounts); expect(result.duplicateCount).toBe(1)
  })
  test('all registered languages have complete security text', () => {
    for (const { code } of LANGUAGE_CONFIGS) {
      const strings = securityStrings(code)
      expect(Object.values(unlockStrings(code)).every(v => typeof v === 'string' && v.length > 0)).toBe(true)
      expect(Object.values(securitySettingsStrings(code)).every(v => typeof v === 'string' && v.length > 0)).toBe(true)
      expect(Object.keys(strings)).toEqual(Object.keys(securityStrings('en-US')))
      expect(Object.values(strings).every(v => typeof v === 'string' && v.length > 0)).toBe(true)
      if (code !== 'en-US') expect(strings.title).not.toBe(securityStrings('en-US').title)
    }
  })
})

test('Chrome quota preflight prevents oversized writes', async () => {
  const old = globalThis.chrome
  let writes = 0
  globalThis.chrome = { storage: { sync: { getBytesInUse: async () => 0, set: async () => { writes++ } } } } as unknown as typeof chrome
  try {
    await expect(browserVaultStorage.write({ version: 1, revision: 'large', mode: 'plain', accounts: [{ ...accounts[0], name: 'a'.repeat(8200) }] })).rejects.toThrow('quota')
    expect(writes).toBe(0)
  } finally { globalThis.chrome = old }
})
