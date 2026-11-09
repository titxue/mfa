import { vault, VAULT_KEY } from './utils/vault'
import type { VaultRequest } from './utils/vault-client'
import { grantedSites, sitePattern } from './utils/site-access'
import { TOTP } from './utils/totp'
import { StorageManager } from './utils/storage'
import { LEGACY_RECOVERY_KEY } from './utils/vault-legacy'
import { V2_KEY, MIGRATION_PREFIX, RECOVERY_KEY } from './utils/vault-sync'

async function notify(invalidate = false, ensureInjected = false) {
  await chrome.runtime.sendMessage({ type: 'VAULT_CHANGED', invalidate }).catch(() => {})
  const tabs = await chrome.tabs.query({})
  const sites = ensureInjected ? await grantedSites() : []
  await Promise.all(tabs.map(async tab => {
    if (tab.id === undefined) return
    if (ensureInjected && sites.includes(sitePattern(tab.url ?? '') ?? '')) {
      // Registering a content script does not inject it into an already-open page.
      const receiver = await chrome.tabs.sendMessage(tab.id, { type: 'PING' }).catch(() => undefined)
      if (!receiver?.ok) {
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content-script.js'] })
        } catch {
          // A cross-origin frame can be outside the existing host grant.
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-script.js'] }).catch(() => {})
        }
      }
    }
    await chrome.tabs.sendMessage(tab.id, { type: 'VAULT_CHANGED', invalidate }).catch(() => {})
  }))
}
const ready = Promise.all([
  chrome.storage.sync.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
])
chrome.storage.onChanged.addListener((changes, area) => {
  const vaultChanges = Object.entries(changes).filter(([key]) => key === VAULT_KEY || key === V2_KEY || key.startsWith(MIGRATION_PREFIX))
  if ((area === 'sync' && (vaultChanges.length || changes.accounts || changes.state || changes.autofillSettings || changes.language)) || (area === 'session' && changes.vaultSession) || (area === 'local' && (changes.accounts || changes.state || changes[LEGACY_RECOVERY_KEY] || changes[RECOVERY_KEY]))) {
    const invalidate = area === 'session' || area === 'local' && !!(changes.accounts || changes.state) || vaultChanges.some(([, change]) => {
      const oldValue = change.oldValue as { record?: unknown } | undefined
      const newValue = change.newValue as { record?: unknown } | undefined
      const before = (oldValue?.record ?? oldValue) as { mode?: string; data?: { salt?: string } } | undefined
      const after = (newValue?.record ?? newValue) as typeof before
      return !!before && before.mode !== after?.mode || after?.mode === 'encrypted' && before?.data?.salt !== after.data?.salt
    })
    void notify(invalidate).catch(() => {})
  }
})

chrome.runtime.onMessage.addListener((message: VaultRequest, sender, respond) => {
  if (message?.type !== 'MFA_VAULT') return false
  const popup = sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('popup.html')
  const page = !popup && !!sender.tab && sender.id === chrome.runtime.id
  if (!popup && (!page || !['summaries', 'code'].includes(message.action))) {
    respond({ ok: false, error: 'denied' }); return false
  }
  void vault.run(async () => {
    await ready
    if (page) {
      const pattern = sitePattern(sender.url ?? '')
      if (!pattern || !(await grantedSites()).includes(pattern)) throw new Error('denied')
    }
    const m = message
    switch (m.action) {
      case 'snapshot': return vault.snapshot()
      case 'summaries': {
        const snapshot = await vault.snapshot()
        return { ...snapshot, settings: await StorageManager.getSettings(), language: await StorageManager.getLanguage(), accounts: snapshot.accounts.map(({ name, website, type, period }) => ({ name, website, period: type === 'steam' ? 30 : (period ?? 30) })) }
      }
      case 'code': {
        const snapshot = await vault.snapshot()
        if (snapshot.locked) throw new Error('locked')
        if (snapshot.revision !== m.revision) throw new Error('conflict')
        const account = snapshot.accounts.find(a => a.name === m.name)
        if (!account) throw new Error('invalid')
        const code = await TOTP.generateTOTP(account.secret, account.period ?? 30, account.type, undefined, { algorithm: account.algorithm, digits: account.digits })
        const fresh = await vault.snapshot()
        if (fresh.locked || fresh.revision !== snapshot.revision) throw new Error('locked')
        if (page && !(await grantedSites()).includes(sitePattern(sender.url ?? '')!)) throw new Error('denied')
        return code
      }
      case 'save': await vault.save(m.accounts!, m.revision!); break
      case 'unlock': await vault.unlock(m.password ?? ''); break
      case 'lock': await vault.lock(); break
      case 'enable': case 'change': case 'disable':
        await vault.protect(m.action, m.password ?? '', m.nextPassword ?? '', m.revision!); break
      case 'backup': return vault.backup(!!m.plain, m.password ?? '')
      case 'recoveries': return vault.recoveryState()
      case 'recoveryBackup': return vault.recoveryBackup(m.candidateId)
      case 'migrate': await vault.migrate(m.revision!); break
      case 'resolve': await vault.resolve(m.candidateId!, m.revision!, m.password ?? ''); break
      default: throw new Error('invalid')
    }
    await notify(false, m.action === 'unlock')
    return vault.snapshot()
  }).then(value => respond({ ok: true, value }), error => {
    const known = ['locked', 'conflict', 'invalid', 'passwordError', 'passwordLength', 'recoveryPasswordRequired', 'quota', 'denied', 'syncConflict', 'syncPending', 'migrationRequired', 'legacyUnsupported', 'legacyHistoryMigration']
    respond({ ok: false, error: known.includes(error?.message) ? error.message : 'storageError' })
  })
  return true
})
