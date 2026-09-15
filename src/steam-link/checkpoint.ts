import { deriveKey, fromBase64, newSalt, toBase64 } from '../utils/vault-crypto'
import { LinkError, validatePending, type PendingLink } from './core'

export async function encryptCheckpoint(pending: PendingLink, password: string): Promise<string> {
  validatePending(pending)
  if (password.length < 8) throw new LinkError('passwordLength')
  const salt = newSalt(), key = await deriveKey(password, salt)
  return sealCheckpoint(pending, key, salt)
}

export async function sealCheckpoint(pending: PendingLink, key: CryptoKey, salt: string): Promise<string> {
  validatePending(pending)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(pending)))
  return JSON.stringify({ format: 'mfa-steam-link-pending', version: 1, salt, iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) })
}

export async function decryptCheckpoint(encrypted: string, password: string): Promise<PendingLink> {
  try {
    const data = JSON.parse(encrypted)
    return await openCheckpoint(encrypted, await deriveKey(password, data.salt))
  } catch { throw new LinkError('checkpointPassword') }
}

export async function openCheckpoint(encrypted: string, key: CryptoKey): Promise<PendingLink> {
  try {
    const p = JSON.parse(encrypted)
    if (p.format !== 'mfa-steam-link-pending' || p.version !== 1 || fromBase64(p.salt).length !== 16 || fromBase64(p.iv).length !== 12) throw new Error()
    const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(p.iv) }, key, fromBase64(p.ciphertext))
    const result: unknown = JSON.parse(new TextDecoder().decode(raw))
    validatePending(result)
    return result
  } catch { throw new LinkError('checkpointPassword') }
}

