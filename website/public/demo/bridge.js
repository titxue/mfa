// The shipped extension UI runs against an in-memory browser adapter here.
// It never reads or writes the visitor's extension accounts or Chrome profile.
(() => {
  const examples = [
    { name: 'GitHub', secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', website: 'https://github.com' },
    { name: 'Google', secret: 'JBSWY3DPEHPK3PXP', website: 'https://accounts.google.com' },
    { name: 'Steam', secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', type: 'steam' },
  ]
  const preset = new URLSearchParams(location.search).get('preset') ?? 'full'
  const accounts = preset === 'empty' ? [] : preset === 'one' ? examples.slice(0, 1) : examples
  const listeners = new Set()
  const stores = {
    sync: { language: new URLSearchParams(location.search).get('lang') === 'en' ? 'en-US' : 'zh-CN', accountVaultV2: { id: 'guide-example', vector: { 'guide-example': 1 }, record: { version: 2, revision: 'guide-example', mode: 'plain', accounts } } },
    local: { theme: 'light' }, session: {},
  }
  const notify = detail => window.dispatchEvent(new CustomEvent('mfa-guide-event', { detail }))
  const areas = Object.fromEntries(Object.keys(stores).map(area => [area, {
    async get(keys) {
      if (keys == null) return structuredClone(stores[area])
      if (typeof keys === 'string') keys = [keys]
      if (!Array.isArray(keys)) return { ...keys, ...structuredClone(stores[area]) }
      return Object.fromEntries(keys.filter(key => key in stores[area]).map(key => [key, structuredClone(stores[area][key])]))
    },
    async set(values) {
      const changes = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { oldValue: stores[area][key], newValue: value }]))
      Object.assign(stores[area], structuredClone(values))
      queueMicrotask(() => listeners.forEach(listener => listener(changes, area)))
    },
    async remove(keys) { for (const key of [].concat(keys)) delete stores[area][key] },
    async clear() { stores[area] = {} },
    async getBytesInUse() { return new TextEncoder().encode(JSON.stringify(stores[area])).length },
    async setAccessLevel() {},
  }]))
  window.chrome ??= {}
  window.chrome.storage = { ...areas, onChanged: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) } }
  window.chrome.tabs = {
    async query() { return [{ id: 1, url: 'https://example.com/login', active: true }] },
    async sendMessage(_id, message) {
      if (message.type === 'FILL_CODE') {
        const input = parent.document.querySelector('#demo-otp')
        if (!input) return { status: 'no-field' }
        input.value = message.code
        input.dispatchEvent(new Event('input', { bubbles: true }))
        notify({ type: 'filled', code: message.code })
        return { status: 'filled', mode: 'single' }
      }
      return {}
    },
    async create() { notify({ type: 'external-feature' }) },
  }
  window.chrome.runtime ??= { async sendMessage() { return { ok: true } } }
  window.chrome.permissions = { async getAll() { return { origins: [], permissions: [] } }, async contains() { return false }, async request() { return false }, onAdded: { addListener() {}, removeListener() {} }, onRemoved: { addListener() {}, removeListener() {} } }
  window.chrome.scripting = { async executeScript() { return [] } }
  const blobs = new Map()
  const createURL = URL.createObjectURL.bind(URL)
  URL.createObjectURL = blob => { const url = createURL(blob); blobs.set(url, blob); return url }
  const nativeClick = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function () {
    const blob = blobs.get(this.href)
    if (this.download && blob) {
      window.mfaGuide.lastDownload = { blob, name: this.download }
      blob.text().then(text => {
        window.mfaGuide.backupText = text
        notify({ type: 'backup', text, name: this.download })
      })
      return
    }
    return nativeClick.call(this)
  }
  window.mfaGuide = { examples, stores, lastDownload: null, backupText: null, notify }
  for (const type of ['pointerdown', 'keydown']) {
    document.addEventListener(type, event => {
      if (event.isTrusted) notify({ type: 'manual' })
    }, true)
  }
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('link')
    style.rel = 'stylesheet'
    style.href = '../demo-style.css'
    document.head.append(style)
    const pointer = document.createElement('div')
    pointer.className = 'mfa-guide-pointer'
    pointer.hidden = true
    pointer.setAttribute('aria-hidden', 'true')
    pointer.innerHTML = '<span class="mfa-guide-press"></span><span class="mfa-guide-glyph"><svg viewBox="0 0 27 34" fill="currentColor" stroke="white" stroke-width="1.5"><path d="M2 1v26l7-6 6 12 6-3-6-12h10Z"/></svg></span>'
    document.body.append(pointer)
    window.mfaGuide.point = element => {
      document.querySelectorAll('.mfa-guide-highlight').forEach(node => node.classList.remove('mfa-guide-highlight'))
      if (!element) { pointer.hidden = true; return }
      const scroller = element.closest('.overflow-y-auto, .overflow-auto')
      if (scroller) {
        const viewport = scroller.getBoundingClientRect()
        const target = element.getBoundingClientRect()
        if (target.top < viewport.top) scroller.scrollTop += target.top - viewport.top
        else if (target.bottom > viewport.bottom) scroller.scrollTop += target.bottom - viewport.bottom
      }
      const rect = element.getBoundingClientRect()
      pointer.hidden = false
      pointer.style.transform = `translate(${rect.x + rect.width * .65}px,${rect.y + rect.height * .55}px)`
      element.classList.add('mfa-guide-highlight')
    }
    window.mfaGuide.press = () => {
      if (pointer.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const glyph = pointer.querySelector('.mfa-guide-glyph')
      const pulse = pointer.querySelector('.mfa-guide-press')
      for (const element of [glyph, pulse]) element.getAnimations().forEach(animation => animation.cancel())
      glyph.animate([{ transform: 'scale(1)' }, { transform: 'scale(.86)', offset: .4 }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' })
      pulse.animate([{ opacity: .55, transform: 'scale(.5)' }, { opacity: 0, transform: 'scale(1.8)' }], { duration: 400, easing: 'cubic-bezier(.23,1,.32,1)' })
    }
  })
})()
