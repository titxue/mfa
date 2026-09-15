import { describe, expect, test } from 'bun:test'
import { encryptedBackupIdentity, importPreview, mergeImportChunks, normalizeOTPSecret, parseImportText, parseOTPURI } from '../src/utils/otp-import'
import { ImportExportManager } from '../src/utils/import-export'
import { importMessage, importStrings, importQueueStrings } from '../src/locales/import'
import { LANGUAGE_CONFIGS } from '../src/locales'
import { TOTP } from '../src/utils/totp'
import { encryptAccounts, deriveKey, newSalt } from '../src/utils/vault-crypto'

const secret = 'JBSWY3DPEHPK3PXP'
const uri = `otpauth://totp/Example:alice?secret=${secret}&issuer=Example`
const encoder = new TextEncoder()
function varint(value: number | bigint): number[] {
  let n = BigInt.asUintN(64, BigInt(value))
  const bytes: number[] = []
  while (n >= 128n) { bytes.push(Number(n & 127n) | 128); n >>= 7n }
  return [...bytes, Number(n)]
}
const integer = (field: number, value: number) => [...varint(field << 3), ...varint(value)]
const bytes = (field: number, value: Uint8Array | number[]) => [...varint((field << 3) | 2), ...varint(value.length), ...value]
const string = (field: number, value: string) => bytes(field, encoder.encode(value))
function account(name = 'alice', algorithm = 1, digits = 1, type = 2) {
  return [...bytes(1, TOTP.base32Decode(secret)), ...string(2, name), ...string(3, 'Example'),
    ...integer(4, algorithm), ...integer(5, digits), ...integer(6, type)]
}
function migration(entries = [account()], size = 1, index = 0, id = 42, extra: number[] = []) {
  const payload = [...entries.flatMap(entry => bytes(1, entry)), ...integer(2, 1), ...integer(3, size), ...integer(4, index), ...integer(5, id), ...extra]
  return `otpauth-migration://offline?data=${encodeURIComponent(btoa(String.fromCharCode(...payload)))}`
}

describe('standard OTP import', () => {
  test('names, URI decoding, defaults and supported explicit parameters', () => {
    expect(parseOTPURI(uri).accounts).toEqual([{ name: 'Example alice', secret }])
    expect(parseOTPURI(`${uri}&algorithm=SHA1&digits=6&period=30`).issues).toEqual([])
    expect(parseOTPURI(`otpauth://totp/Example:alice?secret=${secret}`).accounts[0].name).toBe('Example alice')
    expect(parseOTPURI(`otpauth://totp/Example%20alice?issuer=Example&secret=${secret}`).accounts[0].name).toBe('Example alice')
    expect(parseOTPURI(`otpauth://totp/%E6%B5%8B%E8%AF%95%3A%E5%B0%8F%E6%98%8E?secret=${secret}`).accounts[0].name).toBe('测试 小明')
    expect(parseOTPURI(`otpauth://totp/alice?secret=${secret.toLowerCase()}`).accounts[0].secret).toBe(secret)
  })
  test.each(['algorithm=SHA256', 'algorithm=SHA512', 'algorithm=MD5', 'digits=8', 'digits=0', 'period=60', 'period=0', 'period=abc'])('rejects unsupported %s without changing parameters', parameter => {
    const result = parseOTPURI(`${uri}&${parameter}`)
    expect(result.accounts).toEqual([])
    expect(result.issues).toEqual([{ name: 'Example alice', reason: 'unsupported' }])
  })
  test('HOTP is never converted to TOTP', () => {
    expect(parseOTPURI(uri.replace('/totp/', '/hotp/')).issues[0].reason).toBe('unsupported')
  })
  test.each(['', 'otpauth://totp/', 'https://example.test/', `${uri}&secret=OTHER`, `${uri}&digits=6&digits=8`, 'otpauth://totp/%FF?secret=ABC', 'otpauth://totp/a?secret=!!'])('rejects malformed URI %s', value => {
    expect(parseOTPURI(value).accounts).toHaveLength(0)
    expect(parseOTPURI(value).issues).toHaveLength(1)
  })
  test('normalizes padded base32 and rejects invalid lengths/alphabet', () => {
    expect(normalizeOTPSecret(' my====== ')).toBe('MY')
    for (const value of ['', 'A', 'AAA', 'AAAAAA', '12', 'AB=C']) expect(() => normalizeOTPSecret(value)).toThrow('invalid')
  })
  test('multiline text keeps valid entries and reports bad lines', async () => {
    const chunks = await parseImportText(`\uFEFF# comment\r\n${uri}\n\ninvalid\n${uri}&digits=8`)
    const result = importPreview(chunks, [])
    expect(result.accounts).toHaveLength(1)
    expect(result.issues.map(i => i.reason)).toEqual(['invalid', 'unsupported'])
  })
})

describe('Google migration wire decoding', () => {
  test('accepts version 2 single-account exports without issuer or batch ID', () => {
    // Synthetic reproduction of a v2 export; never retain a user's QR secrets.
    const entry = [...bytes(1, TOTP.base32Decode(secret)), ...string(2, 'Demo'),
      ...integer(4, 1), ...integer(5, 1), ...integer(6, 2)]
    const payload = [...bytes(1, entry), ...integer(2, 2), ...integer(3, 1), ...integer(4, 0)]
    const uri = 'otpauth-migration://offline?data=' + encodeURIComponent(btoa(String.fromCharCode(...payload)))
    const result = parseOTPURI(uri)
    expect(result.accounts).toEqual([{ name: 'Demo', secret }])
    expect(result.issues).toEqual([])
    expect(importPreview([result], []).complete).toBe(true)
  })
  test('decodes multiple accounts and matches the original secret bytes', () => {
    const result = parseOTPURI(migration([account(), account('中文账户')]))
    expect(result.accounts).toEqual([{ name: 'Example alice', secret }, { name: 'Example 中文账户', secret }])
    expect(result.batch).toEqual({ id: 42, size: 1, index: 0 })
    expect(result.issues).toEqual([])
  })
  test('accepts escaped, raw, URL-safe and unpadded base64', () => {
    const value = migration([account('测试?>>>')])
    const raw = decodeURIComponent(value)
    const prefix = 'otpauth-migration://offline?data='
    const encoded = raw.slice(prefix.length)
    for (const data of [encoded, encoded.replace(/\+/g, '-').replace(/\//g, '_'), encoded.replace(/=+$/, '')]) {
      expect(parseOTPURI(prefix + data).accounts).toEqual(parseOTPURI(value).accounts)
    }
  })
  test.each([[2, 1, 2], [3, 1, 2], [0, 1, 2], [1, 2, 2], [1, 6, 2], [1, 0, 2], [1, 1, 1], [1, 1, 0], [1, 1, 99]])('rejects enums algorithm=%i digits=%i type=%i', (algorithm, digits, type) => {
    const result = parseOTPURI(migration([account('unsupported', algorithm, digits, type), account('valid')]))
    expect(result.accounts.map(a => a.name)).toEqual(['Example valid'])
    expect(result.issues).toEqual([{ name: 'Example unsupported', reason: 'unsupported' }])
  })
  test('reports missing secret/name and missing required OTP enums', () => {
    for (const fields of [string(2, 'missing secret'), bytes(1, [1]), [...bytes(1, [1]), ...string(2, 'missing enums')]]) {
      const result = parseOTPURI(migration([fields]))
      expect(result.accounts).toHaveLength(0)
      expect(result.issues).toHaveLength(1)
    }
  })
  test('skips unknown protobuf fields but rejects wrong wire types for known fields', () => {
    expect(parseOTPURI(migration([account()], 1, 0, 42, [...integer(25, 9), ...bytes(26, [1, 2])])).accounts).toHaveLength(1)
    const wrongIssuer = [...account(), (3 << 3) | 5, 0, 0, 0, 0]
    expect(parseOTPURI(migration([wrongIssuer])).issues[0].reason).toBe('invalid')
  })
  test('rejects truncation, invalid base64, malformed varints, duplicate fields and unknown version', () => {
    const prefix = 'otpauth-migration://offline?data='
    const bad = [[10, 255], [8, ...Array(11).fill(128)], [0], [15], [...bytes(1, account()), ...integer(2, 9)], [...bytes(1, account()), ...integer(2, 1), ...integer(2, 1)]]
    for (const data of bad) {
      const result = parseOTPURI(prefix + encodeURIComponent(btoa(String.fromCharCode(...data))))
      expect(result.accounts).toHaveLength(0); expect(result.issues).toHaveLength(1)
    }
    expect(parseOTPURI(prefix + '%%%').issues[0].reason).toBe('invalid')
    expect(parseOTPURI(migration() + '&data=AAAA').issues[0].reason).toBe('invalid')
    expect(parseOTPURI(migration().replace('offline', 'other')).issues[0].reason).toBe('invalid')
  })
  test('validates batch ranges and supports signed batch IDs', () => {
    for (const value of [migration(undefined, 0), migration(undefined, 2, 2), migration(undefined, 1001)]) {
      expect(parseOTPURI(value).accounts).toHaveLength(0)
    }
    expect(parseOTPURI(migration(undefined, 2, 0, -123)).batch?.id).toBe(-123)
  })
})

describe('preview and batch collection', () => {
  test('collects out of order, ignores duplicate scans and requires every part', () => {
    const first = parseOTPURI(migration([account('first')], 2, 0))
    const second = parseOTPURI(migration([account('second')], 2, 1))
    let chunks = mergeImportChunks([], [second, second])
    expect(chunks).toHaveLength(1)
    expect(importPreview(chunks, []).complete).toBe(false)
    chunks = mergeImportChunks(chunks, [first])
    const result = importPreview(chunks, [])
    expect(result.complete).toBe(true)
    expect(result.progress).toEqual([{ id: 42, size: 2, received: 2 }])
    expect(result.accounts).toHaveLength(2)
  })
  test('separates batch IDs and blocks conflicting index or size', () => {
    const first = parseOTPURI(migration([account()], 2, 0))
    const other = parseOTPURI(migration([account('other')], 2, 1, 99))
    expect(importPreview(mergeImportChunks([], [first, other]), []).progress).toHaveLength(2)
    for (const conflict of [parseOTPURI(migration([account('changed')], 2, 0)), parseOTPURI(migration([account()], 3, 1))]) {
      const result = importPreview(mergeImportChunks([], [first, conflict]), [])
      expect(result.complete).toBe(false)
      expect(result.issues[0].reason).toBe('batchConflict')
      expect(result.accounts[0].name).toBe('Example alice')
    }
  })
  test('deduplicates within and across sources without replacing same-name accounts', () => {
    const chunks = [parseOTPURI(uri), parseOTPURI(uri), parseOTPURI(uri.replace('alice', 'bob'))]
    const existing = [{ name: 'Example alice', secret: 'MY' }]
    const result = importPreview(chunks, existing)
    expect(result.accounts.map(a => a.name)).toEqual(['Example bob'])
    expect(result.duplicates).toEqual(['Example alice', 'Example alice'])
    expect(existing[0].secret).toBe('MY')
    expect(mergeImportChunks([], [parseOTPURI(migration()), parseOTPURI(migration())])).toHaveLength(1)
  })
})

describe('backup formats and compatibility', () => {
  test('encrypted queue identity ignores JSON layout and key order, but distinguishes backups', async () => {
    const salt = newSalt(), key = await deriveKey('test-password', salt)
    const encrypted = await encryptAccounts([{ name: 'Demo', secret }], key, salt)
    const reordered = Object.fromEntries(Object.entries(encrypted).reverse())
    expect(encryptedBackupIdentity(JSON.stringify(encrypted))).toBe(encryptedBackupIdentity(JSON.stringify(reordered, null, 2)))
    const other = await encryptAccounts([{ name: 'Demo', secret }], key, salt)
    expect(encryptedBackupIdentity(JSON.stringify(other))).not.toBe(encryptedBackupIdentity(JSON.stringify(encrypted)))
    expect(() => encryptedBackupIdentity('{}')).toThrow()
  })
  test('all languages explain the pending-backup blocker and provide a skip action', () => {
    for (const { code } of LANGUAGE_CONFIGS) {
      const strings = importQueueStrings(code)
      expect(strings.skip).toBeTruthy()
      expect(strings.waiting).toContain('{count}')
    }
  })
  test('imports reference-project JSON with issuer, UTF-8 and per-entry HOTP rejection', async () => {
    const entries = [
      { name: 'alice', issuer: 'Example', secret, type: 'totp', counter: null, url: uri },
      { name: '小明', issuer: '测试', secret, type: 'totp' },
      { name: 'HOTP demo', secret, type: 'hotp', counter: 4 },
    ]
    const result = importPreview(await parseImportText(JSON.stringify(entries)), [])
    expect(result.accounts.map(a => a.name)).toEqual(['Example alice', '测试 小明'])
    expect(result.issues).toEqual([{ name: 'HOTP demo', reason: 'unsupported' }])
  })
  test('does not ignore JSON or embedded URI parameters or mismatched secrets', async () => {
    const items = [{ name: 'a', secret, digits: 8 }, { name: 'b', secret, url: uri + '&period=60' }, { name: 'c', secret: 'MY', url: uri }]
    const result = importPreview(await parseImportText(JSON.stringify(items)), [])
    expect(result.accounts).toHaveLength(0)
    expect(result.issues.map(i => i.reason)).toEqual(['unsupported', 'unsupported', 'invalid'])
  })
  test('preserves original backup account names, website and encrypted imports', async () => {
    const accounts = [{ name: 'Original name', secret, website: 'example.test' }]
    const plain = ImportExportManager.exportAccounts(accounts)
    expect((await ImportExportManager.importAccounts(new File([plain], 'backup.json'), [])).newAccounts).toEqual(accounts)
    const salt = newSalt(), key = await deriveKey('test-password', salt)
    const encrypted = JSON.stringify(await encryptAccounts(accounts, key, salt))
    await expect(parseImportText(encrypted)).rejects.toThrow('passwordRequired')
    await expect(parseImportText(encrypted, 'wrong')).rejects.toThrow('passwordError')
    expect((await parseImportText(encrypted, 'test-password'))[0].accounts).toEqual(accounts)
  })
  test('mixed invalid rows do not hide good rows; oversized/invalid documents fail', async () => {
    const result = (await parseImportText(JSON.stringify({ accounts: [null, { name: 'good', secret }, { name: 'bad', secret: '!' }] })))[0]
    expect(result.accounts).toHaveLength(1); expect(result.issues).toHaveLength(2)
    for (const text of ['{}', '[', '', '# comment', 'x'.repeat(2 * 1024 * 1024 + 1)]) await expect(parseImportText(text)).rejects.toThrow()
  })
  test('file API cannot bypass incomplete batch protection', async () => {
    await expect(ImportExportManager.importAccounts(new File([migration(undefined, 2)], 'data.txt'), [])).rejects.toThrow('incompleteBatch')
    const result = await ImportExportManager.importAccounts(new File([uri], 'data.txt'), [])
    expect(result.newAccounts).toEqual([{ name: 'Example alice', secret }])
  })
  test('every registered language provides all import messages and placeholders', () => {
    const english = importStrings('en-US')
    for (const { code } of LANGUAGE_CONFIGS) {
      const strings = importStrings(code)
      expect(Object.keys(strings)).toEqual(Object.keys(english))
      for (const key of Object.keys(english) as (keyof typeof english)[]) {
        expect(strings[key]).toBeTruthy()
        expect(strings[key].match(/\{\w+\}/g)?.sort()).toEqual(english[key].match(/\{\w+\}/g)?.sort())
      }
    }
    expect(importMessage(english.summary, { selected: 1, total: 3 })).toBe('1 of 3 accounts selected')
  })
})
