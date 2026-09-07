/**
 * 页面分析器 - 弹窗侧自动填充入口
 * 通过消息驱动已注入的内容脚本填充；内容脚本未注入时（如扩展重载后未刷新的标签页）
 * 自动 executeScript 重注入同一 bundle（content-script.js），仍失败才回退剪贴板
 */

import { StorageManager } from '@/utils/storage'

export type FillStatus = 'filled' | 'copied' | 'no-field' | 'error'

export interface FillResult {
  status: FillStatus
  mode?: 'single' | 'segmented'
}

/** 内容脚本 FILL_CODE 消息响应 */
interface FillMessageResponse {
  status: 'filled' | 'no-field' | 'error'
  mode?: 'single' | 'segmented'
}

/**
 * 检查 Chrome 扩展 API 是否可用
 */
export function isExtensionApiAvailable(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    chrome.tabs &&
    typeof chrome.tabs.query === 'function'
  )
}

/**
 * 获取当前活动标签页
 */
export async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  if (!isExtensionApiAvailable()) {
    return null
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab || null
  } catch {
    return null
  }
}

/**
 * 复制到剪贴板
 * @param text - 要复制的文本
 * @returns 是否复制成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback: 使用 document.execCommand
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    }
  } catch {
    return false
  }
}

/**
 * 向标签页发送 FILL_CODE 消息
 * @param frameId - 指定帧；缺省则广播到所有帧
 * @returns 响应；消息无接收端（内容脚本未注入/受限页面）时返回 undefined
 */
async function sendFillMessage(
  tabId: number,
  code: string,
  frameId?: number
): Promise<FillMessageResponse | undefined> {
  try {
    const options = frameId === undefined ? {} : { frameId }
    return (await chrome.tabs.sendMessage(
      tabId,
      { type: 'FILL_CODE', code },
      options
    )) as FillMessageResponse
  } catch {
    return undefined
  }
}

/** 注入内容脚本 bundle（所有帧），受限页面会失败 */
async function injectContentScript(tabId: number): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['content-script.js'],
    })
    return true
  } catch {
    // Cross-origin frames may reject allFrames under activeTab; retain top-frame filling.
    try {
      await chrome.scripting.executeScript({
        target: { tabId }, files: ['content-script.js'],
      })
      return true
    } catch {
      return false
    }
  }
}

/** 按设置回退：复制到剪贴板或仅报告未找到字段 */
async function fallbackToClipboard(code: string): Promise<FillResult> {
  try {
    const settings = await StorageManager.getSettings()
    if (settings.clipboardFallback) {
      const copied = await copyToClipboard(code)
      return copied ? { status: 'copied' } : { status: 'error' }
    }
    return { status: 'no-field' }
  } catch {
    const copied = await copyToClipboard(code)
    return copied ? { status: 'copied' } : { status: 'error' }
  }
}

/**
 * 自动填充验证码到当前页面
 * 流程：顶层帧消息 → 全帧广播（iframe 场景）→ 重注入内容脚本后重试 → 剪贴板回退
 * @param code - TOTP 验证码
 * @returns 填充结果
 */
export async function fillCodeInActiveTab(code: string): Promise<FillResult> {
  const tab = await getCurrentTab()
  if (!tab || !tab.id) {
    return fallbackToClipboard(code)
  }

  // 1) 顶层帧
  const top = await sendFillMessage(tab.id, code, 0)
  if (top?.status === 'filled') {
    return { status: 'filled', mode: top.mode }
  }

  // 2) 全帧广播（OTP 表单可能在 iframe 中）
  if (top !== undefined) {
    const all = await sendFillMessage(tab.id, code)
    if (all?.status === 'filled') {
      return { status: 'filled', mode: all.mode }
    }
  }

  // 3) 无内容脚本（如扩展刚重载、标签页未刷新）→ 注入后重试
  if (top === undefined) {
    await injectContentScript(tab.id)
    const retry = await sendFillMessage(tab.id, code, 0)
    if (retry?.status === 'filled') {
      return { status: 'filled', mode: retry.mode }
    }
    const retryAll = await sendFillMessage(tab.id, code)
    if (retryAll?.status === 'filled') {
      return { status: 'filled', mode: retryAll.mode }
    }
  }

  // 4) 剪贴板回退（受设置控制）
  return fallbackToClipboard(code)
}
