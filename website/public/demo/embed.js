(() => {
  if (new URLSearchParams(location.search).get('embed') !== '1') return
  document.documentElement.classList.add('is-embedded')
  const host = document.referrer && new URL(document.referrer).origin === location.origin ? parent : window
  const narrow = host.matchMedia('(max-width: 1023px)')
  const layout = () => document.documentElement.classList.toggle('is-stacked', narrow.matches)
  layout()
  narrow.addEventListener('change', layout)

  document.addEventListener('DOMContentLoaded', () => {
    let previousHeight = 0
    const resize = () => {
      const height = Math.ceil(Math.max(document.body.getBoundingClientRect().height, document.body.scrollHeight))
      if (height === previousHeight || parent === window) return
      previousHeight = height
      parent.postMessage({ type: 'mfa-guide:resize', height: height + 1 }, location.origin)
    }
    new ResizeObserver(resize).observe(document.body)
    document.fonts.ready.then(resize)
    window.addEventListener('load', resize)
  })
})()
