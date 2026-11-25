(() => {
  if (new URLSearchParams(location.search).get('embed') !== '1') return
  document.documentElement.classList.add('is-embedded')

  document.addEventListener('DOMContentLoaded', () => {
    let previousHeight = 0
    const resize = () => {
      const height = Math.ceil(document.body.getBoundingClientRect().height)
      if (height === previousHeight || parent === window) return
      previousHeight = height
      parent.postMessage({ type: 'mfa-guide:resize', height }, location.origin)
    }
    new ResizeObserver(resize).observe(document.body)
    document.fonts.ready.then(resize)
    window.addEventListener('load', resize)
  })
})()
