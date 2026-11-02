import { expect, test } from 'bun:test'
import { parseOtpauthURI, UnsupportedTOTPParametersError } from '../src/utils/qr-parser'
import { generateOtpauthURI } from '../src/utils/qr-generator'
import { ImportExportManager } from '../src/utils/import-export'
import { encryptAccounts, decryptAccounts, deriveKey, newSalt } from '../src/utils/vault-crypto'

const account = { name: 'Steam alice', secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', type: 'steam' as const }
test('Steam QR round trip preserves encoder and accepts conventional issuer metadata', () => {
  expect(parseOtpauthURI(generateOtpauthURI(account.name, account.secret, account.type))).toEqual({
    name: 'alice', issuer: 'Steam', secret: account.secret, type: 'steam',
  })
  expect(parseOtpauthURI(`otpauth://totp/Steam:alice?secret=${account.secret}`).type).toBe('steam')
  expect(() => parseOtpauthURI(`otpauth://totp/alice?secret=${account.secret}&encoder=steam&digits=8`)).toThrow(UnsupportedTOTPParametersError)
})
test('plain and encrypted backups preserve Steam type and old accounts remain valid', async () => {
  const backup = ImportExportManager.exportAccounts([account])
  const imported = await ImportExportManager.importAccounts(new File([backup], 'backup.json'), [])
  expect(imported.newAccounts).toEqual([account])
  const salt = newSalt()
  const key = await deriveKey('test-password', salt)
  expect(await decryptAccounts(await encryptAccounts([account], key, salt), key)).toEqual([account])
  expect(ImportExportManager.validateImportData({ accounts: [{ name: 'old', secret: account.secret }] })).toBe(true)
  expect(ImportExportManager.validateImportData({ accounts: [{ ...account, type: 'unsupported' }] })).toBe(false)
})
