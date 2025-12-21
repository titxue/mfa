/**
 * 页面分析器 - 用于自动填充验证码
 */

/**
 * TOTP 关键词列表
 */
const TOTP_KEYWORDS = [
  'otp',
  '2fa',
  'totp',
  'authenticator',
  'verification',
  'security',
  'code',
  'security code',
  '安全码',
  '验证码',
  '动态码'
]

/**
 * 在页面中查找可能的 TOTP 输入框
 */
export function findTOTPInput(): HTMLInputElement | null {
  const inputs = Array.from(document.querySelectorAll('input'))

  // 优先查找匹配关键词的输入框
  for (const input of inputs) {
    const text = [
      input.name,
      input.id,
      input.placeholder,
      input.getAttribute('aria-label'),
      input.getAttribute('autocomplete')
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    for (const keyword of TOTP_KEYWORDS) {
      if (text.includes(keyword.toLowerCase())) {
        return input
      }
    }
  }

  // 查找 type="text" 且可见的输入框
  for (const input of inputs) {
    if (
      (input.type === 'text' || input.type === 'tel' || input.type === 'number') &&
      input.offsetParent !== null &&
      !input.disabled &&
      !input.readOnly
    ) {
      return input
    }
  }

  return null
}

/**
 * 填充验证码到输入框
 * @param code - TOTP 验证码
 * @returns 是否填充成功
 */
export function fillTOTPCode(code: string): boolean {
  const input = findTOTPInput()

  if (input) {
    // 设置值
    input.value = code

    // 触发事件
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))

    // 聚焦输入框
    input.focus()

    return true
  }

  return false
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
  } catch (error) {
    return false
  }
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
  } catch (error) {
    return null
  }
}

/**
 * 自动填充验证码到当前页面
 * @param code - TOTP 验证码
 * @returns 填充结果
 */
export async function autoFillCode(code: string): Promise<{
  success: boolean
  message: string
}> {
  try {
    const tab = await getCurrentTab()

    if (!tab || !tab.id) {
      throw new Error('No active tab found')
    }

    // 注入脚本到当前标签页
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillTOTPCode,
      args: [code]
    })

    const filled = results[0]?.result

    if (filled) {
      return {
        success: true,
        message: 'Code filled successfully'
      }
    } else {
      // 填充失败，回退到复制到剪贴板
      const copied = await copyToClipboard(code)
      return {
        success: copied,
        message: copied ? 'Code copied to clipboard' : 'Failed to fill or copy code'
      }
    }
  } catch (error) {
    // 尝试复制到剪贴板
    const copied = await copyToClipboard(code)
    return {
      success: copied,
      message: copied ? 'Code copied to clipboard' : 'Failed to auto-fill'
    }
  }
}
