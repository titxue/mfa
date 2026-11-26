import { expect, test } from 'bun:test'
import { parseOTPURI } from '../src/utils/otp-import'

const uri = 'otpauth://totp/Example:alice?secret=JBSWY3DPEHPK3PXP'
test('accepts defaults and explicit supported TOTP parameters', () => {
  const expected = [{ name: 'Example alice', secret: 'JBSWY3DPEHPK3PXP' }]
  for (const suffix of ['', '&algorithm=SHA1&digits=6&period=30', '&algorithm=sha1']) {
    expect(parseOTPURI(uri + suffix).accounts).toEqual(expected)
  }
})
test('accepts SHA-256/SHA-512, 8 digits and 60-second periods', () => {
  const secret = 'JBSWY3DPEHPK3PXP'
  expect(parseOTPURI(`${uri}&algorithm=SHA256`).accounts).toEqual([{ name: 'Example alice', secret, algorithm: 'SHA256' }])
  expect(parseOTPURI(`${uri}&algorithm=sha512`).accounts).toEqual([{ name: 'Example alice', secret, algorithm: 'SHA512' }])
  expect(parseOTPURI(`${uri}&digits=8`).accounts).toEqual([{ name: 'Example alice', secret, digits: 8 }])
  expect(parseOTPURI(`${uri}&period=60`).accounts).toEqual([{ name: 'Example alice', secret, period: 60 }])
  expect(parseOTPURI(`${uri}&algorithm=SHA512&digits=8&period=60`).accounts)
    .toEqual([{ name: 'Example alice', secret, algorithm: 'SHA512', digits: 8, period: 60 }])
})
for (const parameter of ['algorithm=MD5', 'algorithm=SHA999', 'digits=0', 'digits=7', 'period=0', 'period=abc', 'algorithm=', 'digits=', 'period=']) {
  test(`rejects unsupported parameters: ${parameter}`, () => {
    const result = parseOTPURI(uri + '&' + parameter)
    expect(result.accounts).toEqual([])
    expect(result.issues[0].reason).toBe('unsupported')
  })
}
test('malformed URI, missing secret and duplicate parameters cannot be imported', () => {
  for (const value of ['otpauth://hotp/Example?secret=ABC', 'otpauth://totp/Example', uri + '&digits=6&digits=8']) {
    const result = parseOTPURI(value)
    expect(result.accounts).toEqual([])
    expect(result.issues).toHaveLength(1)
  }
})
