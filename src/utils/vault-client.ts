import type { Account } from '@/types'
import { vault, type VaultSnapshot } from './vault'
export type VaultAction = 'snapshot' | 'save' | 'unlock' | 'lock' | 'enable' | 'change' | 'disable' | 'backup' | 'summaries' | 'code'
export type AccountSummary = Omit<Account, 'secret'>
export interface VaultRequest {
  type: 'MFA_VAULT'
  action: VaultAction
  accounts?: Account[]
  revision?: string
  password?: string
  nextPassword?: string
  plain?: boolean
  name?: string
}
export async function vaultRequest<T = VaultSnapshot>(action: VaultAction, data: Omit<Partial<VaultRequest>, 'type' | 'action'> = {}): Promise<T> {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    const response = await chrome.runtime.sendMessage({ type: 'MFA_VAULT', action, ...data })
    if (!response?.ok) throw new Error(response?.error ?? 'storageError')
    return response.value as T
  }
  return vault.run(async () => {
    switch (action) {
      case 'save': await vault.save(data.accounts!, data.revision!); break
      case 'unlock': await vault.unlock(data.password ?? ''); break
      case 'lock': await vault.lock(); break
      case 'enable': case 'change': case 'disable':
        await vault.protect(action, data.password ?? '', data.nextPassword ?? '', data.revision!); break
      case 'backup': return await vault.backup(!!data.plain, data.password ?? '') as T
      case 'snapshot': break
      default: throw new Error('invalid')
    }
    if (action !== 'snapshot') window.dispatchEvent(new CustomEvent('mfa-vault-changed', { detail: action !== 'save' }))
    return await vault.snapshot() as T
  })
}

export function onVaultChange(listener: (invalidate: boolean) => void): () => void {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    const callback = (message: { type?: string; invalidate?: boolean }) => { if (message.type === 'VAULT_CHANGED') listener(!!message.invalidate) }
    chrome.runtime.onMessage.addListener(callback)
    return () => chrome.runtime.onMessage.removeListener(callback)
  }
  const callback = (event: Event) => listener(event.type === 'storage' || !!(event as CustomEvent).detail)
  window.addEventListener('mfa-vault-changed', callback)
  window.addEventListener('storage', callback)
  return () => { window.removeEventListener('mfa-vault-changed', callback); window.removeEventListener('storage', callback) }
}
