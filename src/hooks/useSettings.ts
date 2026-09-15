import { useState, useEffect, useCallback, useRef } from 'react'
import { StorageManager, DEFAULT_AUTOFILL_SETTINGS, type AutofillSettings } from '@/utils/storage'

/**
 * 自动填充设置 Hook
 * 乐观更新：先更新 UI，后异步持久化（与 useAccounts 同一原则）
 */
export function useSettings() {
  const [settings, setSettings] = useState<AutofillSettings>(DEFAULT_AUTOFILL_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)

  useEffect(() => {
    let mounted = true
    StorageManager.getSettings()
      .then((saved) => {
        if (mounted) setSettings(saved)
      })
      .catch(() => {
        // 使用默认值
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const updateSettings = useCallback(
    async (patch: Partial<AutofillSettings>) => {
      if (pending.current || loading) throw new Error('conflict')
      pending.current = true
      setSaving(true)
      const next = { ...settings, ...patch }
      setSettings(next)
      try { await StorageManager.saveSettings(next) }
      catch (error) { setSettings(settings); throw error }
      finally { pending.current = false; setSaving(false) }
    },
    [settings, loading]
  )

  return { settings, loading, saving, updateSettings }
}
