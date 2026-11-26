import { COPY, CHAPTERS } from './content.js'
import { intro, chapterEnter, surfaceEnter, updateMarker, codeTransfer } from './motion.js'

const $ = selector => document.querySelector(selector)
const frame = $('#extension')
const audio = $('#narration')
const embedded = parent !== window && document.documentElement.classList.contains('is-embedded')
const narration = await fetch('./media/narration.json')
  .then(response => {
    if (!response.ok) throw new Error('Could not load demo narration')
    return response.json()
  })
  .catch(error => {
    notifyHost('error')
    throw error
  })
const requestedLocale = new URLSearchParams(location.search).get('lang')
const state = { locale: requestedLocale === 'zh' || requestedLocale === 'en' ? requestedLocale : localStorage.getItem('mfa-guide-language') ?? (navigator.language.startsWith('zh') ? 'zh' : 'en'), chapter: 0, playing: false, touched: false, prepared: false, elapsed: 0, action: 0, busy: false, epoch: 0, sound: true, speed: 1, finished: false, lastBackup: null, lastCode: null }
if (!COPY[state.locale]) state.locale = 'en'
const demoPassword = 'MFAdemo2026!'
const demoURI = 'otpauth://totp/GitHub?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=GitHub'
const copy = () => COPY[state.locale]
const chapter = () => CHAPTERS[state.chapter]
const win = () => frame.contentWindow
const doc = () => frame.contentDocument
const visible = element => element && element.getClientRects().length && win().getComputedStyle(element).visibility !== 'hidden'
const nodes = selector => [...doc().querySelectorAll(selector)].filter(visible)
const findButton = (label, root = doc()) => [...root.querySelectorAll('button')].find(element => visible(element) && (element.textContent.trim().replace(/\s+/g, ' ') === label || element.getAttribute('aria-label') === label))
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
const duration = () => Math.max(chapter().minimum, narration[state.locale][chapter().id].duration + 0.5)
const cancelled = Symbol('cancelled')
const assert = token => { if (token !== undefined && token !== state.epoch) throw cancelled }
let pendingExplore = false
let lastDialogFocus = null

function notifyHost(type, extra = {}) {
  if (embedded) parent.postMessage({ type: `mfa-guide:${type}`, ...extra }, location.origin)
}

function explore() {
  if (!state.prepared) {
    pendingExplore = true
    return
  }
  pendingExplore = false
  pause(true)
  point(null)
  const dialog = nodes('[role="dialog"], [role="alertdialog"]').at(-1)
  let target = findButton(copy().labels.add) ?? doc().querySelector('input[id^="unlock-"]')
  if (dialog) {
    target = dialog.contains(lastDialogFocus) && visible(lastDialogFocus)
      ? lastDialogFocus
      : [...dialog.querySelectorAll('input, button, select, textarea')].find(control => !control.disabled && visible(control))
  }
  const focusTarget = target ?? frame
  focusTarget.focus({ preventScroll: true })
  const panel = $('.extension-viewport')
  if (embedded) {
    notifyHost('panel', { offset: panel.getBoundingClientRect().top })
  } else {
    panel.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
}

function trackDialogFocus(event) {
  const dialog = event.target.closest?.('[role="dialog"], [role="alertdialog"]')
  if (!dialog) return
  const entering = !dialog.contains(lastDialogFocus)
  lastDialogFocus = event.target
  if (!entering || !dialog.querySelector('#name')) return

  const owner = dialog.ownerDocument
  const observer = new MutationObserver(() => {
    if (dialog.isConnected) return
    observer.disconnect()
    requestAnimationFrame(() => {
      if (doc() === owner && document.activeElement === frame && owner.activeElement === owner.body) {
        findButton(copy().labels.add)?.focus({ preventScroll: true })
      }
    })
  })
  observer.observe(dialog.parentNode, { childList: true })
}

if (embedded) {
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent) return
    if (event.data?.type === 'mfa-guide:status' && state.prepared) notifyHost('ready')
    if (event.data?.type === 'mfa-guide:explore') explore()
  })
}

async function until(predicate, token) {
  const deadline = performance.now() + 6500
  while (!predicate()) {
    assert(token)
    if (performance.now() > deadline) throw new Error('Demo control is not available')
    await delay(50)
  }
  assert(token)
}

async function click(element, token, point = true) {
  assert(token)
  if (!element) throw new Error('Demo control is missing')
  if (point) {
    win().mfaGuide.point(element)
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) await delay(160)
    assert(token)
    win().mfaGuide.press?.()
  }
  element.click()
  await delay(140)
  assert(token)
}

function input(element, value) {
  if (!element) throw new Error('Demo field is missing')
  const setter = Object.getOwnPropertyDescriptor(win().HTMLInputElement.prototype, 'value').set
  setter.call(element, value)
  element.dispatchEvent(new (win().Event)('input', { bubbles: true }))
  element.dispatchEvent(new (win().Event)('change', { bubbles: true }))
}

function point(element) { win().mfaGuide?.point(element) }
function card() { return doc().querySelector('.sortable-account[aria-label="GitHub"] .account-card') }
function submitButton() { return nodes('[role="dialog"] form button[type="submit"]').at(-1) }
function protectionButton() { return nodes('button').find(element => element.textContent.includes(copy().labels.password)) }

async function loadFrame(preset, token) {
  const stage = $('.demo-stage')
  stage.classList.add('is-loading')
  stage.setAttribute('aria-busy', 'true')
  frame.inert = true
  if (frame.getAttribute('src') !== 'about:blank') {
    await delay(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 130)
    assert(token)
  }
  const ready = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }))
  frame.src = `./extension/popup.html?preset=${preset}&lang=${state.locale}&run=${state.epoch}-${Date.now()}`
  await ready
  assert(token)
  lastDialogFocus = null
  doc().addEventListener('focusin', trackDialogFocus)
  win().addEventListener('mfa-guide-event', onFrameEvent)
  await until(() => findButton(copy().labels.add) || doc().querySelector('input[id^="unlock-"]'), token)
  resizeFrame()
  frame.inert = false
  stage.classList.remove('is-loading')
  stage.setAttribute('aria-busy', 'false')
}

function resizeFrame() {
  frame.style.transform = 'scale(' + $('.extension-viewport').clientWidth / 380 + ')'
}

function onFrameEvent(event) {
  const detail = event.detail
  if (detail.type === 'manual' && state.playing) { pause(true); point(null) }
  if (detail.type === 'filled') {
    state.lastCode = detail.code
    const wasHidden = $('#login-preview').hidden
    $('#login-preview').hidden = false
    $('#login-help').textContent = copy().codeFilled
    $('#login-preview').classList.add('filled')
    if (wasHidden) surfaceEnter($('#login-preview'))
    codeTransfer(detail.code)
  }
  if (detail.type === 'backup') {
    if (detail.name.endsWith('.json')) {
      state.lastBackup = detail.text
      $('#backup-preview').hidden = false
      surfaceEnter($('#backup-preview'))
      $('#backup-meta').textContent = copy().backupMeta
      announce(copy().backupReady)
    }
  }
  if (detail.type === 'external-feature') announce(copy().noPermission)
}

function announce(text) { $('#announcer').textContent = text }

function translate() {
  const t = copy()
  document.documentElement.lang = state.locale === 'zh' ? 'zh-CN' : 'en'
  document.title = t.title
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t[element.dataset.i18n]
  for (const element of document.querySelectorAll('[data-i18n-html]')) element.innerHTML = t[element.dataset.i18nHtml]
  for (const element of document.querySelectorAll('[data-i18n-aria]')) element.setAttribute('aria-label', t[element.dataset.i18nAria])
  for (const element of document.querySelectorAll('[data-i18n-title]')) element.title = t[element.dataset.i18nTitle]
  $('#language').value = state.locale
  $('[data-home]').href = state.locale === 'zh' ? '/zh/' : '/'
  renderChapter()
  renderControls()
}

function renderChapter() {
  const item = chapter()[state.locale]
  document.body.dataset.chapter = chapter().id
  $('#chapter-count').textContent = `${String(state.chapter + 1).padStart(2, '0')} / 07`
  $('#chapter-name').textContent = item.name
  $('#chapter-title').textContent = item.title
  $('#chapter-description').textContent = item.description
  $('#login-preview').hidden = chapter().id !== 'use'
  $('#demo-otp').value = ''
  delete $('#login-preview').dataset.filled
  $('#login-help').textContent = copy().loginHelp
  $('#backup-preview').hidden = !state.lastBackup || chapter().id !== 'backup'
  $('#backup-meta').textContent = copy().backupMeta
  if (!$('#chapter-nav').querySelector('.chapter-button')) $('#chapter-nav').append(...CHAPTERS.map((item, index) => {
    const button = document.createElement('button')
    button.className = 'chapter-button'
    button.innerHTML = `<span class="chapter-number">${String(index + 1).padStart(2, '0')}</span><span></span>`
    button.addEventListener('click', () => selectChapter(index))
    return button
  }))
  for (const [index, button] of [...$('#chapter-nav').querySelectorAll('.chapter-button')].entries()) {
    button.lastElementChild.textContent = CHAPTERS[index][state.locale].name
    button.classList.toggle('completed', index < state.chapter)
    if (index === state.chapter) button.setAttribute('aria-current', 'step')
    else button.removeAttribute('aria-current')
  }
  updateMarker()
  chapterEnter()
  const tools = $('#chapter-tools')
  tools.replaceChildren()
  const addTool = (label, callback) => {
    const button = document.createElement('button')
    button.className = 'tool-button'
    button.textContent = label
    button.addEventListener('click', () => manualAction(callback))
    tools.append(button)
  }
  if (chapter().id === 'add') addTool(copy().sampleAccount, fillSample)
  if (chapter().id === 'manage') addTool(copy().showQr, showQR)
  if (chapter().id === 'protect') {
    addTool(copy().demoPassword, fillDemoPassword)
    const hint = document.createElement('span')
    hint.className = 'chapter-hint'
    hint.append(copy().demoPasswordHint + ' ')
    const code = document.createElement('code'); code.textContent = demoPassword; hint.append(code)
    tools.append(hint)
  }
  if (chapter().id === 'backup') addTool(copy().prepareBackup, () => play())
  if (chapter().id === 'end') addTool(copy().resetAll, () => selectChapter(0))
  $('#previous').disabled = state.chapter === 0
  $('#next').disabled = state.chapter === CHAPTERS.length - 1
  $('#captions').textContent = copy().captionsOff
  announce(item.name + '. ' + item.title)
  $('#transcript-content').replaceChildren(...CHAPTERS.map(item => {
    const section = document.createElement('section')
    const heading = document.createElement('h3'); heading.textContent = item[state.locale].name
    const paragraph = document.createElement('p'); paragraph.textContent = narration[state.locale][item.id].cues.map(cue => cue.text).join(' ')
    section.append(heading, paragraph)
    return section
  }))
}

function renderControls() {
  const label = state.playing ? copy().pause : state.finished ? copy().replay : state.touched ? copy().playChapter : state.elapsed > 0 ? copy().resume : state.chapter === 0 ? copy().play : copy().playChapter
  $('#play > span').textContent = state.prepared ? label : copy().loading
  $('#play').disabled = !state.prepared
  $('#play use').setAttribute('href', state.playing ? '#i-pause' : '#i-play')
  $('#sound').setAttribute('aria-pressed', String(state.sound))
  $('#sound use').setAttribute('href', state.sound ? '#i-volume' : '#i-mute')
  $('#player-state').textContent = state.playing ? copy().playerPlaying : state.finished ? copy().playerDone : state.touched ? copy().playerFree : state.elapsed > 0 ? copy().playerPaused : copy().playerReady
  document.body.dataset.mode = state.playing ? 'playing' : state.finished ? 'complete' : state.touched ? 'free' : state.elapsed > 0 ? 'paused' : 'idle'
}

function updateProgress() {
  const fraction = state.finished ? 1 : (state.chapter + Math.min(1, state.elapsed / duration())) / CHAPTERS.length
  $('#progress').value = fraction
  $('#progress-fill').style.transform = `scaleX(${fraction})`
  const cue = narration[state.locale][chapter().id].cues.find(cue => state.elapsed >= cue.start && state.elapsed < cue.end)
  if (cue) $('#captions').textContent = cue.text
}

function pause(touched = false) {
  state.playing = false
  audio.pause()
  if (touched) { state.touched = true; state.epoch++; state.busy = false }
  renderControls()
}

async function selectChapter(index, autoplay = false) {
  pause()
  state.epoch++
  const token = state.epoch
  Object.assign(state, { chapter: index, elapsed: 0, action: 0, busy: false, touched: false, prepared: false, finished: false })
  delete state.error
  if (chapter().id === 'backup') state.lastBackup = null
  renderChapter(); renderControls(); updateProgress()
  audio.src = `./media/${state.locale}-${chapter().id}.mp3`
  audio.playbackRate = state.speed
  try {
    await loadFrame(chapter().preset, token)
    assert(token)
    state.prepared = true
    renderControls()
    notifyHost('ready')
    if (pendingExplore) explore()
    else if (autoplay) play()
  } catch (error) { if (error !== cancelled) reportError(error) }
}

async function play() {
  if (state.playing) { pause(); return }
  if (!state.prepared) return
  if (state.finished) { await selectChapter(0, true); return }
  if (state.touched) { await selectChapter(state.chapter, true); return }
  state.playing = true
  state.lastFrame = performance.now()
  audio.muted = !state.sound
  audio.playbackRate = state.speed
  if (state.elapsed < narration[state.locale][chapter().id].duration) {
    audio.currentTime = state.elapsed
    audio.play().catch(() => { state.sound = false; audio.muted = true; renderControls() })
  }
  renderControls()
}

async function fillSample(token) {
  if (!doc().querySelector('#name')) await click(findButton(copy().labels.add), token)
  await until(() => doc().querySelector('#name'), token)
  const transfer = new (win().DataTransfer)()
  transfer.setData('text/plain', demoURI)
  doc().querySelector('[role="dialog"]').dispatchEvent(new (win().ClipboardEvent)('paste', { clipboardData: transfer, bubbles: true }))
  await until(() => doc().querySelector('#name')?.value === 'GitHub', token)
  point(doc().querySelector('#name'))
}

async function uploadSampleQR(token) {
  const response = await fetch('./media/demo-qr.png')
  const blob = await response.blob()
  assert(token)
  const transfer = new (win().DataTransfer)()
  transfer.items.add(new (win().File)([blob], 'github-example.png', { type: 'image/png' }))
  const fileInput = doc().querySelector('input[type=file]')
  fileInput.files = transfer.files
  fileInput.dispatchEvent(new (win().Event)('change', { bubbles: true }))
  await until(() => doc().querySelector('#name')?.value === 'GitHub', token)
}

async function showMenu(token) {
  point(card())
  const rect = card().getBoundingClientRect()
  card().dispatchEvent(new (win().MouseEvent)('contextmenu', { bubbles: true, button: 2, clientX: rect.x + 80, clientY: rect.y + 40 }))
  await until(() => nodes('[role=menuitem]').length, token)
}

async function showQR(token) {
  if (!nodes('[role=menuitem]').length) await showMenu(token)
  await click(nodes('[role=menuitem]')[0], token)
  await until(() => doc().querySelector('[role=dialog] img'), token)
}

async function openSettings(token) {
  if (!findButton(copy().labels.export)) await click(findButton(copy().labels.settings), token)
  await until(() => findButton(copy().labels.export), token)
}

async function openProtection(token) {
  await openSettings(token)
  await click(protectionButton(), token)
  await until(() => doc().querySelector('input[id^="new-"]'), token)
}

async function fillDemoPassword(token) {
  const unlock = doc().querySelector('input[id^="unlock-"]')
  if (unlock) { input(unlock, demoPassword); point(unlock); return }
  if (!doc().querySelector('input[id^="new-"]')) await openProtection(token)
  input(doc().querySelector('input[id^="new-"]'), demoPassword)
  input(doc().querySelector('input[id^="confirm-"]'), demoPassword)
  await delay(80)
  point(doc().querySelector('input[id^="confirm-"]'))
}

async function enableProtection(token) {
  if (!doc().querySelector('input[id^="new-"]')) await fillDemoPassword(token)
  await click(submitButton(), token)
  await until(() => nodes('header button[aria-label]').length >= 2, token)
}

async function closeSettings(token) {
  const closes = nodes('[role=dialog] button').filter(button => button.querySelector('.sr-only')?.textContent.trim() === 'Close')
  if (closes.length) await click(closes.at(-1), token, false)
  await delay(180)
}

async function exportSetup(token) {
  await openProtection(token)
  await fillDemoPassword(token)
  await enableProtection(token)
  await closeSettings(token)
}

async function importSetup(token) {
  await until(() => state.lastBackup, token)
  await loadFrame('empty', token)
  await openSettings(token)
  await click(findButton(copy().labels.import), token)
  await until(() => doc().querySelector('input[type=file]'), token)
  const transfer = new (win().DataTransfer)()
  transfer.items.add(new (win().File)([state.lastBackup], 'mfa-demo-backup.json', { type: 'application/json' }))
  const fileInput = doc().querySelector('input[type=file]')
  fileInput.files = transfer.files
  fileInput.dispatchEvent(new (win().Event)('change', { bubbles: true }))
  await until(() => doc().querySelector('input[id^="import-"]'), token)
}

const ACTIONS = {
  intro: [[0.1, () => point(card())], [0.65, () => point(null)]],
  add: [[0.08, token => click(findButton(copy().labels.add), token)], [0.4, uploadSampleQR], [0.62, () => point(doc().querySelector('#name'))], [0.75, token => click(submitButton(), token)], [0.9, () => point(card())]],
  use: [[0.1, () => point(card())], [0.4, token => click(card(), token)], [0.85, () => point(null)]],
  manage: [[0.1, showMenu], [0.39, showQR], [0.8, () => point(null)]],
  protect: [[0.03, openSettings], [0.18, openProtection], [0.34, fillDemoPassword], [0.49, enableProtection], [0.61, closeSettings], [0.7, token => click(nodes('header button[aria-label]')[0], token)], [0.85, async token => {
    await until(() => doc().querySelector('input[id^="unlock-"]'), token)
    input(doc().querySelector('input[id^="unlock-"]'), demoPassword)
    await delay(80)
    await click(doc().querySelector('form button[type=submit]'), token)
  }]],
  backup: [[0.02, exportSetup], [0.14, async token => { await openSettings(token); await click(findButton(copy().labels.export), token) }], [0.32, async token => {
    await click(findButton(copy().labels.export, doc().querySelector('[role=alertdialog]')), token)
    await until(() => state.lastBackup, token)
  }], [0.49, importSetup], [0.66, async token => {
    input(doc().querySelector('input[id^="import-"]'), demoPassword)
    await delay(80)
    await click(doc().querySelector('[role=dialog] form button[type=submit]'), token)
    await until(() => nodes('input[type=checkbox]').length, token)
  }], [0.8, () => point(nodes('input[type=checkbox]')[0])], [0.92, async token => {
    const button = nodes('button').find(button => button.textContent.trim().startsWith(copy().labels.import + ' ('))
    await click(button, token)
    await until(() => doc().querySelectorAll('.sortable-account').length === 3, token)
  }]],
  end: [[0.2, () => point(findButton(copy().labels.add))]],
}

function reportError(error) {
  if (!state.prepared) notifyHost('error')
  console.error('Walkthrough:', error)
  state.error = String(error)
  pause(true)
  $('#captions').textContent = copy().error
  announce(copy().error)
}

async function tick(now) {
  const delta = Math.min(200, now - (state.lastFrame ?? now)) / 1000
  state.lastFrame = now
  if (state.playing && !state.busy) {
    state.elapsed += delta * state.speed
    updateProgress()
    const actions = ACTIONS[chapter().id]
    const next = actions[state.action]
    if (next && state.elapsed >= next[0] * duration()) {
      state.busy = true
      const token = state.epoch
      try { await next[1](token); assert(token); state.action++ } catch (error) { if (error !== cancelled) reportError(error) }
      if (token === state.epoch) state.busy = false
      state.lastFrame = performance.now()
    }
    if (state.playing && !state.busy && state.elapsed >= duration() && state.action >= actions.length) {
      if (state.chapter < CHAPTERS.length - 1) await selectChapter(state.chapter + 1, true)
      else { pause(); state.finished = true; point(null); renderControls(); updateProgress(); announce(copy().playerDone) }
    }
  }
  requestAnimationFrame(tick)
}

async function manualAction(action) {
  pause(true)
  try { await action(state.epoch) } catch (error) { if (error !== cancelled) reportError(error) }
}

$('#play').addEventListener('click', play)
$('#explore').addEventListener('click', explore)
$('#sound').addEventListener('click', () => { state.sound = !state.sound; audio.muted = !state.sound; if (state.sound && state.playing && audio.paused && state.elapsed < narration[state.locale][chapter().id].duration) { audio.currentTime = state.elapsed; audio.play().catch(() => {}) } renderControls() })
$('#speed').addEventListener('change', event => { state.speed = Number(event.target.value); audio.playbackRate = state.speed })
$('#reset').addEventListener('click', () => selectChapter(state.chapter))
$('#previous').addEventListener('click', () => selectChapter(state.chapter - 1))
$('#next').addEventListener('click', () => selectChapter(state.chapter + 1))
$('#language').addEventListener('change', event => { pause(); state.locale = event.target.value; localStorage.setItem('mfa-guide-language', state.locale); translate(); selectChapter(state.chapter) })
$('#login-preview').addEventListener('submit', event => { event.preventDefault(); pause(true); const success = $('#demo-otp').value === state.lastCode && /^\d{6}$/.test(state.lastCode ?? ''); $('#login-help').textContent = success ? copy().verified : copy().invalidCode; announce($('#login-help').textContent) })
$('#download-backup').addEventListener('click', () => {
  if (!state.lastBackup) return
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([state.lastBackup], { type: 'application/json' }))
  link.download = 'mfa-demo-encrypted-backup.json'
  link.click()
  URL.revokeObjectURL(link.href)
})
for (const button of document.querySelectorAll('[data-open-video]')) button.addEventListener('click', () => { pause(); $('#video-dialog').showModal() })
for (const button of document.querySelectorAll('[data-open-transcript]')) button.addEventListener('click', () => { pause(); $('#transcript-dialog').showModal() })
$('#video-dialog').addEventListener('close', () => $('#original-video').pause())
for (const dialog of document.querySelectorAll('dialog')) {
  if (!('closedBy' in dialog)) dialog.addEventListener('click', event => { if (event.target !== dialog) return; const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close() })
}
document.addEventListener('visibilitychange', () => { if (document.hidden && state.playing) pause() })
window.mfaWalkthrough = { state, selectChapter, play, pause, demoPassword }
new ResizeObserver(resizeFrame).observe($('.extension-viewport'))
translate()
intro()
document.fonts.ready.then(updateMarker)
await selectChapter(0)
requestAnimationFrame(tick)
