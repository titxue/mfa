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
  const recovering = useRef(false)
  const alive = useRef(true)
  const pending = useRef<{ accounts: Account[]; resolve: ((saved: boolean) => void)[] } | null>(null)
  const apply = (value: VaultSnapshot) => { current.current = value; setSnapshot(value) }
  const reload = useCallback(async () => {
    if (!alive.current) return
    const id = ++generation.current
    try {
      const value = await vaultRequest('snapshot')
      if (alive.current && id === generation.current) { apply(value); setError('') }
    } catch (e) {
      if (alive.current && id === generation.current) { apply({ ...current.current, accounts: [], locked: true }); setError((e as Error).message) }
    } finally { if (alive.current && id === generation.current) setLoading(false) }
  }, [])
  useEffect(() => {
    alive.current = true
    void reload()
    const unsubscribe = onVaultChange(invalidate => {
      if (invalidate) apply({ ...current.current, accounts: [], locked: true })
      // 中间保存结果不能覆盖排队中的最新顺序；锁定仍立即失效。
      if (invalidate || !saving.current) void reload()
    })
    return () => { alive.current = false; generation.current++; unsubscribe() }
  }, [reload])
  const flushSaves = async () => {
    saving.current = true
    try {
      while (pending.current) {
        const next = pending.current
        pending.current = null
        const id = ++generation.current
        try {
          const value = await vaultRequest('save', { accounts: next.accounts, revision: current.current.revision })
          if (!alive.current || id !== generation.current || current.current.locked) throw new Error('conflict')
          const waiting = pending.current as typeof next | null
          apply({ ...value, accounts: waiting?.accounts ?? value.accounts })
          next.resolve.forEach(resolve => resolve(true))
        } catch (e) {
          recovering.current = true
          const waiting = pending.current as typeof next | null
          const failed = [...next.resolve, ...(waiting?.resolve ?? [])]
          pending.current = null
          await reload()
          if (alive.current) setError((e as Error).message)
          failed.forEach(resolve => resolve(false))
          return
        }
      }
    } finally {
      saving.current = false
      recovering.current = false
    }
    // 保存通知可能来自其它窗口，全部完成后核对最终数据。
    void reload()
  }
  const updateAccounts = (accounts: Account[]): Promise<boolean> => {
    if (!alive.current || recovering.current || current.current.locked) return Promise.resolve(false)
    if (snapshot.revision !== current.current.revision) { setError('conflict'); return Promise.resolve(false) }
    setError('')
    apply({ ...current.current, accounts })
    return new Promise(resolve => {
      pending.current = { accounts, resolve: [...(pending.current?.resolve ?? []), resolve] }
      if (!saving.current) void flushSaves()
    })
  }
  const validate = async (account: Account, original?: string) => {
    if (current.current.accounts.some(a => a.name === account.name && a.name !== original)) return 'toast.account_exists'
    try { await TOTP.generateTOTP(account.secret, 30, account.type) } catch { return 'toast.invalid_secret' }
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
