import type { Account, AppState } from '@/types'

/**
 * 存储管理工具
 * 封装 Chrome Storage API，支持同步存储和本地存储回退
 */
export class StorageManager {
  /**
   * 检查 Chrome Storage API 是否可用
   */
  private static isStorageAvailable(): boolean {
    return typeof chrome !== 'undefined' &&
           chrome.storage &&
           chrome.storage.sync !== undefined
  }

  /**
   * 从存储中获取数据
   */
  private static async getFromStorage<T>(
    key: string,
    storageType: 'sync' | 'local' = 'sync'
  ): Promise<T | undefined> {
    try {
      if (this.isStorageAvailable()) {
        const result = await chrome.storage[storageType].get(key)
        return result[key] as T
      } else {
        // 在非扩展环境中使用 localStorage 作为 fallback
        const data = localStorage.getItem(key)
        return data ? JSON.parse(data) : undefined
      }
    } catch (error) {
      console.error(`Failed to get ${key}:`, error)
      return undefined
    }
  }

  /**
   * 保存数据到存储
   */
  private static async saveToStorage<T>(
    key: string,
    value: T,
    storageType: 'sync' | 'local' = 'sync'
  ): Promise<void> {
    try {
      if (this.isStorageAvailable()) {
        await chrome.storage[storageType].set({ [key]: value })
      } else {
        // 在非扩展环境中使用 localStorage 作为 fallback
        localStorage.setItem(key, JSON.stringify(value))
      }
    } catch (error) {
      console.error(`Failed to save ${key}:`, error)
    }
  }

  /**
   * 获取账户列表
   */
  static async getAccounts(): Promise<Account[]> {
    const accounts = await this.getFromStorage<Account[]>('accounts')
    return accounts || []
  }

  /**
   * 保存账户列表
   */
  static async saveAccounts(accounts: Account[]): Promise<void> {
    await this.saveToStorage('accounts', accounts)
  }

  /**
   * 获取应用状态
   */
  static async getState(): Promise<AppState | undefined> {
    return await this.getFromStorage<AppState>('state')
  }

  /**
   * 保存应用状态
   */
  static async saveState(state: AppState): Promise<void> {
    await this.saveToStorage('state', state)
  }

  /**
   * 获取语言设置
   */
  static async getLanguage(): Promise<string> {
    const language = await this.getFromStorage<string>('language')
    return language || 'zh-CN'
  }

  /**
   * 保存语言设置
   */
  static async saveLanguage(language: string): Promise<void> {
    await this.saveToStorage('language', language)
  }

  /**
   * 清空所有数据
   */
  static async clear(): Promise<void> {
    try {
      if (this.isStorageAvailable()) {
        await chrome.storage.sync.clear()
      } else {
        localStorage.clear()
      }
    } catch (error) {
      console.error('Failed to clear storage:', error)
    }
  }
}
