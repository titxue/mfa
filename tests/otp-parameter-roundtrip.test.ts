import { expect, test } from 'bun:test'
import { createHmac } from 'node:crypto'
import type { Account, TOTPAlgorithm } from '../src/types'
import { TOTP } from '../src/utils/totp'
import { generateOtpauthURI } from '../src/utils/qr-generator'
import { ImportExportManager } from '../src/utils/import-export'
import { parseOTPURI } from '../src/utils/otp-import'
import { deriveKey, encryptAccounts, newSalt } from '../src/utils/vault-crypto'
import { parseOtpauthURI as parseStoreURI, UnsupportedTOTPParametersError } from './fixtures/store-2.3.8-qr-parser'

const bytes = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
const secret = TOTP.base32Encode(bytes)
const reference = (algorithm: TOTPAlgorithm, digits: number, period: number, seconds: number) => {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(seconds / period)))
  const mac = createHmac(algorithm.toLowerCase(), bytes).update(counter).digest()
  return ((mac.readUInt32BE(mac[mac.length - 1] & 15) & 0x7fffffff) % 10 ** digits).toString().padStart(digits, '0')
}

for (const algorithm of ['SHA1', 'SHA256', 'SHA512'] as const) {
  for (const digits of [6, 8] as const) {
    test(`${algorithm}/${digits}: QR URI, text and JSON exports preserve parameters and boundary codes`, async () => {
      for (const [period, name] of [[15, 'Example demo'], [45, 'Steam:demo'], [120, ':demo']] as const) {
        const account: Account = { name, secret, period,
          ...(algorithm === 'SHA1' ? {} : { algorithm }), ...(digits === 6 ? {} : { digits }) }
        const uri = generateOtpauthURI(name, secret, 'totp', account)
        const qr = parseOTPURI(uri)
        expect(qr.issues).toEqual([])
        expect(qr.accounts).toEqual([account])
        // A published client must reject an unsupported code, never silently use defaults.
        expect(() => parseStoreURI(uri)).toThrow(UnsupportedTOTPParametersError)
        const native = { ...account, website: 'example.test' }
        for (const [text, filename, expected] of [
          [uri, 'accounts.txt', account],
          [ImportExportManager.exportAccounts([native]), 'accounts.json', native],
        ] as const) {
          const imported = await ImportExportManager.importAccounts(new File([text], filename), [])
          expect(imported).toEqual({ newAccounts: [expected], duplicateCount: 0, invalidCount: 0 })
          const restored = imported.newAccounts[0]
          for (const seconds of [period - 1, period, 2 * period]) {
            expect(await TOTP.generateTOTP(restored.secret, restored.period, restored.type, seconds * 1000, restored))
              .toBe(reference(algorithm, digits, period, seconds))
          }
        }
      }
    })
  }
}

test('exporting and importing a mixed encrypted backup preserves every algorithm/digit family', async () => {
  const accounts: Account[] = (['SHA1', 'SHA256', 'SHA512'] as const).flatMap(algorithm =>
    ([6, 8] as const).map(digits => ({ name: `${algorithm}-${digits}`, secret, period: 45,
      ...(algorithm === 'SHA1' ? {} : { algorithm }), ...(digits === 6 ? {} : { digits }) })))
  const backupPassword = 'synthetic-parameter-backup-only'
  const salt = newSalt()
  const encrypted = await encryptAccounts(accounts, await deriveKey(backupPassword, salt), salt)
  expect(encrypted.version).toBe(2)
  const restored = await ImportExportManager.importAccounts(new File([JSON.stringify(encrypted)], 'backup.json'), [], backupPassword)
  expect(restored).toEqual({ newAccounts: accounts, duplicateCount: 0, invalidCount: 0 })
  for (const account of restored.newAccounts) {
    expect(await TOTP.generateTOTP(account.secret, account.period, account.type, 90_000, account))
      .toBe(reference(account.algorithm ?? 'SHA1', account.digits ?? 6, 45, 90))
  }
})
