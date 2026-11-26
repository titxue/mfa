import { describe, expect, test } from 'bun:test'
import { generateOtpauthURI } from '../src/utils/qr-generator'
import { parseOTPURI } from '../src/utils/otp-import'
import { TOTP } from '../src/utils/totp'
import { parseOtpauthURI as parseStoreURI, UnsupportedTOTPParametersError } from './fixtures/store-2.3.8-qr-parser'

// RFC 6238's public SHA1 test key; its six-digit code at 59 seconds is 287082.
const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

// a9be25f:src/components/AddAccountModal.tsx uses this exact name composition,
// defaults missing type to numeric TOTP, and keeps the parsed secret.
function readAsStoreAccount(uri: string) {
  const result = parseStoreURI(uri)
  return {
    name: result.issuer ? `${result.issuer} ${result.name}` : result.name,
    secret: result.secret,
    type: result.type || 'totp' as const,
  }
}

describe('new ordinary QR exports remain readable by store 2.3.8', () => {
  for (const name of [
    'Steam:alice', 'sTeAm:alice', 'Steam: alice', 'Steam:alice account',
    ':Steam:alice', '::Steam:alice', ':alice', ':Steam:alice account',
    'Steam demo', 'Example alice',
  ]) {
    test(`preserves ${JSON.stringify(name)} as the same numeric TOTP account`, async () => {
      const uri = generateOtpauthURI(name, secret, 'totp')
      const url = new URL(uri)
      // The old store explicitly rejects encoder=totp. Escape ambiguous labels
      // with an empty issuer instead of relying on a new extension parameter.
      expect(url.searchParams.has('encoder')).toBe(false)
      if (/^steam:/i.test(name) || name.startsWith(':')) {
        expect(decodeURIComponent(url.pathname.slice(1))).toBe(`:${name}`)
        expect(url.searchParams.has('issuer')).toBe(false)
      }
      const restored = readAsStoreAccount(uri)
      expect(restored).toEqual({ name, secret, type: 'totp' })
      expect(await TOTP.generateTOTP(restored.secret, 30, restored.type, 59000)).toBe('287082')
      const current = parseOTPURI(uri)
      expect(current.issues).toEqual([])
      expect(current.accounts).toEqual([{ name, secret }])
      expect(await TOTP.generateTOTP(current.accounts[0].secret, 30, current.accounts[0].type, 59000)).toBe('287082')
    })
  }
})

test('fixture retains the old rejection while current imports still accept earlier explicit numeric encoders', async () => {
  const uri = `otpauth://totp/Steam%3Aalice?secret=${secret}&algorithm=SHA1&digits=6&period=30&encoder=totp`
  expect(() => parseStoreURI(uri)).toThrow(UnsupportedTOTPParametersError)
  const current = parseOTPURI(uri)
  expect(current.issues).toEqual([])
  expect(current.accounts).toEqual([{ name: 'Steam:alice', secret }])
  expect(await TOTP.generateTOTP(current.accounts[0].secret, 30, current.accounts[0].type, 59000)).toBe('287082')
})
