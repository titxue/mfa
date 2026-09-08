/**
 * 页面内联 UI（1Password 风格）
 * - 聚焦 OTP 字段时，在字段右侧显示填充按钮（钥匙图标）
 * - 点击按钮弹出账户菜单，点击账户或其"填充"按钮即填充
 * 阴影 DOM 实现，样式内联嵌入项目设计令牌（与 src/styles/globals.css 浅色主题一致）
 */

import { TOTP } from '@/utils/totp'

export interface MenuAccount {
  name: string
  website?: string
}

export interface MenuStrings {
  fill: string
  noAccounts: string
  filled?: string
  failed?: string
}

export interface InlineMenuOptions {
  /** 分格验证码共用一个组外按钮，填充仍以当前输入框为锚点。 */
  inputGroup?: HTMLInputElement[]
  accounts: MenuAccount[]
  strings: MenuStrings
  /** 点击账户时回调（code 为点击时刻重新生成的最新验证码） */
  getCode: (account: MenuAccount) => Promise<string>
  onFill: (account: MenuAccount, code: string) => void
}

const BUTTON_SIZE = 24
const GAP = 6

/** 按钮 + 菜单样式：使用项目 shadcn/ui 浅色设计令牌 */
const INLINE_CSS = `
.mfa-button {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 6px;
  background: hsl(0 0% 100%);
  border: 1px solid hsl(240 5.9% 90%);
  color: hsl(240 5.9% 10%);
  cursor: pointer;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
  transition: background-color 150ms;
  font-family: inherit;
}
.mfa-button:hover {
  background: hsl(240 4.8% 95.9%);
}
.mfa-button:focus-visible { outline: 2px solid hsl(240 5.9% 10%); outline-offset: 2px; }
.mfa-button:active { transform: scale(0.96); }
.mfa-button svg {
  display: block;
}
.mfa-menu {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
  background: hsl(0 0% 100%);
  color: hsl(240 10% 3.9%);
  border: 1px solid hsl(240 5.9% 90%);
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  min-width: 220px;
  max-width: 320px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
  animation: mfa-menu-in 120ms ease-out;
}
@keyframes mfa-menu-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.mfa-menu::-webkit-scrollbar { display: none; }
.mfa-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: background-color 150ms;
}
.mfa-item:hover,
.mfa-item:focus-visible {
  background: hsl(240 4.8% 95.9%);
  outline: none;
}
.mfa-item-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: hsl(240 4.8% 95.9%);
  color: hsl(240 3.8% 46.1%);
  transition: color 150ms;
}
.mfa-item:hover .mfa-item-icon {
  color: hsl(240 5.9% 10%);
}
.mfa-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mfa-item-name {
  font-size: 14px;
  font-weight: 500;
  color: hsl(240 10% 3.9%);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mfa-item-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: hsl(240 5.9% 10%);
}
.mfa-item-fill {
  flex-shrink: 0;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid hsl(240 5.9% 90%);
  background: hsl(0 0% 100%);
  color: hsl(240 5.9% 10%);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 150ms;
}
.mfa-item:hover .mfa-item-fill {
  background: hsl(240 5.9% 10%);
  color: hsl(0 0% 98%);
  border-color: transparent;
}
.mfa-item-fill:focus-visible {
  outline: none;
  background: hsl(240 5.9% 10%);
  color: hsl(0 0% 98%);
  border-color: transparent;
}
.mfa-feedback-badge {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 4px 10px;
  gap: 6px;
  white-space: nowrap;
  border-radius: 6px;
  border: 1px solid hsl(240 5.9% 90%);
  background: hsl(0 0% 100%);
  color: hsl(240 5.9% 10%);
  font-size: 12px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.15);
  animation: mfa-feedback-in 150ms ease-out;
}
@keyframes mfa-feedback-in {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}
.mfa-empty {
  padding: 6px 8px;
  font-size: 14px;
  color: hsl(240 3.8% 46.1%);
}
@media (prefers-reduced-motion: reduce) {
  .mfa-menu, .mfa-feedback-badge { animation: none; }
  .mfa-button, .mfa-item, .mfa-item-fill { transition: none; }
}
`

/** 钥匙图标（lucide "key"） */
const KEY_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>'

/** 常见顶级域名/后缀，从主机名提取"站点标识"时排除 */
const COMMON_DOMAIN_SUFFIXES = new Set([
  'com', 'net', 'org', 'io', 'co', 'cn', 'jp', 'de', 'ru', 'fr', 'es', 'br', 'in',
  'kr', 'tw', 'hk', 'uk', 'au', 'ca', 'me', 'app', 'dev', 'site', 'top', 'xyz',
  'online', 'store', 'shop', 'gov', 'edu', 'info', 'biz', 'cloud', 'work', 'live',
])

/** 名称归一化（小写、去分隔符） */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0600-\u06ff\u0900-\u097f]/g, '')
}

/**
 * 账户是否匹配当前网站
 * 两档匹配：
 *  1. website 字段主机名匹配（含子域双向匹配）
 *  2. 账户名与主机名"站点标识"匹配（如账户名 "GitHub" ↔ github.com）
 */
export function accountMatchesSite(account: MenuAccount, hostname: string): boolean {
  const currentHost = hostname.toLowerCase()

  if (account.website) {
    try {
      const siteHost = new URL(account.website).hostname.toLowerCase()
      if (currentHost === siteHost || currentHost.endsWith('.' + siteHost) || siteHost.endsWith('.' + currentHost)) {
        return true
      }
    } catch {
      // 无效 URL 则忽略
    }
  }

  const nameCompact = normalizeName(account.name)
  if (!nameCompact) return false
  const tokens = currentHost.split('.').filter((t) => t && !COMMON_DOMAIN_SUFFIXES.has(t))
  return tokens.some((t) => {
    if (t.length >= 3 && nameCompact.includes(t)) return true
    if (nameCompact.length >= 4 && t.includes(nameCompact)) return true
    return false
  })
}

/**
 * 过滤出匹配当前网站的账户（供自动填充与菜单筛选）
 */
export function matchAccountsForSite(accounts: MenuAccount[], hostname: string): MenuAccount[] {
  return accounts.filter((a) => accountMatchesSite(a, hostname))
}

// ---------- 内联 UI 状态 ----------

let anchorElement: HTMLInputElement | null = null
let anchorGroup: HTMLInputElement[] = []
let options: InlineMenuOptions | null = null
let buttonHost: HTMLElement | null = null
let buttonShadow: ShadowRoot | null = null
let menuHost: HTMLElement | null = null
let menuShadow: ShadowRoot | null = null
let refreshTimer: number | null = null
let menuRefresh: (() => void) | null = null
let hideTimer: number | null = null
const cleanupFns: Array<() => void> = []

let feedbackTimer: number | null = null
let feedbackBadge: HTMLElement | null = null

/**
 * 填充反馈：黑白提示条，不修改宿主网页输入框样式。
 * @param anchor - 被填充的输入框
 */
export function showFilledFeedback(anchor: HTMLInputElement, label = '✓'): void {
  if (feedbackTimer !== null) {
    window.clearTimeout(feedbackTimer)
    feedbackTimer = null
  }
  if (feedbackBadge && feedbackBadge.parentNode) {
    feedbackBadge.parentNode.removeChild(feedbackBadge)
    feedbackBadge = null
  }
  const doc = anchor.ownerDocument
  // ✓ 徽标（fixed 定位在字段右侧）
  feedbackBadge = doc.createElement('div')
  feedbackBadge.style.cssText = 'all: initial; position: fixed; z-index: 2147483647;'
  const shadow = feedbackBadge.attachShadow({ mode: 'closed' })
  const styleEl = doc.createElement('style')
  styleEl.textContent = INLINE_CSS
  shadow.appendChild(styleEl)
  const badgeEl = doc.createElement('div')
  badgeEl.className = 'mfa-feedback-badge'
  badgeEl.textContent = label
  badgeEl.setAttribute('role', 'status')
  badgeEl.setAttribute('aria-live', 'polite')
  feedbackBadge.style.pointerEvents = 'none'
  shadow.appendChild(badgeEl)
  const rect = anchor.getBoundingClientRect()
  doc.documentElement.appendChild(feedbackBadge)
  const width = feedbackBadge.getBoundingClientRect().width
  const left = Math.min(Math.max(rect.left, 4), Math.max(4, window.innerWidth - width - 4))
  const top = rect.bottom + 6 + 28 > window.innerHeight ? Math.max(4, rect.top - 34) : rect.bottom + 6
  feedbackBadge.style.left = Math.round(left) + 'px'
  feedbackBadge.style.top = Math.round(top) + 'px'
  doc.documentElement.appendChild(feedbackBadge)

  feedbackTimer = window.setTimeout(() => {
    if (feedbackBadge && feedbackBadge.parentNode) {
      feedbackBadge.parentNode.removeChild(feedbackBadge)
    }
    feedbackBadge = null
    feedbackTimer = null
  }, 1600)
}

/** 清除按钮与菜单，解绑所有监听器 */
export function hideInlineUI(): void {
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer)
    hideTimer = null
  }
  for (const fn of cleanupFns.splice(0)) {
    try {
      fn()
    } catch {
      // ignore
    }
  }
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
  anchorElement = null
  anchorGroup = []
  options = null
  buttonShadow = null
  menuShadow = null
  if (menuHost && menuHost.parentNode) {
    menuHost.parentNode.removeChild(menuHost)
  }
  menuHost = null
  if (buttonHost && buttonHost.parentNode) {
    buttonHost.parentNode.removeChild(buttonHost)
  }
  buttonHost = null
}

/** 定位按钮到输入框右侧（视口内夹取） */
function positionButton(): void {
  if (!buttonHost || !anchorElement) return
  const rects = anchorGroup.filter(el => el.isConnected).map(el => el.getBoundingClientRect())
    .filter(rect => rect.width > 0 && rect.height > 0)
  const segmented = anchorGroup.length > 1
  const rect = segmented && rects.length ? {
    left: Math.min(...rects.map(r => r.left)), right: Math.max(...rects.map(r => r.right)),
    top: Math.min(...rects.map(r => r.top)), bottom: Math.max(...rects.map(r => r.bottom)),
    width: Math.max(...rects.map(r => r.right)) - Math.min(...rects.map(r => r.left)),
    height: Math.max(...rects.map(r => r.bottom)) - Math.min(...rects.map(r => r.top)),
  } : anchorElement.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    hideInlineUI()
    return
  }
  const fitsRight = rect.right + GAP + BUTTON_SIZE <= window.innerWidth - 4
  const preferredLeft = segmented ? (fitsRight ? rect.right + GAP : rect.right - BUTTON_SIZE) : rect.right - BUTTON_SIZE - 4
  const left = Math.min(Math.max(preferredLeft, 4), Math.max(4, window.innerWidth - BUTTON_SIZE - 4))
  const top = segmented && !fitsRight ? rect.bottom + GAP : rect.top + Math.max(0, (rect.height - BUTTON_SIZE) / 2)
  buttonHost.style.left = Math.round(left) + 'px'
  buttonHost.style.top = Math.round(top) + 'px'
}

/** 定位菜单到按钮附近（视口边缘自动翻转/夹取） */
function positionMenu(menuEl: HTMLElement): void {
  if (!menuHost || !buttonHost) return
  const rect = buttonHost.getBoundingClientRect()
  const menuWidth = Math.min(Math.max(menuEl.offsetWidth, 220), 320)
  const menuHeight = menuEl.offsetHeight
  const vw = window.innerWidth
  const vh = window.innerHeight
  let top = rect.bottom + GAP
  if (top + menuHeight > vh - 8) {
    top = Math.max(8, rect.top - GAP - menuHeight)
  }
  const left = Math.min(Math.max(rect.left, 8), Math.max(8, vw - 8 - menuWidth))
  menuHost.style.left = Math.round(left) + 'px'
  menuHost.style.top = Math.round(top) + 'px'
}

/** 渲染菜单内容（账户列表 + 填充按钮），返回仅刷新验证码文本的函数 */
function renderMenu(menuEl: HTMLElement, opts: InlineMenuOptions): () => void {
  const doc = menuEl.ownerDocument
  menuEl.innerHTML = ''
  const sorted = [...opts.accounts].sort(
    (a, b) => Number(accountMatchesSite(b, window.location.hostname)) - Number(accountMatchesSite(a, window.location.hostname))
  )
  if (sorted.length === 0) {
    const empty = doc.createElement('div')
    empty.className = 'mfa-empty'
    empty.textContent = opts.strings.noAccounts
    menuEl.appendChild(empty)
    return () => {}
  }

  const codeEls = new Map<MenuAccount, HTMLElement>()
  for (const account of sorted) {
    const item = doc.createElement('div')
    item.className = 'mfa-item'
    item.setAttribute('role', 'button')
    item.tabIndex = 0

    // 行首图标（钥匙）
    const icon = doc.createElement('span')
    icon.className = 'mfa-item-icon'
    icon.innerHTML = KEY_ICON_SVG

    const main = doc.createElement('div')
    main.className = 'mfa-item-main'
    const nameEl = doc.createElement('div')
    nameEl.className = 'mfa-item-name'
    nameEl.textContent = account.name
    const codeEl = doc.createElement('div')
    codeEl.className = 'mfa-item-code'
    codeEl.textContent = '······'
    codeEls.set(account, codeEl)
    main.appendChild(nameEl)
    main.appendChild(codeEl)

    const fillBtn = doc.createElement('button')
    fillBtn.type = 'button'
    fillBtn.className = 'mfa-item-fill'
    fillBtn.textContent = opts.strings.fill

    item.appendChild(icon)
    item.appendChild(main)
    item.appendChild(fillBtn)

    const handleActivate = (): void => {
      const onFill = opts.onFill
      const anchor = anchorElement
      hideInlineUI()
      // 点击时重新生成最新验证码
      opts.getCode(account)
        .then((code) => onFill(account, code))
        .catch(() => {
          if (anchor) showFilledFeedback(anchor, opts.strings.failed ?? '!')
        })
    }
    item.addEventListener('click', handleActivate)
    // 填充按钮点击不冒泡（避免与整行点击重复触发）
    fillBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      handleActivate()
    })
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleActivate()
      }
    })
    menuEl.appendChild(item)
  }

  // 键盘导航（监听在菜单内部，e.target 为真实项元素）
  const itemEls = Array.from(menuEl.querySelectorAll('.mfa-item')) as HTMLElement[]
  if (itemEls.length > 0) {
    itemEls[0].focus()
  }
  menuEl.addEventListener('keydown', (e) => {
    const items = Array.from(menuEl.querySelectorAll('.mfa-item')) as HTMLElement[]
    const idx = items.indexOf(e.target as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[Math.min(items.length - 1, idx + 1)]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[Math.max(0, idx - 1)]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    }
  })

  // 实时刷新验证码（随 30s 周期更新，仅更新文本不重建 DOM）
  const refreshCodes = (): void => {
    for (const [account, el] of codeEls) {
      opts.getCode(account)
        .then((code) => {
          if (el.isConnected) el.textContent = TOTP.formatCode(code)
        })
        .catch(() => {
          // ignore
        })
    }
  }
  refreshCodes()
  return refreshCodes
}

/** 打开账户菜单（挂在按钮旁） */
function openMenu(): void {
  if (!anchorElement || !options || menuHost) return
  const doc = anchorElement.ownerDocument
  menuHost = doc.createElement('div')
  menuHost.style.cssText = 'all: initial; position: fixed; z-index: 2147483647;'
  menuShadow = menuHost.attachShadow({ mode: 'closed' })
  const styleEl = doc.createElement('style')
  styleEl.textContent = INLINE_CSS
  menuShadow.appendChild(styleEl)
  const menuEl = doc.createElement('div')
  menuEl.className = 'mfa-menu'
  menuShadow.appendChild(menuEl)
  doc.documentElement.appendChild(menuHost)
  menuRefresh = renderMenu(menuEl, options)
  positionMenu(menuEl)
  refreshTimer = window.setInterval(() => {
    if (menuRefresh) menuRefresh()
  }, 1000)
}

/** 关闭菜单（保留按钮） */
function closeMenu(): void {
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
  menuRefresh = null
  menuShadow = null
  if (menuHost && menuHost.parentNode) {
    menuHost.parentNode.removeChild(menuHost)
  }
  menuHost = null
}

/**
 * 在输入框旁显示填充按钮（1Password 风格）
 * @param anchor - 触发 UI 的 OTP 输入框
 */
export function showInlineUI(anchor: HTMLInputElement, opts: InlineMenuOptions): void {
  const group = opts.inputGroup ?? [anchor]
  if (buttonHost && group.length > 1 && group.length === anchorGroup.length && group.every((el, index) => el === anchorGroup[index])) {
    anchorElement = anchor
    options = opts
    if (hideTimer !== null) { window.clearTimeout(hideTimer); hideTimer = null }
    positionButton()
    return
  }
  hideInlineUI()
  anchorElement = anchor
  anchorGroup = group
  options = opts

  const doc = anchor.ownerDocument
  // 填充按钮（fixed 定位，阴影 DOM）
  buttonHost = doc.createElement('div')
  buttonHost.style.cssText = 'all: initial; position: fixed; z-index: 2147483646;'
  buttonShadow = buttonHost.attachShadow({ mode: 'closed' })
  const styleEl = doc.createElement('style')
  styleEl.textContent = INLINE_CSS
  buttonShadow.appendChild(styleEl)
  const btn = doc.createElement('button')
  btn.type = 'button'
  btn.className = 'mfa-button'
  btn.setAttribute('aria-label', opts.strings.fill)
  btn.innerHTML = KEY_ICON_SVG
  buttonShadow.appendChild(btn)
  doc.documentElement.appendChild(buttonHost)
  positionButton()

  // 保持输入框焦点（避免点击按钮触发 focusout）
  btn.addEventListener('mousedown', (e) => e.preventDefault())
  btn.addEventListener('click', () => {
    const current = options
    // 单键直达：当前网站唯一匹配账户时点击按钮直接填充，不弹菜单
    const matches = matchAccountsForSite(current?.accounts ?? [], window.location.hostname)
    if (matches.length === 1) {
      const onFill = current?.onFill
      const anchor = anchorElement
      hideInlineUI()
      current!.getCode(matches[0])
        .then((code) => onFill?.(matches[0], code))
        .catch(() => {
          if (anchor) showFilledFeedback(anchor, current?.strings.failed ?? '!')
        })
      return
    }
    if (menuHost) {
      closeMenu()
    } else {
      openMenu()
    }
  })

  // 关闭/跟随事件
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') hideInlineUI()
  }
  const onMouseDown = (e: MouseEvent): void => {
    const target = e.target as Node | null
    if (!target) return
    // closed 阴影内的 mousedown 对外部监听器会重定向（retarget）为阴影宿主本身
    if (target === buttonHost || target === menuHost) return
    if (buttonShadow && buttonShadow.contains(target)) return
    if (menuShadow && menuShadow.contains(target)) return
    if (anchorGroup.some(el => target === el)) return
    hideInlineUI()
  }
  const onScroll = (): void => {
    closeMenu()
    positionButton()
  }
  const onResize = (): void => {
    closeMenu()
    positionButton()
  }
  const onFocusOut = (): void => {
    if (hideTimer !== null) window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(() => {
      const ae = document.activeElement
      // 焦点仍在按钮/菜单（closed 阴影内聚焦时 activeElement 为宿主）或输入框内 → 保持
      if (ae === buttonHost || ae === menuHost) return
      if (anchorGroup.some(el => ae === el)) return
      hideInlineUI()
    }, 150)
  }

  doc.addEventListener('keydown', onKeyDown, true)
  doc.addEventListener('mousedown', onMouseDown, true)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onResize)
  doc.addEventListener('focusout', onFocusOut, true)

  cleanupFns.push(() => {
    doc.removeEventListener('keydown', onKeyDown, true)
    doc.removeEventListener('mousedown', onMouseDown, true)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', onResize)
    doc.removeEventListener('focusout', onFocusOut, true)
  })
}
