import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useAccounts } from '../../src/hooks/useAccounts'
import { useSettings } from '../../src/hooks/useSettings'
import { Header } from '../../src/components/Header'
import { AccountItem } from '../../src/components/AccountItem'
import { I18nProvider } from '../../src/contexts/I18nContext'
import { findSegmentedGroupFor, fillCode } from '../../src/utils/otp-field'
import { showInlineUI, hideInlineUI } from '../../src/content-script-menu'

const fixture = document.querySelector<HTMLDivElement>('#fixture')!
const results: string[] = []
const testAccount = { name: 'Test account', secret: 'JBSWY3DPEHPK3PXP' }
let root: Root | undefined
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message) }
const deferred = () => {
  let resolve!: () => void, reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
async function render(node: React.ReactNode) {
  root = createRoot(fixture)
  await act(async () => { root!.render(node) })
}
async function check(name: string, run: () => Promise<void>) {
  try { await run(); results.push(`PASS ${name}`) }
  catch (error) { results.push(`FAIL ${name}: ${(error as Error).message}`) }
  finally {
    if (root) { await act(async () => root!.unmount()); root = undefined }
    hideInlineUI(); fixture.replaceChildren()
    document.querySelector('#results')!.textContent = results.join('\n')
  }
}
function chromeMock(sendMessage: (message: any) => Promise<any>, set = async (_value: unknown) => {}) {
  ;(globalThis as any).chrome = { runtime: { id: 'test', sendMessage,
    onMessage: { addListener() {}, removeListener() {} } },
    storage: { sync: { get: async () => ({}), set } } }
}

await check('account save is optimistic, blocks overlapping writes and exposes disabled controls', async () => {
  const gate = deferred()
  let writes = 0, state!: ReturnType<typeof useAccounts>
  let snapshot = { accounts: [testAccount], revision: 'one', protected: false, locked: false }
  chromeMock(async message => {
    if (message.action === 'save') { writes++; await gate.promise; snapshot = { ...snapshot, accounts: message.accounts, revision: 'two' } }
    return { ok: true, value: snapshot }
  })
  function Harness() { state = useAccounts(); return <I18nProvider><Header saving={state.isSaving} onAddAccount={() => {}} onOpenSettings={() => {}} /></I18nProvider> }
  await render(<Harness />)
  let save!: Promise<boolean>
  await act(async () => { save = state.updateAccounts([]) })
  assert(state.accounts.length === 0, 'optimistic update delayed')
  assert(state.isSaving && [...fixture.querySelectorAll('button')].every(button => button.disabled), 'write controls enabled during save')
  await act(async () => { assert(!await state.updateAccounts([testAccount]), 'overlapping save accepted') })
  assert(writes === 1 && state.error, 'overlap was silent or sent to storage')
  await act(async () => { gate.resolve(); assert(await save, 'save failed') })
  assert(!state.isSaving && state.revision === 'two', 'save never settled')
})

await check('account save failure restores persisted accounts and reports the error', async () => {
  let state!: ReturnType<typeof useAccounts>
  chromeMock(async message => message.action === 'save' ? { ok: false, error: 'quota' } :
    { ok: true, value: { accounts: [testAccount], revision: 'one', protected: false, locked: false } })
  function Harness() { state = useAccounts(); return null }
  await render(<Harness />)
  await act(async () => { assert(!await state.updateAccounts([]), 'failed save reported success') })
  assert(state.accounts.length === 1 && state.error === 'quota' && !state.isSaving, 'failed save did not roll back')
})

await check('settings failure rolls back; overlapping settings writes are rejected', async () => {
  const gate = deferred(); let writes = 0, state!: ReturnType<typeof useSettings>
  chromeMock(async () => ({}), async () => { writes++; await gate.promise })
  function Harness() { state = useSettings(); return null }
  await render(<Harness />)
  let save!: Promise<void>, failure = ''
  await act(async () => { save = state.updateSettings({ autofillInlineMenu: false }).catch(error => { failure = error.message }) })
  assert(!state.settings.autofillInlineMenu && state.saving, 'settings not optimistic')
  await act(async () => { await state.updateSettings({ clipboardFallback: false }).then(() => { throw new Error('overlap accepted') }, () => {}) })
  assert(writes === 1, 'multiple writes in flight')
  await act(async () => { gate.reject(new Error('storageError')); await save })
  assert(state.settings.autofillInlineMenu && !state.saving && failure === 'storageError', 'failed setting did not roll back')
})

await check('segmented OTP needs semantic evidence and never hijacks unrelated inputs', async () => {
  fixture.innerHTML = '<div id="postal" aria-label="Postal code">' + '<input maxlength="1">'.repeat(6) + '</div><input id="other">'
  const first = fixture.querySelector('input')!
  assert(!findSegmentedGroupFor(first), 'postal group misidentified')
  assert(fillCode('123456').status === 'no-field', 'filled unrelated group')
  fixture.querySelector('#postal')!.setAttribute('aria-label', 'One-time verification code')
  assert(findSegmentedGroupFor(first)?.length === 6, 'OTP group not recognized')
  assert(!findSegmentedGroupFor(fixture.querySelector('#other')!), 'unrelated anchor hijacked group')
  assert(fillCode('123456', first).status === 'filled', 'OTP fill failed')
  assert([...fixture.querySelectorAll('#postal input')].map(input => (input as HTMLInputElement).value).join('') === '123456', 'wrong values')
  fixture.innerHTML = '<div aria-label="OTP">' + '<input maxlength="1">'.repeat(5) + '</div>'
  assert(fillCode('ABCDE').status === 'filled', 'Steam segmented fill regressed')
})

await check('segmented groups resolve external aria-labelledby references', async () => {
  fixture.innerHTML = '<h2 id="external-label">Verification code</h2><span id="external-hint">Six digits</span>' +
    '<div role="group" aria-labelledby=" missing  external-label\texternal-hint ">' + '<input maxlength="1">'.repeat(6) + '</div>'
  const first = fixture.querySelector('input')!
  assert(findSegmentedGroupFor(first)?.length === 6, 'external OTP label not recognized')
  assert(fillCode('123456').status === 'filled', 'externally labelled OTP group not filled')
  assert([...fixture.querySelectorAll('input')].map(input => input.value).join('') === '123456', 'wrong segmented values')
  fixture.querySelector('#external-label')!.textContent = 'Postal code'
  assert(!findSegmentedGroupFor(first), 'unrelated external label accepted')
  assert(fillCode('654321').status === 'no-field', 'non-OTP external label allowed filling')
  fixture.querySelector('[role=group]')!.setAttribute('aria-labelledby', 'missing')
  assert(!findSegmentedGroupFor(first), 'missing label accepted')
})

await check('menu refreshes once per time step and gets a fresh code on selection', async () => {
  fixture.innerHTML = '<input autocomplete="one-time-code">'
  const roots: ShadowRoot[] = [], originalShadow = Element.prototype.attachShadow
  const originalInterval = window.setInterval, originalClear = window.clearInterval, originalNow = Date.now
  let tick: () => void = () => {}, time = 1000, calls = 0, filled = '', cleared = false
  Element.prototype.attachShadow = function (options) { const shadow = originalShadow.call(this, options); roots.push(shadow); return shadow }
  window.setInterval = ((callback: () => void) => { tick = callback; return 123 }) as typeof window.setInterval
  window.clearInterval = (() => { cleared = true }) as typeof window.clearInterval
  Date.now = () => time
  try {
    showInlineUI(fixture.querySelector('input')!, { accounts: [{ name: 'A' }, { name: 'B' }],
      strings: { fill: 'Fill', noAccounts: 'Empty' }, getCode: async () => { calls++; return String(time) },
      onFill: (_account, code) => { filled = code } })
    roots[0].querySelector('button')!.click()
    await Promise.resolve()
    assert(calls === 2, 'initial menu codes missing')
    for (time = 2000; time < 30000; time += 1000) tick()
    assert(calls === 2, 'same-step refresh caused extra requests')
    tick(); await Promise.resolve()
    assert(calls === 4, 'new step did not refresh')
    time = 31000; (roots[1].querySelector('.mfa-item') as HTMLElement).click(); await Promise.resolve()
    assert(calls === 5 && filled === '31000', 'selection used stale code')
    hideInlineUI(); assert(cleared, 'menu timer leaked')
  } finally { hideInlineUI(); Element.prototype.attachShadow = originalShadow; window.setInterval = originalInterval; window.clearInterval = originalClear; Date.now = originalNow }
})

await check('QR menu entry opens QR without filling or copying the code', async () => {
  let attempts = 0
  chromeMock(async () => { attempts++; return {} })
  ;(globalThis as any).chrome.tabs = { query: async () => { attempts++; return [] } }
  await render(<I18nProvider><AccountItem saving name={testAccount.name} secret={testAccount.secret} code="123456" remaining={20} onDelete={async () => true} onEdit={() => {}} /></I18nProvider>)
  const card = fixture.querySelector('[data-state]') ?? fixture.firstElementChild!
  await act(async () => { card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2, clientX: 80, clientY: 80 })) })
  const menuItem = [...document.querySelectorAll<HTMLElement>('[role=menuitem]')].find(el => el.textContent?.includes('二维码'))
  assert(menuItem, 'QR menu item missing')
  const mutations = [...document.querySelectorAll<HTMLElement>('[role=menuitem]')].filter(el => el !== menuItem)
  assert(mutations.length === 2 && mutations.every(el => el.getAttribute('aria-disabled') === 'true'), 'edit/delete enabled during save')
  await act(async () => { menuItem!.click() })
  assert(document.querySelector('[role=dialog]'), 'QR dialog did not open')
  assert(attempts === 0, 'opening QR triggered autofill')
})

await check('unlock restores autofill on an already-focused field without a page reload', async () => {
  fixture.innerHTML = '<input autocomplete="one-time-code">'
  const input = fixture.querySelector('input')!
  input.focus()
  let locked = true, allowed = true, requests = 0
  let messageHandler!: (message: unknown, sender: unknown, respond: () => void) => boolean
  chromeMock(async message => {
    if (message.type === 'SITE_ACCESS_CHECK') return { allowed }
    if (message.action === 'code') { requests++; return { ok: true, value: '123456' } }
    return { ok: true, value: { locked, revision: 'one', accounts: locked ? [] : [{ name: 'Demo', website: location.origin }],
      settings: { autofillInlineMenu: true, clipboardFallback: true }, language: 'en-US' } }
  })
  ;(chrome.runtime.onMessage as any).addListener = (handler: typeof messageHandler) => { messageHandler = handler }
  const shadows: ShadowRoot[] = [], original = Element.prototype.attachShadow
  Element.prototype.attachShadow = function (options) { const shadow = original.call(this, options); shadows.push(shadow); return shadow }
  const settle = () => new Promise(resolve => setTimeout(resolve, 20))
  const fillButton = () => shadows.filter(shadow => shadow.host.isConnected).map(shadow => shadow.querySelector<HTMLButtonElement>('.mfa-button')).find(Boolean)
  try {
    await import('../../src/content-script')
    await settle()
    assert(fillButton(), 'locked field has no menu button')
    locked = false
    messageHandler({ type: 'VAULT_CHANGED', invalidate: true }, {}, () => {})
    await settle()
    assert(document.activeElement === input && fillButton(), 'unlock did not restore the focused field button')
    fillButton()!.click(); await settle()
    assert(input.value === '123456' && requests === 1, 'unlock still requires refresh before filling')
    allowed = false
    messageHandler({ type: 'SITE_ACCESS_CHANGED' }, {}, () => {})
    await settle()
    assert(!fillButton(), 'revoked site regained autofill')
  } finally { Element.prototype.attachShadow = original }
})

document.title = results.some(result => result.startsWith('FAIL')) ? 'FAIL MFA regression' : 'PASS MFA regression'
;(window as any).regressionResults = results
