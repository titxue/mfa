import { expect, test } from 'bun:test'
import { ImportExportManager as imports } from '../src/utils/import-export'
import { importPreview } from '../src/utils/otp-import'
import { deriveKey, encryptAccounts, newSalt } from '../src/utils/vault-crypto'

const accounts = [
  { name: 'First', secret: 'JBSWY3DPEHPK3PXP' },
  { name: 'Second', secret: 'JBSWY3DPEHPK3PXP' },
]
const file = (data: unknown) => new File([JSON.stringify(data)], 'backup.json')

test('plain backup exposes the file count and rechecks duplicates when confirming', async () => {
  const chunks = await imports.parseFile(file({ accounts }))
  expect(importPreview(chunks, []).accounts).toHaveLength(2)
  expect(importPreview(await imports.parseFile(file({ accounts: [] })), []).accounts).toEqual([])
  const result = importPreview(chunks, [accounts[0]])
  expect(result.accounts).toEqual([accounts[1]])
  expect(result.duplicates).toEqual(['First'])
})

test('encrypted preview requires successful decryption before exposing the count', async () => {
  const salt = newSalt(), key = await deriveKey('preview-password', salt)
  const encrypted = file(await encryptAccounts(accounts, key, salt))
  await expect(imports.parseFile(encrypted)).rejects.toThrow('passwordRequired')
  await expect(imports.parseFile(encrypted, 'wrong')).rejects.toThrow('passwordError')
  expect(importPreview(await imports.parseFile(encrypted, 'preview-password'), []).accounts).toEqual(accounts)
  await expect(imports.parseFile(encrypted)).rejects.toThrow('passwordRequired')
})

test('invalid documents and rows cannot supply accounts for confirmation', async () => {
  for (const data of [{}, { format: 'mfa-encrypted' }]) {
    await expect(imports.parseFile(file(data))).rejects.toThrow('invalid')
  }
  for (const source of [file(null), file({ accounts: [{}] }), new File(['not json'], 'bad.json')]) {
    const preview = importPreview(await imports.parseFile(source), [])
    expect(preview.accounts).toEqual([])
    expect(preview.issues).toHaveLength(1)
  }
})
