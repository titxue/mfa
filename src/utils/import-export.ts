import type { Account, ExportData } from '@/types'
import { TOTP } from './totp'
import { decryptAccounts, deriveKey, validateEncrypted, type EncryptedData } from './vault-crypto'

export type ImportBackup = { kind: 'plain'; accounts: Account[] } | { kind: 'encrypted'; data: EncryptedData }

/**
 * 导入导出管理工具
 */
export class ImportExportManager {
  /**
   * 验证导入数据格式
   */
  static validateImportData(data: any): data is ExportData {
    if (!data || typeof data !== 'object') {
      return false
    }

    if (!Array.isArray(data.accounts)) {
      return false
    }

    return data.accounts.every((account: any) =>
      account &&
      typeof account.name === 'string' &&
      typeof account.secret === 'string' &&
      account.name.trim() &&
      account.secret.trim() &&
      (account.website === undefined || typeof account.website === 'string')
    )
  }

  /**
   * 导出账户数据为 JSON
   */
  static exportAccounts(accounts: Account[]): string {
    const exportData: ExportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      accounts: accounts.map(account => ({
        name: account.name,
        secret: account.secret,
        website: account.website
      }))
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * 下载导出文件
   */
  static downloadExportFile(accounts: Account[]): void {
    this.downloadJSON(this.exportAccounts(accounts))
  }

  static downloadJSON(dataStr: string): void {
    const dataBlob = new Blob([dataStr], { type: 'application/json' })

    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `totp-accounts-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * 导入账户数据
   * @param file - JSON 文件
   * @param currentAccounts - 当前已有的账户列表
   * @returns 导入结果 { newAccounts, duplicateCount, invalidCount }
   */
  static async importAccounts(
    file: File,
    currentAccounts: Account[],
    password = ''
  ): Promise<{
    newAccounts: Account[]
    duplicateCount: number
    invalidCount: number
  }> {
    const backup = await this.readBackup(file)
    const accounts = await this.unlockBackup(backup, password)
    return this.prepareAccounts(accounts, currentAccounts)
  }

  /** Read and validate before displaying the confirmation dialog. */
  static async readBackup(file: File): Promise<ImportBackup> {
    let data: unknown
    try { data = JSON.parse(await file.text()) } catch { throw new Error('invalid') }
    if (data && typeof data === 'object' && 'format' in data && data.format === 'mfa-encrypted') {
      validateEncrypted(data)
      return { kind: 'encrypted', data }
    }
    if (!this.validateImportData(data)) throw new Error('invalid')
    return { kind: 'plain', accounts: data.accounts }
  }

  static async unlockBackup(backup: ImportBackup, password = ''): Promise<Account[]> {
    if (backup.kind === 'plain') return backup.accounts
    const key = await deriveKey(password, backup.data.salt)
    return decryptAccounts(backup.data, key)
  }

  /** Recheck duplicates against current accounts when the user confirms. */
  static async prepareAccounts(importedAccounts: Account[], currentAccounts: Account[]) {
    const newAccounts: Account[] = []
    let duplicateCount = 0
    let invalidCount = 0

    // 检查重复账户并验证密钥
    for (const account of importedAccounts) {
      const exists = [...currentAccounts, ...newAccounts].find(
        existing => existing.name === account.name
      )

      if (exists) {
        duplicateCount++
      } else {
        // 验证密钥格式
        try {
          await TOTP.generateTOTP(account.secret)
          newAccounts.push(account)
        } catch (error) {
          invalidCount++
        }
      }
    }

    return { newAccounts, duplicateCount, invalidCount }
  }

  /**
   * 读取文件内容
   */
  static readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = (e) => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }
}
