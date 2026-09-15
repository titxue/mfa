import type { Account } from '@/types'
import { decryptAccounts, deriveKey, validateEncrypted } from './vault-crypto'
import { TOTP } from './totp'

export type ImportProblem = 'invalid' | 'unsupported' | 'noQr' | 'batchConflict'
export interface ImportIssue { name?: string; reason: ImportProblem }
export interface ImportChunk {
  kind: 'standard' | 'migration' | 'backup'
  accounts: Account[]
  issues: ImportIssue[]
  batch?: { id: number; size: number; index: number }
}
export const IMPORT_ACCEPT = '.json,.txt,.maFile,image/*'
const MAX_TEXT = 2 * 1024 * 1024

/** Same encrypted backup, independent of JSON whitespace, key order or file name. */
export function encryptedBackupIdentity(text: string): string {
  const value: unknown = JSON.parse(text)
  validateEncrypted(value)
  return JSON.stringify([value.format, value.version, value.kdf, value.iterations, value.salt, value.iv, value.ciphertext])
}

export function normalizeOTPSecret(value: string): string {
  const secret = value.toUpperCase().replace(/\s/g, '').replace(/=+$/, '')
  if (!/^[A-Z2-7]+$/.test(secret) || ![0, 2, 4, 5, 7].includes(secret.length % 8)) throw new Error('invalid')
  return secret
}

export function parseManualSecret(value: string, sourceType?: Account['type']): Pick<Account, 'secret' | 'type'> {
  if (sourceType === 'steam') return { secret: TOTP.steamSecretToBase32(value), type: 'steam' }
  if (sourceType === 'totp') return { secret: normalizeOTPSecret(value) }
  // Keep ordinary Base32 (including lowercase/padding) compatible with existing accounts.
  try { return { secret: normalizeOTPSecret(value) } } catch { /* Try Steam's Base64 key below. */ }
  const secret = TOTP.steamSecretToBase32(value)
  // Standard Steam shared_secret is 20 bytes. Arbitrary Base64 is not enough to infer Steam.
  if (TOTP.base32Decode(secret).length !== 20) throw new Error('invalid')
  return { secret, type: 'steam' }
}

function displayName(name: string, issuer: string): string {
  name = name.trim(); issuer = issuer.trim()
  if (!name) throw new Error('invalid')
  if (!issuer) return name
  if (name.startsWith(`${issuer}:`)) name = name.slice(issuer.length + 1).trim()
  if (!name) return issuer
  return name === issuer || name.startsWith(`${issuer} `) ? name : `${issuer} ${name}`
}

function checkParameters(value: Record<string, unknown>) {
  const steam = value.type === 'steam' || value.encoder === 'steam'
  const digits = steam ? 5 : 6
  if ((value.type !== undefined && value.type !== 'totp' && value.type !== 'steam') ||
      (value.encoder !== undefined && value.encoder !== 'steam') ||
      (value.algorithm !== undefined && (typeof value.algorithm !== 'string' || value.algorithm.toUpperCase() !== 'SHA1')) ||
      (value.digits !== undefined && value.digits !== digits && value.digits !== String(digits)) ||
      (value.period !== undefined && value.period !== 30 && value.period !== '30')) throw new Error('unsupported')
  return steam ? 'steam' : 'totp'
}

function issue(error: unknown, name?: string): ImportIssue {
  return { name, reason: error instanceof Error && error.message === 'unsupported' ? 'unsupported' : 'invalid' }
}

function standardAccount(uri: string): Account {
  const url = new URL(uri)
  if (url.protocol !== 'otpauth:' || url.username || url.password || url.port || url.hash) throw new Error('invalid')
  if (url.hostname !== 'totp') throw new Error('unsupported')
  const params: Record<string, unknown> = { type: url.hostname }
  for (const key of ['algorithm', 'digits', 'period', 'secret', 'issuer', 'encoder']) {
    if (url.searchParams.getAll(key).length > 1) throw new Error('invalid')
    if (url.searchParams.has(key)) params[key] = url.searchParams.get(key)!
  }
  const type = checkParameters(params)
  const label = decodeURIComponent(url.pathname.slice(1))
  const colon = label.indexOf(':')
  const issuer = typeof params.issuer === 'string' ? params.issuer : colon >= 0 ? label.slice(0, colon) : ''
  if (typeof params.secret !== 'string') throw new Error('invalid')
  return { name: displayName(label, issuer), secret: normalizeOTPSecret(params.secret), ...(type === 'steam' ? { type } : {}) }
}

// A bounded protobuf wire reader. Unknown fields are skipped for forward compatibility.
// MigrationPayload wire layout: https://github.com/scito/extract_otp_secrets/blob/master/src/google_auth.proto
function protobuf(bytes: Uint8Array): Map<number, (bigint | Uint8Array | null)[]> {
  let offset = 0
  const fields = new Map<number, (bigint | Uint8Array | null)[]>()
  const varint = (): bigint => {
    let value = 0n
    for (let i = 0; i < 10; i++) {
      if (offset >= bytes.length) throw new Error('invalid')
      const byte = bytes[offset++]
      if (i === 9 && byte > 1) throw new Error('invalid')
      value |= BigInt(byte & 127) << BigInt(7 * i)
      if (!(byte & 128)) return value
    }
    throw new Error('invalid')
  }
  while (offset < bytes.length) {
    const tag = varint()
    const field = Number(tag >> 3n), wire = Number(tag & 7n)
    if (field < 1 || field > 0x1fffffff) throw new Error('invalid')
    let value: bigint | Uint8Array | null
    if (wire === 0) value = varint()
    else if (wire === 2) {
      const size = Number(varint())
      if (!Number.isSafeInteger(size) || size > bytes.length - offset) throw new Error('invalid')
      value = bytes.subarray(offset, offset + size); offset += size
    } else if (wire === 1 || wire === 5) {
      offset += wire === 1 ? 8 : 4
      if (offset > bytes.length) throw new Error('invalid')
      // Retain the field with an invalid type so known fields cannot be silently ignored.
      value = null
    } else throw new Error('invalid')
    const values = fields.get(field) ?? []
    values.push(value); fields.set(field, values)
  }
  return fields
}

function single(fields: ReturnType<typeof protobuf>, field: number, type: 'number' | 'bytes') {
  const values = fields.get(field)
  if (!values) return undefined
  if (values.length !== 1 || (type === 'number' ? typeof values[0] !== 'bigint' : !(values[0] instanceof Uint8Array))) throw new Error('invalid')
  return values[0]
}
function numberField(fields: ReturnType<typeof protobuf>, field: number): number | undefined {
  const value = single(fields, field, 'number') as bigint | undefined
  if (value === undefined) return undefined
  // batch_id is a signed int32; other callers validate their own ranges.
  if (value > 0x7fffffffn && value < 0xffffffff80000000n) throw new Error('invalid')
  return Number(BigInt.asIntN(32, value))
}
function bytesField(fields: ReturnType<typeof protobuf>, field: number): Uint8Array | undefined {
  return single(fields, field, 'bytes') as Uint8Array | undefined
}
function migration(uri: string): ImportChunk {
  const url = new URL(uri)
  if (url.hostname !== 'offline' || (url.pathname && url.pathname !== '/') || url.username || url.password || url.port || url.hash || url.searchParams.getAll('data').length !== 1) throw new Error('invalid')
  const encoded = url.searchParams.get('data')!.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 === 1) throw new Error('invalid')
  const payload = protobuf(Uint8Array.from(atob(encoded), c => c.charCodeAt(0)))
  // Versions 1 and 2 use the same account and batch fields. Validate each OTP
  // below instead of rejecting a compatible v2 export at the envelope level.
  const version = numberField(payload, 2)
  if (version !== 1 && version !== 2) throw new Error('unsupported')
  const size = numberField(payload, 3) ?? 1, index = numberField(payload, 4) ?? 0, id = numberField(payload, 5)
  if (size < 1 || size > 1000 || index < 0 || index >= size || (size > 1 && id === undefined)) throw new Error('invalid')
  const result: ImportChunk = { kind: 'migration', accounts: [], issues: [], batch: { id: id ?? 0, size, index } }
  const entries = payload.get(1)
  if (!entries?.length) throw new Error('invalid')
  const decoder = new TextDecoder('utf-8', { fatal: true })
  for (const entry of entries) {
    let name: string | undefined
    try {
      if (!(entry instanceof Uint8Array)) throw new Error('invalid')
      const fields = protobuf(entry)
      name = decoder.decode(bytesField(fields, 2) ?? new Uint8Array()).trim()
      const issuer = decoder.decode(bytesField(fields, 3) ?? new Uint8Array())
      const secret = bytesField(fields, 1)
      if (!name || !secret?.length) throw new Error('invalid')
      name = displayName(name, issuer)
      // Google encodes SIX_DIGITS as 1 (not the literal digit count).
      if (numberField(fields, 4) !== 1 || numberField(fields, 5) !== 1 || numberField(fields, 6) !== 2) throw new Error('unsupported')
      result.accounts.push({ name, secret: TOTP.base32Encode(secret) })
    } catch (error) { result.issues.push(issue(error, name)) }
  }
  return result
}

export function parseOTPURI(uri: string): ImportChunk {
  uri = uri.trim()
  try {
    if (uri.length > MAX_TEXT) throw new Error('invalid')
    if (uri.startsWith('otpauth-migration://')) return migration(uri)
    return { kind: 'standard', accounts: [standardAccount(uri)], issues: [] }
  } catch (error) {
    let name: string | undefined
    try {
      const url = new URL(uri)
      if (url.protocol === 'otpauth:') name = displayName(decodeURIComponent(url.pathname.slice(1)), url.searchParams.get('issuer') ?? '')
    } catch { /* Invalid labels must not hide the original error. */ }
    return { kind: uri.startsWith('otpauth-migration://') ? 'migration' : 'standard', accounts: [], issues: [issue(error, name)] }
  }
}

export async function parseImportText(text: string, password?: string): Promise<ImportChunk[]> {
  text = text.trim()
  if (!text || text.length > MAX_TEXT) throw new Error('invalid')
  if (!text.startsWith('{') && !text.startsWith('[')) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'))
    if (!lines.length) throw new Error('invalid')
    return lines.map(parseOTPURI)
  }
  let data = JSON.parse(text)
  if (data?.format === 'mfa-encrypted') {
    validateEncrypted(data)
    if (password === undefined) throw new Error('passwordRequired')
    data = { accounts: await decryptAccounts(data, await deriveKey(password, data.salt)) }
  }
  const foreign = Array.isArray(data)
  const entries: unknown[] = foreign ? data : data && typeof data === 'object' && 'shared_secret' in data ? [data] : data?.accounts
  if (!Array.isArray(entries)) throw new Error('invalid')
  const result: ImportChunk = { kind: 'backup', accounts: [], issues: [] }
  for (const entry of entries) {
    let name: string | undefined
    try {
      if (!entry || typeof entry !== 'object') throw new Error('invalid')
      const a = entry as Record<string, unknown>
      if ('shared_secret' in a) {
        name = typeof a.account_name === 'string' ? a.account_name.trim() : undefined
        if (!name || typeof a.shared_secret !== 'string') throw new Error('invalid')
        if (a.type !== undefined && a.type !== 'steam') throw new Error('unsupported')
        checkParameters({ ...a, type: 'steam' })
        // Import only the key needed for codes, never Session, identity_secret or recovery data.
        result.accounts.push({ name: displayName(name, 'Steam'), secret: TOTP.steamSecretToBase32(a.shared_secret), type: 'steam', website: 'steamcommunity.com' })
        continue
      }
      name = typeof a.name === 'string' ? a.name.trim() : undefined
      if (!name || typeof a.secret !== 'string' || (a.website !== undefined && typeof a.website !== 'string') || (a.issuer !== undefined && typeof a.issuer !== 'string')) throw new Error('invalid')
      const secret = normalizeOTPSecret(a.secret)
      let parsed: Account | undefined
      if (a.url !== undefined) {
        if (typeof a.url !== 'string') throw new Error('invalid')
        parsed = standardAccount(a.url)
        if (parsed.secret !== secret) throw new Error('invalid')
        if (a.type === 'steam' && parsed.type !== 'steam') throw new Error('invalid')
        if (a.encoder !== undefined && a.encoder !== parsed.type) throw new Error('invalid')
      }
      const type = checkParameters({ ...a, ...(parsed?.type === 'steam' ? { encoder: 'steam' } : {}) })
      name = foreign ? displayName(name, typeof a.issuer === 'string' ? a.issuer : '') : name
      result.accounts.push({ name, secret, ...(type === 'steam' ? { type } : {}), ...(a.website === undefined ? {} : { website: a.website as string }) })
    } catch (error) { result.issues.push(issue(error, name)) }
  }
  return [result]
}

/** Merge only complete decoded chunks. A conflicting scan never replaces an earlier one. */
export function mergeImportChunks(current: ImportChunk[], incoming: ImportChunk[]): ImportChunk[] {
  const merged = [...current]
  for (const chunk of incoming) {
    if (chunk.batch?.size === 1 && merged.some(c => c.batch?.size === 1 && JSON.stringify(c) === JSON.stringify(chunk))) continue
    if (chunk.batch && chunk.batch.size > 1) {
      const batch = chunk.batch
      const group = merged.filter(c => c.batch?.id === batch.id && c.batch.size > 1)
      const same = group.find(c => c.batch!.index === batch.index)
      if (group.some(c => c.batch!.size !== batch.size) || (same && JSON.stringify(same) !== JSON.stringify(chunk))) {
        merged.push({ kind: 'migration', accounts: [], issues: [{ reason: 'batchConflict' }] })
        continue
      }
      if (same) continue
    }
    merged.push(chunk)
  }
  return merged
}

export function importPreview(chunks: ImportChunk[], current: Account[]) {
  const names = new Set(current.map(a => a.name))
  const accounts: Account[] = [], duplicates: string[] = [], issues = chunks.flatMap(c => c.issues)
  const batches = new Map<number, { id: number; size: number; received: Set<number> }>()
  for (const chunk of chunks) {
    if (chunk.batch && chunk.batch.size > 1) {
      const { id, size, index } = chunk.batch
      const batch = batches.get(id) ?? { id, size, received: new Set<number>() }
      batch.received.add(index); batches.set(id, batch)
    }
    for (const account of chunk.accounts) {
      if (names.has(account.name)) duplicates.push(account.name)
      else { names.add(account.name); accounts.push(account) }
    }
  }
  const progress = [...batches.values()].map(b => ({ id: b.id, size: b.size, received: b.received.size }))
  return { accounts, duplicates, issues, progress, complete: progress.every(b => b.received === b.size) && !issues.some(i => i.reason === 'batchConflict') }
}
