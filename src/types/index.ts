/**
 * TOTP 哈希算法（RFC 6238）
 */
export type TOTPAlgorithm = 'SHA1' | 'SHA256' | 'SHA512'

/**
 * 账户信息
 */
export interface Account {
  name: string
  secret: string
  website?: string
  /** Missing on older accounts; defaults to standard six-digit TOTP. Secrets stay Base32. */
  type?: 'totp' | 'steam'
  /** 哈希算法；缺省为 SHA1（Steam 固定 SHA1） */
  algorithm?: TOTPAlgorithm
  /** 验证码位数；缺省为 6（Steam 固定 5） */
  digits?: 6 | 8
  /** 时间步长（秒）；缺省为 30（Steam 固定 30） */
  period?: number
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
 * 语言选项（从 locales 自动导入）
 */
export type { Language } from '@/locales'

/**
 * Toast 类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info'
