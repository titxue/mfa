import { useState, useEffect } from 'react'
import type { Account } from '@/types'
import { StorageManager } from '@/utils/storage'
import { TOTP } from '@/utils/totp'

/**
 * 账户管理 Hook
 */
export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  // 加载账户列表
  useEffect(() => {
    async function loadAccounts() {
      try {
        const savedAccounts = await StorageManager.getAccounts()
        setAccounts(savedAccounts)
      } catch (error) {
        // Failed to load accounts
      } finally {
        setLoading(false)
      }
    }

    loadAccounts()
  }, [])

  // 添加账户
  const addAccount = async (account: Account): Promise<{ success: boolean; message?: string }> => {
    try {
      // 验证账户名是否已存在
      if (accounts.some(a => a.name === account.name)) {
        return {
          success: false,
          message: 'toast.account_exists'
        }
      }

      // 验证密钥格式
      try {
        await TOTP.generateTOTP(account.secret)
      } catch (error) {
        return {
          success: false,
          message: 'toast.invalid_secret'
        }
      }

      const newAccounts = [...accounts, account]
      await StorageManager.saveAccounts(newAccounts)
      setAccounts(newAccounts)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: 'error.init_failed'
      }
    }
  }

  // 删除账户
  const deleteAccount = async (accountName: string): Promise<boolean> => {
    try {
      const newAccounts = accounts.filter(a => a.name !== accountName)
      await StorageManager.saveAccounts(newAccounts)
      setAccounts(newAccounts)
      return true
    } catch (error) {
      return false
    }
  }

  // 更新账户列表（用于导入）
  const updateAccounts = async (newAccounts: Account[]): Promise<boolean> => {
    try {
      await StorageManager.saveAccounts(newAccounts)
      setAccounts(newAccounts)
      return true
    } catch (error) {
      return false
    }
  }

  return {
    accounts,
    loading,
    addAccount,
    deleteAccount,
    updateAccounts
  }
}
