import { expect, test } from 'bun:test'
import { ImportExportManager as imports } from '../src/utils/import-export'
import { deriveKey, encryptAccounts, newSalt } from '../src/utils/vault-crypto'

const accounts = [
  { name: 'First', secret: 'JBSWY3DPEHPK3PXP' },
  { name: 'Second', secret: 'JBSWY3DPEHPK3PXP' },
]
const file = (data: unknown) => new File([JSON.stringify(data)], 'backup.json')

test('plain backup exposes the file count before importing, including an empty backup', async () => {
  const preview = await imports.readBackup(file({ accounts }))
  expect(preview.kind).toBe('plain')
  if (preview.kind !== 'plain') throw new Error('Expected plain backup')
  expect(preview.accounts).toHaveLength(2)
  expect(await imports.readBackup(file({ accounts: [] }))).toEqual({ kind: 'plain', accounts: [] })
  // A new account added after preview must still be recognized as a duplicate.
  const result = await imports.prepareAccounts(preview.accounts, [accounts[0]])
  expect(result.newAccounts).toEqual([accounts[1]])
  expect(result.duplicateCount).toBe(1)
})

test('encrypted preview requires successful decryption before exposing the count', async () => {
  const salt = newSalt()
  const key = await deriveKey('preview-password', salt)
  const encrypted = await encryptAccounts(accounts, key, salt)
  const preview = await imports.readBackup(file(encrypted))
  expect(preview.kind).toBe('encrypted')
  expect('accounts' in preview).toBe(false)
  await expect(imports.unlockBackup(preview, 'wrong')).rejects.toThrow('passwordError')
  expect(await imports.unlockBackup(preview, 'preview-password')).toEqual(accounts)
  expect(preview.kind).toBe('encrypted')
})

test('invalid files are rejected before confirmation', async () => {
  for (const data of [null, {}, { accounts: [{}] }, { format: 'mfa-encrypted' }]) {
    await expect(imports.readBackup(file(data))).rejects.toThrow('invalid')
  }
  await expect(imports.readBackup(new File(['not json'], 'bad.json'))).rejects.toThrow('invalid')
})
