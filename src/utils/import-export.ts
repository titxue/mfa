import type { Account, ExportData } from '@/types'
import { importPreview, mergeImportChunks, parseImportText, type ImportChunk } from './otp-import'
import { parseQRCodeFromFile } from './qr-parser'

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
      (account.website === undefined || typeof account.website === 'string') &&
      (account.type === undefined || account.type === 'totp' || account.type === 'steam')
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
        website: account.website,
        ...(account.type === undefined ? {} : { type: account.type })
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
   * @param file - JSON / maFile / TXT 文件或二维码图片
   * @param currentAccounts - 当前已有的账户列表
   * @returns 导入结果 { newAccounts, duplicateCount, invalidCount }
   */
  static async importAccounts(
    file: File,
    currentAccounts: Account[],
    password?: string
  ): Promise<{
    newAccounts: Account[]
    duplicateCount: number
    invalidCount: number
  }> {
    const preview = importPreview(mergeImportChunks([], await this.parseFile(file, password)), currentAccounts)
    if (!preview.complete) throw new Error('incompleteBatch')
    return { newAccounts: preview.accounts, duplicateCount: preview.duplicates.length, invalidCount: preview.issues.length }
  }

  static async parseFile(file: File, password?: string): Promise<ImportChunk[]> {
    if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name)) {
      return [await parseQRCodeFromFile(file)]
    }
    if (file.size > 2 * 1024 * 1024) throw new Error('invalid')
    return parseImportText(await file.text(), password)
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
