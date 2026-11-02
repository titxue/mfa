import { afterEach, expect, spyOn, test } from 'bun:test'
import { TOTP } from '../src/utils/totp'

const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
afterEach(() => { Date.now = realNow })
const realNow = Date.now

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
