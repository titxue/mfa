import { describe, expect, test, spyOn } from 'bun:test'
import { TOTP } from '../src/utils/totp'
import { parseManualSecret, parseImportText, parseOTPURI, importPreview, IMPORT_ACCEPT } from '../src/utils/otp-import'
import { generateOtpauthURI } from '../src/utils/qr-generator'
import { ImportExportManager } from '../src/utils/import-export'
import { validateAccounts, deriveKey, encryptAccounts, decryptAccounts, newSalt } from '../src/utils/vault-crypto'
import { steamStrings } from '../src/locales/steam'
import { LANGUAGE_CONFIGS } from '../src/locales'
import type { Account } from '../src/types'

// Synthetic bytes 0..19. Expected codes independently calculated with Python hmac/sha1.
const shared = 'AAECAwQFBgcICQoLDA0ODxAREhM='
const secret = 'AAAQEAYEAUDAOCAJBIFQYDIOB4IBCEQT'
const vectors: [number, string][] = [[0, 'YFG53'], [29, 'YFG53'], [30, 'YH76M'], [59, 'YH76M'], [60, '23MGH'], [1700000000, '7MQGM'], [2000000000, 'QRY56']]
const steam: Account = { name: 'Steam demo', secret, type: 'steam', website: 'steamcommunity.com' }

describe('Steam Guard generation', () => {
  test('matches independent reference vectors, including 30-second boundaries', async () => {
    const now = spyOn(Date, 'now')
    try {
      for (const [time, code] of vectors) {
        now.mockReturnValue(time * 1000)
        expect(await TOTP.generateTOTP(secret, 30, 'steam')).toBe(code)
      }
    } finally { now.mockRestore() }
  })
  test('pure JS fallback produces the same Steam codes as WebCrypto', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!
    const now = spyOn(Date, 'now')
    try {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined })
      for (const [time, code] of vectors) {
        now.mockReturnValue(time * 1000)
        expect(await TOTP.generateTOTP(secret, 30, 'steam')).toBe(code)
      }
    } finally { Object.defineProperty(globalThis, 'crypto', descriptor); now.mockRestore() }
  })
  test('legacy TOTP defaults still match RFC 6238 and formatting keeps Steam contiguous', async () => {
    const now = spyOn(Date, 'now').mockReturnValue(59000)
    try {
      expect(await TOTP.generateTOTP('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')).toBe('287082')
      expect(TOTP.formatCode('123456')).toBe('123 456')
      expect(TOTP.formatCode('YFG53')).toBe('YFG53')
      expect(TOTP.formatCode('-----')).toBe('-----')
    } finally { now.mockRestore() }
    await expect(TOTP.generateTOTP(secret, 60, 'steam')).rejects.toThrow('invalid')
    await expect(TOTP.generateTOTP(secret, 30, 'unknown' as Account['type'])).rejects.toThrow('invalid')
  })
  test('Base64 conversion preserves case and binary key material', () => {
    expect(TOTP.steamSecretToBase32(shared)).toBe(secret)
    expect(TOTP.steamSecretToBase32(shared.replace(/=+$/, ''))).toBe(secret)
    expect(TOTP.steamSecretToBase32(` ${shared}\n`)).toBe(secret)
    expect(TOTP.steamSecretToBase64(secret)).toBe(shared)
    expect(TOTP.steamSecretToBase32(shared.toUpperCase())).not.toBe(secret)
    for (const input of ['', '!!', 'A', 'AB=C', '====', 'AR==']) expect(() => TOTP.steamSecretToBase32(input)).toThrow()
  })
})

describe('Steam import and round trips', () => {
  test('manual entry identifies Steam Base64 and preserves standard Base32 without a selector', () => {
    expect(parseManualSecret(shared)).toEqual({ secret, type: 'steam' })
    expect(parseManualSecret(shared.replace(/=+$/, ''))).toEqual({ secret, type: 'steam' })
    expect(parseManualSecret(' jbswy3dpehpk3pxp ')).toEqual({ secret: 'JBSWY3DPEHPK3PXP' })
    expect(parseManualSecret(secret)).toEqual({ secret })
    expect(parseManualSecret('MY======')).toEqual({ secret: 'MY' })
    expect(() => parseManualSecret('not@a-key')).toThrow()
    expect(() => parseManualSecret(btoa('too short!'))).toThrow()
  })
  test('explicit QR metadata wins over ambiguous raw encodings', () => {
    expect(parseManualSecret('MY======', 'totp')).toEqual({ secret: 'MY' })
    expect(parseManualSecret(btoa('abcdef'), 'steam').type).toBe('steam')
  })
  test('imports a maFile with only shared_secret/account_name and drops unrelated credentials', async () => {
    const data = { shared_secret: shared, account_name: 'demo', identity_secret: 'identity-not-for-codes', revocation_code: 'recovery-private', Session: { AccessToken: 'token-private' } }
    const parsed = await parseImportText(JSON.stringify(data))
    expect(parsed[0].accounts).toEqual([steam])
    expect(parsed[0].issues).toEqual([])
    expect(JSON.stringify(parsed)).not.toContain('private')
    expect(JSON.stringify(parsed)).not.toContain('identity')
    const imported = await ImportExportManager.importAccounts(new File([JSON.stringify(data)], 'demo.maFile'), [])
    expect(imported.newAccounts).toEqual([steam])
    expect(IMPORT_ACCEPT).toContain('.maFile')
  })
  test('mixed maFile rows keep valid accounts, report malformed keys and deduplicate names', async () => {
    const result = importPreview(await parseImportText(JSON.stringify([
      { account_name: 'demo', shared_secret: shared },
      { account_name: 'bad', shared_secret: '!!!!' },
      { account_name: 'Steam demo', shared_secret: shared },
      { shared_secret: shared },
    ])), [])
    expect(result.accounts).toEqual([steam])
    expect(result.duplicates).toEqual(['Steam demo'])
    expect(result.issues).toHaveLength(2)
  })
  test('Steam QR export retains encoder, length and exact name on reimport', () => {
    const uri = generateOtpauthURI('my steam account', secret, 'steam')
    const params = new URL(uri).searchParams
    expect(params.get('encoder')).toBe('steam')
    expect(params.get('digits')).toBe('5')
    expect(parseOTPURI(uri).accounts).toEqual([{ name: 'my steam account', secret, type: 'steam' }])
    expect(parseOTPURI(uri).issues).toEqual([])
  })
  test('requires explicit Steam encoding and rejects unsupported or conflicting parameters', () => {
    const standard = generateOtpauthURI('Steam demo', secret)
    expect(parseOTPURI(standard).accounts[0].type).toBeUndefined()
    expect(parseOTPURI(standard.replace('digits=6', 'digits=5')).issues[0].reason).toBe('unsupported')
    const uri = generateOtpauthURI('Steam demo', secret, 'steam')
    for (const bad of [uri.replace('SHA1', 'SHA256'), uri.replace('digits=5', 'digits=6'), uri.replace('period=30', 'period=60'), uri.replace('/totp/', '/hotp/'), uri.replace('encoder=steam', 'encoder=unknown'), uri + '&encoder=steam']) {
      expect(parseOTPURI(bad).accounts).toHaveLength(0)
      expect(parseOTPURI(bad).issues).toHaveLength(1)
    }
  })
  test('reference-style JSON URI parameters preserve Steam rather than silently generating numbers', async () => {
    const url = generateOtpauthURI('demo', secret, 'steam')
    const result = await parseImportText(JSON.stringify([{ name: 'demo', secret, type: 'totp', digits: 5, url }]))
    expect(result[0].accounts).toEqual([{ name: 'demo', secret, type: 'steam' }])
    const bad = await parseImportText(JSON.stringify([{ ...steam, url: generateOtpauthURI(steam.name, secret) }]))
    expect(bad[0].accounts).toHaveLength(0)
  })
  test('plain and encrypted backups preserve type while older accounts keep numeric defaults', async () => {
    const accounts: Account[] = [steam, { name: 'Legacy', secret }]
    const plain = ImportExportManager.exportAccounts(accounts)
    expect((await parseImportText(plain))[0].accounts).toEqual(accounts)
    const salt = newSalt(), key = await deriveKey('test-password', salt)
    const encrypted = await encryptAccounts(accounts, key, salt)
    expect(await decryptAccounts(encrypted, key)).toEqual(accounts)
    expect((await parseImportText(JSON.stringify(encrypted), 'test-password'))[0].accounts).toEqual(accounts)
    expect(() => validateAccounts([{ ...steam, type: 'unknown' }])).toThrow('invalid')
    expect(() => validateAccounts(accounts)).not.toThrow()
  })
  test('all registered languages have complete Steam messages', () => {
    const english = steamStrings('en-US')
    for (const { code } of LANGUAGE_CONFIGS) {
      const strings = steamStrings(code)
      expect(Object.keys(strings)).toEqual(Object.keys(english))
      expect(Object.values(strings).every(Boolean)).toBe(true)
    }
  })
})
