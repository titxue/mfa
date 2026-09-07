import { useState, useEffect, useCallback } from 'react'
import { StorageManager, DEFAULT_AUTOFILL_SETTINGS, type AutofillSettings } from '@/utils/storage'

/**
 * 自动填充设置 Hook
 * 乐观更新：先更新 UI，后异步持久化（与 useAccounts 同一原则）
 */
export function useSettings() {
  const [settings, setSettings] = useState<AutofillSettings>(DEFAULT_AUTOFILL_SETTINGS)
  const [loading, setLoading] = useState(true)

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
      const next = { ...settings, ...patch }
      // UI 优先：立即更新状态
      setSettings(next)
      // 后台异步保存
      await StorageManager.saveSettings(next)
    },
    [settings]
  )

  return { settings, loading, updateSettings }
}
