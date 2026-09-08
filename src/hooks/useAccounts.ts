import { useState, useEffect, useRef, useCallback } from 'react'
import type { Account } from '@/types'
import { TOTP } from '@/utils/totp'
import { vaultRequest, onVaultChange } from '@/utils/vault-client'
import type { VaultSnapshot } from '@/utils/vault'

export function useAccounts() {
  const [snapshot, setSnapshot] = useState<VaultSnapshot>({ accounts: [], revision: '', protected: false, locked: true })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const current = useRef(snapshot)
  const generation = useRef(0)
  const saving = useRef(false)
  const apply = (value: VaultSnapshot) => { current.current = value; setSnapshot(value) }
  const reload = useCallback(async () => {
    const id = ++generation.current
    try {
      const value = await vaultRequest('snapshot')
      if (id === generation.current) { apply(value); setError('') }
    } catch (e) {
      if (id === generation.current) { apply({ ...current.current, accounts: [], locked: true }); setError((e as Error).message) }
    } finally { if (id === generation.current) setLoading(false) }
  }, [])
  useEffect(() => {
    void reload()
    const unsubscribe = onVaultChange(invalidate => {
      if (invalidate) apply({ ...current.current, accounts: [], locked: true })
      void reload()
    })
    return () => { generation.current++; unsubscribe() }
  }, [reload])
  const updateAccounts = async (accounts: Account[]): Promise<boolean> => {
    if (saving.current || current.current.locked) return false
    if (snapshot.revision !== current.current.revision) { setError('conflict'); return false }
    saving.current = true
    const before = current.current
    const id = ++generation.current
    apply({ ...before, accounts })
    try {
      const value = await vaultRequest('save', { accounts, revision: before.revision })
      if (generation.current === id) apply(value)
      return true
    } catch (e) {
      await reload()
      setError((e as Error).message)
      return false
    } finally { saving.current = false }
  }
  const validate = async (account: Account, original?: string) => {
    if (current.current.accounts.some(a => a.name === account.name && a.name !== original)) return 'toast.account_exists'
    try { await TOTP.generateTOTP(account.secret) } catch { return 'toast.invalid_secret' }
    return undefined
  }
  const addAccount = async (account: Account) => {
    const message = await validate(account)
    if (message) return { success: false, message }
    return { success: await updateAccounts([...current.current.accounts, account]) }
  }
  const updateAccount = async (name: string, account: Account) => {
    const message = await validate(account, name)
    if (message) return { success: false, message }
    return { success: await updateAccounts(current.current.accounts.map(a => a.name === name ? account : a)) }
  }
  return { ...snapshot, loading, error, reload, addAccount, updateAccount, updateAccounts,
    deleteAccount: (name: string) => updateAccounts(current.current.accounts.filter(a => a.name !== name)) }
}
