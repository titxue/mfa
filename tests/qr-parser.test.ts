import { expect, test } from 'bun:test'
import { parseOTPURI } from '../src/utils/otp-import'

const uri = 'otpauth://totp/Example:alice?secret=JBSWY3DPEHPK3PXP'
test('accepts defaults and explicit supported TOTP parameters', () => {
  const expected = [{ name: 'Example alice', secret: 'JBSWY3DPEHPK3PXP' }]
  for (const suffix of ['', '&algorithm=SHA1&digits=6&period=30', '&algorithm=sha1']) {
    expect(parseOTPURI(uri + suffix).accounts).toEqual(expected)
  }
})
for (const parameter of ['algorithm=SHA256', 'algorithm=SHA512', 'digits=8', 'period=60', 'period=0', 'period=abc', 'algorithm=', 'digits=', 'period=']) {
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
