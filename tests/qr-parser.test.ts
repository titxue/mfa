import { expect, test } from 'bun:test'
import { parseOtpauthURI, UnsupportedTOTPParametersError } from '../src/utils/qr-parser'

const uri = 'otpauth://totp/Example:alice?secret=JBSWY3DPEHPK3PXP'
test('accepts defaults and explicit supported TOTP parameters', () => {
  const expected = { name: 'alice', issuer: 'Example', secret: 'JBSWY3DPEHPK3PXP' }
  expect(parseOtpauthURI(uri)).toEqual(expected)
  expect(parseOtpauthURI(uri + '&algorithm=SHA1&digits=6&period=30')).toEqual(expected)
  expect(parseOtpauthURI(uri + '&algorithm=sha1')).toEqual(expected)
})

for (const parameter of ['algorithm=SHA256', 'algorithm=SHA512', 'digits=8', 'period=60', 'period=0', 'period=abc', 'algorithm=', 'digits=', 'period=', 'digits=6&digits=8']) {
  test(`rejects unsupported parameters: ${parameter}`, () => {
    expect(() => parseOtpauthURI(uri + '&' + parameter)).toThrow(UnsupportedTOTPParametersError)
  })
}

test('malformed URI and missing secret remain ordinary parsing failures', () => {
  expect(() => parseOtpauthURI('otpauth://hotp/Example?secret=ABC')).toThrow('Invalid otpauth')
  expect(() => parseOtpauthURI('otpauth://totp/Example')).toThrow('Failed to parse')
})
