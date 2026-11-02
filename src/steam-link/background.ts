import { vault } from '../utils/vault'
import { STEAM_API_ORIGIN } from './auth'
import { LinkError } from './core'
import { SteamBindingService, isBindingSender, type BindingStorage, type BindingAction, type BindingInput, type BindingCheckpoint } from './service'

export const BINDING_SESSION = 'steamBindingSession'
export const BINDING_CHECKPOINT = 'steamBindingCheckpoint'
export function trustedBindingSender(sender: chrome.runtime.MessageSender): boolean {
  return isBindingSender(sender, chrome.runtime.id, chrome.runtime.getURL('steam-link.html'))
}
const ready = Promise.all([
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
  chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
])
const storage: BindingStorage = {
  readSession: async () => {
    try { return (await chrome.storage.session.get(BINDING_SESSION))[BINDING_SESSION] ?? {} }
    catch { throw new LinkError('sessionStorage') }
  },
  writeSession: async value => {
    try { await chrome.storage.session.set({ [BINDING_SESSION]: value }) }
    catch { throw new LinkError('sessionStorage') }
  },
  readCheckpoint: async () => (await chrome.storage.local.get(BINDING_CHECKPOINT))[BINDING_CHECKPOINT] as BindingCheckpoint | undefined,
  writeCheckpoint: value => chrome.storage.local.set({ [BINDING_CHECKPOINT]: value }),
  removeCheckpoint: () => chrome.storage.local.remove(BINDING_CHECKPOINT),
}
async function clearSensitiveSession() {
  const state = await storage.readSession()
  await storage.writeSession(state.recoveryCheckpoint ? { recoveryCheckpoint: state.recoveryCheckpoint } : {})
}
const service = new SteamBindingService(storage, undefined, undefined, account => vault.run(async () => {
  const snapshot = await vault.snapshot()
  if (snapshot.locked) throw new LinkError('locked')
  if (snapshot.accounts.some(a => a.name === account.name)) throw new LinkError('duplicate')
  await vault.save([...snapshot.accounts, account], snapshot.revision)
}))
let queue: Promise<unknown> = Promise.resolve()
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'MFA_STEAM_BINDING') return false
  if (!trustedBindingSender(sender)) { respond({ ok: false, error: 'denied' }); return false }
  let stage = 'storage-ready'
  const operation = queue.catch(() => {}).then(async () => {
    await ready
    stage = 'vault-read'
    const snapshot = await vault.run(() => vault.snapshot())
    if (snapshot.locked) { await clearSensitiveSession(); throw new LinkError('locked') }
    const action = message.action as BindingAction
    stage = 'permission'
    if (!['view', 'restore', 'logout', 'discard', 'download', 'unlock'].includes(action) &&
        !await chrome.permissions.contains({ origins: [STEAM_API_ORIGIN] })) throw new LinkError('permission')
    stage = ['view', 'login', 'guard', 'poll', 'check', 'initialize', 'unlock', 'verify', 'save', 'download', 'restore', 'logout', 'discard'].includes(action) ? action : 'binding'
    const value = await service.run(action, (message.input ?? {}) as BindingInput)
    stage = 'vault-refresh'
    if ((await vault.run(() => vault.snapshot())).locked) { await clearSensitiveSession(); throw new LinkError('locked') }
    return value
  })
  queue = operation
  operation.then(value => respond({ ok: true, value }), error => {
    const known = ['rateLimit', 'existing', 'uncertain', 'protocol', 'network', 'http', 'steam', 'checkpoint', 'checkpointPassword', 'checkpointExists',
      'accountMismatch', 'notActive', 'tokenChanged', 'codeMismatch', 'notVerified', 'passwordLength', 'loginTimeout', 'loginGuard',
      'loginRequired', 'passwordFormat', 'authProcessing', 'sessionStorage', 'permission', 'locked', 'denied', 'duplicate', 'conflict', 'quota', 'invalid', 'busy', 'storageError']
    const code = error instanceof LinkError ? error.code : error?.message
    const errorType = ['TypeError', 'RangeError', 'InvalidStateError', 'QuotaExceededError', 'SecurityError'].includes(error?.name) ? error.name : undefined
    respond({ ok: false, error: known.includes(code) ? code : 'storageError', stage, ...(errorType ? { errorType } : {}), ...(Number.isInteger(error?.result) ? { result: error.result } : {}) })
  })
  return true
})
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes.vaultSession && !changes.vaultSession.newValue) void clearSensitiveSession()
})
