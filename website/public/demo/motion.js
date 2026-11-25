const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const easing = 'cubic-bezier(0.23, 1, 0.32, 1)'
const running = new WeakMap()

document.addEventListener('pointerdown', () => { document.documentElement.dataset.input = 'pointer' }, true)
document.addEventListener('keydown', () => { document.documentElement.dataset.input = 'keyboard' }, true)

function animate(element, frames, options = {}) {
  if (!element || reduced.matches || document.documentElement.dataset.input === 'keyboard') return
  running.get(element)?.cancel()
  const animation = element.animate(frames, { duration: 240, easing, ...options })
  running.set(element, animation)
  animation.finished.catch(() => {})
  return animation
}

export function intro() {
  const elements = document.querySelectorAll('.eyebrow,.headline-line>span,.hero-copy,.primary-actions,.play-options,.chapter-detail')
  elements.forEach((element, index) => animate(element, [
    { opacity: 0, transform: `translateY(${element.parentElement.classList.contains('headline-line') ? '105%' : '12px'})` },
    { opacity: 1, transform: 'translateY(0)' },
  ], { duration: 650, delay: index * 45 }))
}

export function chapterEnter() {
  const detail = document.querySelector('.chapter-detail')
  animate(detail, [{ opacity: 0, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }])
}

export function surfaceEnter(element) {
  animate(element, [{ opacity: 0, transform: 'translateY(8px) scale(.985)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }])
}

export function updateMarker() {
  const nav = document.querySelector('#chapter-nav')
  const active = nav.querySelector('[aria-current="step"]')
  let marker = nav.querySelector('.chapter-marker')
  if (!active) return
  if (!marker) {
    marker = document.createElement('span')
    marker.className = 'chapter-marker'
    marker.setAttribute('aria-hidden', 'true')
    nav.prepend(marker)
  }
  const area = nav.getBoundingClientRect()
  const rect = active.getBoundingClientRect()
  marker.style.width = rect.width + 'px'
  marker.style.height = rect.height + 'px'
  marker.style.transform = `translate(${rect.x - area.x - nav.clientLeft}px,${rect.y - area.y - nav.clientTop}px)`
}

export function codeTransfer(code) {
  const panel = document.querySelector('#login-preview')
  panel.dataset.filled = 'true'
  const input = document.querySelector('#demo-otp')
  const frame = document.querySelector('#extension')
  const card = frame.contentDocument.querySelector('.sortable-account[aria-label="GitHub"] .font-mono')
  if (!card || reduced.matches || !matchMedia('(min-width: 900px) and (pointer: fine)').matches) return
  const from = card.getBoundingClientRect()
  const frameRect = frame.getBoundingClientRect()
  const to = input.getBoundingClientRect()
  if (to.bottom > innerHeight || to.top < 0) return
  const scale = frameRect.width / 380
  const x = frameRect.x + from.x * scale
  const y = frameRect.y + from.y * scale
  const flying = document.createElement('span')
  flying.className = 'code-transfer'
  flying.setAttribute('aria-hidden', 'true')
  flying.textContent = code.slice(0, 3) + ' ' + code.slice(3)
  flying.style.left = x + 'px'
  flying.style.top = y + 'px'
  document.body.append(flying)
  const animation = animate(flying, [
    { opacity: 0, transform: 'translate(0,0) scale(.92)' },
    { opacity: 1, offset: 0.15 },
    { opacity: 0, transform: `translate(${to.x - x + 16}px,${to.y - y + 5}px) scale(1)` },
  ], { duration: 520 })
  if (animation) animation.finished.catch(() => {}).finally(() => flying.remove())
  else flying.remove()
}

new ResizeObserver(updateMarker).observe(document.querySelector('#chapter-nav'))
reduced.addEventListener('change', () => {
  if (reduced.matches) {
    for (const element of document.querySelectorAll('.eyebrow,.headline-line>span,.hero-copy,.primary-actions,.play-options,.chapter-detail,.code-transfer')) {
      running.get(element)?.cancel()
    }
  }
})
