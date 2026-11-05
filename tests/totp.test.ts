import { afterEach, expect, spyOn, test } from 'bun:test'
import { TOTP } from '../src/utils/totp'
import { sha256, sha512, hmacSha256, hmacSha512 } from '../src/utils/hmac-sha2'

const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
afterEach(() => { Date.now = realNow })
const realNow = Date.now

const seed32 = TOTP.base32Encode(new TextEncoder().encode('12345678901234567890123456789012'))
const seed64 = TOTP.base32Encode(new TextEncoder().encode('1234567890'.repeat(6) + '1234'))

// RFC 6238 Appendix B 八位参考值
const RFC_VECTORS = {
  SHA1: { seed: secret, values: [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']] },
  SHA256: { seed: seed32, values: [[59, '46119246'], [1111111109, '68084774'], [1111111111, '67062674'], [1234567890, '91819424'], [2000000000, '90698825'], [20000000000, '77737706']] },
  SHA512: { seed: seed64, values: [[59, '90693936'], [1111111109, '25091201'], [1111111111, '99943326'], [1234567890, '93441116'], [2000000000, '38618901'], [20000000000, '47863826']] }
} as const

for (const [algorithm, { seed, values }] of Object.entries(RFC_VECTORS)) {
  for (const [seconds, expected] of values) {
    test(`${algorithm} eight-digit RFC 6238 vector at ${seconds}`, async () => {
      Date.now = () => seconds * 1000
      expect(await TOTP.generateTOTP(seed, 30, 'totp', undefined, { algorithm: algorithm as 'SHA1' | 'SHA256' | 'SHA512', digits: 8 })).toBe(expected)
    })
  }
}

test('SHA-256 six digits and 60-second period follow the same truncation', async () => {
  expect(await TOTP.generateTOTP(seed32, 30, 'totp', 59_000, { algorithm: 'SHA256' })).toBe('119246')
  // 60 秒步长：59 秒与 30 秒同属第 0 步，119 秒属于第 1 步
  const code60 = await TOTP.generateTOTP(seed32, 60, 'totp', 59_000, { algorithm: 'SHA256' })
  expect(code60).toBe(await TOTP.generateTOTP(seed32, 60, 'totp', 30_000, { algorithm: 'SHA256' }))
  expect(code60).not.toBe(await TOTP.generateTOTP(seed32, 60, 'totp', 119_000, { algorithm: 'SHA256' }))
})

test('steam rejects non-default algorithm or digit parameters', async () => {
  Date.now = () => 59_000
  await expect(TOTP.generateTOTP(secret, 30, 'steam', undefined, { algorithm: 'SHA256' })).rejects.toThrow('invalid')
  await expect(TOTP.generateTOTP(secret, 30, 'steam', undefined, { digits: 6 })).rejects.toThrow('invalid')
})

test('pure JS SHA-256/SHA-512/HMAC match WebCrypto byte for byte', async () => {
  for (const length of [0, 1, 55, 56, 63, 64, 65, 111, 119, 120, 127, 128, 129, 1000]) {
    const message = Uint8Array.from({ length }, (_, i) => (i * 7 + 3) & 255)
    expect(Buffer.from(sha256(message)).equals(Buffer.from(await crypto.subtle.digest('SHA-256', message)))).toBe(true)
    expect(Buffer.from(sha512(message)).equals(Buffer.from(await crypto.subtle.digest('SHA-512', message)))).toBe(true)
    const key = Uint8Array.from({ length: (length % 100) + 1 }, (_, i) => (i * 13 + 5) & 255)
    const cryptoKey256 = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const cryptoKey512 = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
    expect(Buffer.from(hmacSha256(key, message)).equals(Buffer.from(await crypto.subtle.sign('HMAC', cryptoKey256, message)))).toBe(true)
    expect(Buffer.from(hmacSha512(key, message)).equals(Buffer.from(await crypto.subtle.sign('HMAC', cryptoKey512, message)))).toBe(true)
  }
})

test('pure JS fallback produces identical TOTP codes when crypto.subtle is unavailable', async () => {
  // Bun 的 crypto.subtle 属性不可重定义，改为整体替换 globalThis.crypto 模拟非安全上下文
  const original = globalThis.crypto
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { subtle: undefined } })
  try {
    Date.now = () => 59_000
    expect(await TOTP.generateTOTP(secret)).toBe('287082')
    expect(await TOTP.generateTOTP(secret, 30, 'steam', 0)).toBe('GG5F5')
    expect(await TOTP.generateTOTP(seed32, 30, 'totp', undefined, { algorithm: 'SHA256', digits: 8 })).toBe('46119246')
    expect(await TOTP.generateTOTP(seed64, 30, 'totp', undefined, { algorithm: 'SHA512', digits: 8 })).toBe('90693936')
  } finally {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: original })
  }
})

for (const [seconds, expected] of [
  [59, '287082'], [1111111109, '081804'], [1111111111, '050471'],
  [1234567890, '005924'], [2000000000, '279037'], [20000000000, '353130'],
] as const) {
  test(`SHA1 six-digit RFC 6238 vector at ${seconds}`, async () => {
    Date.now = () => seconds * 1000
    expect(await TOTP.generateTOTP(secret)).toBe(expected)
  })
}

test('regenerates when asynchronous signing crosses a time period', async () => {
  let now = 59000
  Date.now = () => now
  const sign = crypto.subtle.sign.bind(crypto.subtle)
  let calls = 0
  const signing = spyOn(crypto.subtle, 'sign').mockImplementation(async (...args) => {
    const result = await sign(...args)
    if (++calls === 1) now = 60000
    return result
  })
  try {
    expect(await TOTP.generateTOTP(secret)).toBe('359152')
    expect(calls).toBe(2)
  } finally { signing.mockRestore() }
})

for (const [seconds, expected] of [[0, 'GG5F5'], [59, 'PV9M4'], [60, 'B26KJ'], [1234567890, 'VHHQY']] as const) {
  test(`Steam Guard code at ${seconds}`, async () => {
    Date.now = () => seconds * 1000
    expect(await TOTP.generateTOTP(secret, 30, 'steam')).toBe(expected)
    expect(TOTP.formatCode(expected)).toBe(expected)
  })
}

test('normalizes Steam shared_secret without uppercasing Base64', () => {
  expect(TOTP.normalizeSecret('MTIzNDU2Nzg5MDEyMzQ1Njc4OTA=', 'steam')).toBe(secret)
  expect(TOTP.normalizeSecret(secret.toLowerCase(), 'steam')).toBe(secret)
})
