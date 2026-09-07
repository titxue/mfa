/**
 * OTP 字段检测与填充引擎
 * 纯 DOM 逻辑，无 chrome API 依赖，供内容脚本使用
 * 检测思路参考 1Password 的字段分类（designation）机制
 */

export interface FillResult {
  status: 'filled' | 'no-field' | 'error'
  mode: 'single' | 'segmented'
}

/** 允许作为 OTP 候选的 input 类型 */
const CANDIDATE_TYPES = new Set(['text', 'tel', 'number', 'password'])

/** OTP 关键词（匹配前会压缩掉所有分隔符，故此处均为紧凑形式） */
const OTP_KEYWORDS = [
  'otp', 'totp', '2fa', 'mfa', 'authenticator', 'verification', 'verify',
  'securitycode', 'onetime', 'onetim', 'one-time',
  '验证码', '动态码', '安全码', '双重验证', '两步验证', '一次性密码',
  '驗證碼', '動態碼', '安全碼', '雙重驗證', '兩步驗證', '一次性密碼',
  'verificacion', 'autenticacion',
  'vérification', 'verification',
  'verifizierung', 'bestätigung', 'bestaetigung',
  'подтверждени', 'проверочный',
  'التحقق',
  '認証コード', '確認コード', 'ワンタイム', '認証',
  '인증', '일회용', '보안코드',
  'सत्यापन',
]

/** 登录/提交按钮关键词（邻近提示用） */
const LOGIN_BUTTON_KEYWORDS = [
  'login', 'signin', 'log in', 'sign in', 'verify', 'continue', 'submit',
  '登录', '登入', '验证', '继续', '确认', '提交',
  'iniciarsesion', 'entrar',
  'connexion', 'seconnecter',
  'anmelden', 'einloggen', 'weiter',
  'войти', 'продолжить', 'подтвердить',
  'دخول', 'متابعة',
  'ログイン', 'ログインする', '次へ',
  '로그인', '계속', '확인',
  'साइनइन', 'लॉगइन', 'जारीरखें',
]

/** 将文本压缩为紧凑形式（去除大小写与分隔符差异） */
function compact(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0600-\u06ff\u0900-\u097f]/g, '')
}

/** 元素是否可见 */
export function isVisible(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement && (el.disabled || el.readOnly)) return false
  const rects = el.getClientRects()
  if (rects.length === 0) return false
  const rect = rects[0]
  return rect.width > 0 && rect.height > 0
}

/** 输入框的属性文本（name/id/placeholder/aria-label/autocomplete/class/inputmode） */
function getAttributeText(input: HTMLInputElement): string {
  return [
    input.name,
    input.id,
    input.placeholder,
    input.getAttribute('aria-label'),
    input.getAttribute('autocomplete'),
    input.className,
    input.getAttribute('inputmode'),
  ]
    .filter(Boolean)
    .join(' ')
}

/** 关联 label 文本（<label for> / 包裹 label / aria-labelledby） */
function getLabelText(input: HTMLInputElement): string {
  const parts: string[] = []
  if (input.labels) {
    for (const label of input.labels) {
      if (label.textContent) parts.push(label.textContent)
    }
  }
  const ariaLabelledby = input.getAttribute('aria-labelledby')
  if (ariaLabelledby) {
    for (const id of ariaLabelledby.split(/\s+/)) {
      const el = document.getElementById(id)
      if (el && el.textContent) parts.push(el.textContent)
    }
  }
  return parts.join(' ')
}

/** 属性文本是否命中 OTP 关键词 */
function matchesKeyword(text: string): boolean {
  const kw = compact(text)
  return OTP_KEYWORDS.some((word) => kw.includes(word))
}

/** 附近（4 层祖先内）是否有密码框或登录类提交按钮 */
function nearLoginContext(input: HTMLInputElement): boolean {
  let node: HTMLElement | null = input.parentElement
  for (let i = 0; i < 4 && node; i++) {
    if (!(node instanceof HTMLElement)) break
    const els = node.querySelectorAll('input, button')
    for (const el of els) {
      if (el === input) continue
      if (el instanceof HTMLInputElement && el.type === 'password') return true
      if (el.tagName === 'BUTTON') {
        const txt = compact(el.textContent || el.getAttribute('aria-label') || '')
        if (txt && LOGIN_BUTTON_KEYWORDS.some((word) => txt.includes(word))) return true
      }
    }
    node = node.parentElement
  }
  return false
}

/**
 * 输入框 OTP 可能性评分（0 = 不是 OTP 字段，>=40 = 判定为 OTP 字段）
 */
function scoreInput(input: HTMLInputElement): number {
  if (!CANDIDATE_TYPES.has(input.type)) return 0
  if (!isVisible(input)) return 0

  const autocomplete = (input.getAttribute('autocomplete') || '').toLowerCase()
  // 标准信号：autocomplete="one-time-code"
  if (autocomplete === 'one-time-code') return 100

  const attrs = getAttributeText(input)
  const labels = getLabelText(input)
  const maxLen = input.maxLength
  const inputMode = (input.getAttribute('inputmode') || '').toLowerCase()

  let score = 0

  // 关键词命中属性文本
  if (matchesKeyword(attrs)) score = Math.max(score, 80)
  // 关键词命中关联 label 文本
  if (matchesKeyword(labels)) score = Math.max(score, 70)

  // inputmode=numeric + maxlength 4-8
  if ((inputMode === 'numeric' || inputMode === 'tel') && maxLen >= 4 && maxLen <= 8) {
    score = Math.max(score, 55)
  }

  // 带 maxlength 约束的 "code" 类字段（避免 promo code 等误报）
  if (compact(attrs).includes('code') && maxLen >= 4 && maxLen <= 8 && inputMode === 'numeric') {
    score = Math.max(score, 60)
  }

  // 邻近提示：附近有密码框或登录按钮（password 类型仅凭关键词等强信号判定，避免误判）
  if (score < 50 && input.type !== 'password' && nearLoginContext(input)) {
    score = Math.max(score, 45)
  }

  // autocomplete="off" 且无强信号时降低优先级
  if (autocomplete === 'off' && score < 60) {
    score = Math.max(0, score - 20)
  }

  return score
}

/** 是否为 OTP 输入框 */
export function isOTPField(input: HTMLInputElement): boolean {
  return scoreInput(input) >= 40
}

/** 查找页面中评分最高的 OTP 输入框 */
export function findOTPField(): HTMLInputElement | null {
  const inputs = Array.from(document.querySelectorAll('input'))
  let best: HTMLInputElement | null = null
  let bestScore = 0
  for (const input of inputs) {
    const score = scoreInput(input)
    if (score > bestScore) {
      bestScore = score
      best = input
    }
  }
  return bestScore >= 40 ? best : null
}

/** 是否为单字符分段输入框（分段式 OTP 的组成单元） */
export function isSegmentedInput(input: HTMLInputElement): boolean {
  if (!CANDIDATE_TYPES.has(input.type)) return false
  if (!isVisible(input)) return false
  return input.maxLength === 1 || input.getAttribute('size') === '1'
}

function sortByDomOrder(elements: HTMLInputElement[]): HTMLInputElement[] {
  return elements.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
}

/**
 * 查找锚点输入框所属的分段 OTP 组（4-8 个单字符输入框）
 * @param anchor - 聚焦/点击的输入框
 * @returns 按 DOM 顺序排列的组，或 null
 */
export function findSegmentedGroupFor(anchor: HTMLInputElement): HTMLInputElement[] | null {
  const all = Array.from(document.querySelectorAll('input')).filter(isSegmentedInput)
  let node: HTMLElement | null = anchor.parentElement
  for (let depth = 0; depth < 3 && node; depth++) {
    const group = all.filter(
      (i) => i.parentElement === node || i.parentElement?.parentElement === node
    )
    if (group.length >= 4 && group.length <= 8) {
      return sortByDomOrder(group)
    }
    node = node.parentElement
  }
  return null
}

/** 查找页面中第一个分段 OTP 组 */
export function findSegmentedGroup(): HTMLInputElement[] | null {
  const inputs = Array.from(document.querySelectorAll('input'))
  for (const input of inputs) {
    if (isSegmentedInput(input)) {
      const group = findSegmentedGroupFor(input)
      if (group) return group
    }
  }
  return null
}

/** 通过原生 value setter 写入（兼容 React/Vue 受控组件），失败回退直接赋值 */
function setInputValue(input: HTMLInputElement, value: string): void {
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
  if (desc && desc.set) {
    desc.set.call(input, value)
  } else {
    input.value = value
  }
}

/** 派发框架识别所需的输入事件（1Password 同款：bubbles + cancelable） */
function dispatchInputEvents(input: HTMLInputElement): void {
  input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
  input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
}

/** 标记已填充，避免重复填充（对应 1Password 的 data-com-onepassword-filled） */
function markFilled(input: HTMLInputElement): void {
  input.dataset.mfaFilled = 'true'
}

function fillSingle(code: string, input: HTMLInputElement): FillResult {
  setInputValue(input, code)
  dispatchInputEvents(input)
  input.focus()
  markFilled(input)
  return { status: 'filled', mode: 'single' }
}

function fillSegmented(code: string, group: HTMLInputElement[]): FillResult {
  const digits = code.replace(/\D/g, '')
  group.forEach((box, i) => {
    if (i < digits.length) {
      setInputValue(box, digits[i])
      dispatchInputEvents(box)
      markFilled(box)
    }
  })
  // 聚焦下一个空框，填满则聚焦最后框
  const next = group.find((box) => box.value === '')
  ;(next || group[group.length - 1]).focus()
  return { status: 'filled', mode: 'segmented' }
}

/**
 * 填充验证码到页面
 * @param code - TOTP 验证码
 * @param anchor - 可选：已知的聚焦输入框（内联菜单场景），优先填充它或其分段组
 */
export function fillCode(code: string, anchor?: HTMLInputElement): FillResult {
  try {
    if (anchor) {
      const group = findSegmentedGroupFor(anchor)
      if (group) return fillSegmented(code, group)
      if (isOTPField(anchor)) return fillSingle(code, anchor)
    }
    const group = findSegmentedGroup()
    if (group) return fillSegmented(code, group)
    const field = findOTPField()
    if (field) return fillSingle(code, field)
    return { status: 'no-field', mode: 'single' }
  } catch {
    return { status: 'error', mode: 'single' }
  }
}