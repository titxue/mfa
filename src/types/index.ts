/**
 * 账户信息
 */
export interface Account {
  name: string
  secret: string
}

/**
 * 应用状态
 */
export interface AppState {
  formVisible?: boolean
  accountValue?: string
  secretValue?: string
  scrollTop?: number
}

/**
 * 导出数据格式
 */
export interface ExportData {
  version: string
  timestamp: string
  accounts: Account[]
}

/**
 * 语言选项
 */
export type Language = 'zh-CN' | 'en-US'

/**
 * Toast 类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info'
