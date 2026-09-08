import { vault, VAULT_KEY } from './utils/vault'
import type { VaultRequest } from './utils/vault-client'
import { grantedSites, sitePattern } from './utils/site-access'
import { TOTP } from './utils/totp'
import { StorageManager } from './utils/storage'

async function notify(invalidate = false) {
  await chrome.runtime.sendMessage({ type: 'VAULT_CHANGED', invalidate }).catch(() => {})
  const tabs = await chrome.tabs.query({})
  await Promise.all(tabs.map(tab => tab.id === undefined ? Promise.resolve() :
    chrome.tabs.sendMessage(tab.id, { type: 'VAULT_CHANGED', invalidate }).catch(() => {})))
}
const ready = Promise.all([
  chrome.storage.sync.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
])
chrome.storage.onChanged.addListener((changes, area) => {
  if ((area === 'sync' && (changes[VAULT_KEY] || changes.accounts || changes.autofillSettings || changes.language)) || (area === 'session' && changes.vaultSession)) {
    const change = changes[VAULT_KEY]
    const before = change?.oldValue as { mode?: string; data?: { salt?: string } } | undefined
    const after = change?.newValue as typeof before
    const invalidate = area === 'session' || !!change && (before?.mode !== after?.mode || before?.data?.salt !== after?.data?.salt)
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
        return { ...snapshot, settings: await StorageManager.getSettings(), language: await StorageManager.getLanguage(), accounts: snapshot.accounts.map(({ name, website }) => ({ name, website })) }
      }
      case 'code': {
        const snapshot = await vault.snapshot()
        if (snapshot.locked) throw new Error('locked')
        if (snapshot.revision !== m.revision) throw new Error('conflict')
        const account = snapshot.accounts.find(a => a.name === m.name)
        if (!account) throw new Error('invalid')
        const code = await TOTP.generateTOTP(account.secret)
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
      default: throw new Error('invalid')
    }
    await notify()
    return vault.snapshot()
  }).then(value => respond({ ok: true, value }), error => {
    const known = ['locked', 'conflict', 'invalid', 'passwordError', 'passwordLength', 'quota', 'denied']
    respond({ ok: false, error: known.includes(error?.message) ? error.message : 'storageError' })
  })
  return true
})
