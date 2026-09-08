import type { Account } from '@/types'

export interface EncryptedData {
  format: 'mfa-encrypted'
  version: 1
  kdf: 'PBKDF2-SHA256'
  iterations: 600000
  salt: string
  iv: string
  ciphertext: string
}
export const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes))
export const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(value), c => c.charCodeAt(0))
export function validateAccounts(value: unknown): asserts value is Account[] {
  if (!Array.isArray(value) || !value.every(a => a && typeof a.name === 'string' && a.name.trim() &&
    typeof a.secret === 'string' && a.secret.trim() && (a.website === undefined || typeof a.website === 'string')) ||
    new Set(value.map(a => a.name)).size !== value.length) throw new Error('invalid')
}
export function validateEncrypted(value: unknown): asserts value is EncryptedData {
  const v = value as EncryptedData
  try {
    if (!v || v.format !== 'mfa-encrypted' || v.version !== 1 || v.kdf !== 'PBKDF2-SHA256' ||
      v.iterations !== 600000 || typeof v.salt !== 'string' || typeof v.iv !== 'string' || typeof v.ciphertext !== 'string' ||
      fromBase64(v.salt).length !== 16 || fromBase64(v.iv).length !== 12 || fromBase64(v.ciphertext).length < 16) throw new Error()
  } catch { throw new Error('invalid') }
}
export async function deriveKey(password: string, salt: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations: 600000 },
    material, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}
export const newSalt = (): string => toBase64(crypto.getRandomValues(new Uint8Array(16)))
export async function encryptAccounts(accounts: Account[], key: CryptoKey, salt: string): Promise<EncryptedData> {
  validateAccounts(accounts)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(accounts)))
  return { format: 'mfa-encrypted', version: 1, kdf: 'PBKDF2-SHA256', iterations: 600000, salt,
    iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) }
}
export async function decryptAccounts(data: EncryptedData, key: CryptoKey): Promise<Account[]> {
  validateEncrypted(data)
  let result: unknown
  try {
    result = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(data.iv) }, key, fromBase64(data.ciphertext))))
  } catch { throw new Error('passwordError') }
  validateAccounts(result)
  return result
}
