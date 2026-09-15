import { open, readFile, rename, unlink } from 'node:fs/promises'
import { encryptCheckpoint, decryptCheckpoint } from '../../src/steam-link/checkpoint'
import { LinkError, validatePending, type PendingLink } from './core'

export { encryptCheckpoint, decryptCheckpoint } from '../../src/steam-link/checkpoint'

/** Initial writes are exclusive; updates use an atomic rename. Caller must hold the account lock. */
export async function saveCheckpoint(path: string, pending: PendingLink, password: string, initial = false): Promise<void> {
  const encrypted = await encryptCheckpoint(pending, password)
  const target = initial ? path : `${path}.${crypto.randomUUID()}.tmp`
  const handle = await open(target, 'wx', 0o600)
  try { await handle.writeFile(encrypted, 'utf8'); await handle.sync() }
  finally { await handle.close() }
  if (!initial) {
    try { await rename(target, path) }
    catch (error) { await unlink(target).catch(() => {}); throw error }
  }
  // Prove that the on-disk checkpoint can be recovered before allowing phone activation.
  const recovered = await decryptCheckpoint(await readFile(path, 'utf8'), password)
  if (JSON.stringify(recovered) !== JSON.stringify(pending)) throw new LinkError('checkpoint')
}

export async function acquireLock(path: string): Promise<() => Promise<void>> {
  let lock
  try { lock = await open(`${path}.lock`, 'wx', 0o600) }
  catch { throw new LinkError('locked') }
  try { await lock.writeFile(String(process.pid)) }
  catch (error) { await lock.close(); await unlink(`${path}.lock`).catch(() => {}); throw error }
  await lock.close()
  return () => unlink(`${path}.lock`)
}
