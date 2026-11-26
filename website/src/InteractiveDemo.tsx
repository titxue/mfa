import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Chrome, Play, SquarePlay } from 'lucide-react'
import { SecurityPrint } from './SecurityPrint'

const labels = {
  'zh-CN': {
    try: '先试用一下', title: '交互演示', open: '打开独立演示',
    frame: '交互演示，仅使用公开示例账户', loading: '正在加载演示…',
    unavailable: '演示暂未就绪。', retry: '重试',
  },
  'en-US': {
    try: 'Try the demo', title: 'Interactive demo', open: 'Open full demo',
    frame: 'Interactive demo using public sample accounts', loading: 'Loading demo…',
    unavailable: 'The demo hasn’t loaded yet.', retry: 'Retry',
  },
}

type Props = {
  locale: keyof typeof labels
  hero: { title: string; lead: string; install: string }
  productStats: { label: string; value: string; title?: string }[]
  installUrl: string
}

export function InteractiveDemo({ locale, hero, productStats, installUrl }: Props) {
  const text = labels[locale]
  const demoUrl = `/demo/?lang=${locale === 'zh-CN' ? 'zh' : 'en'}`
  const frame = useRef<HTMLIFrameElement>(null)
  const pendingExplore = useRef(false)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const iframe = frame.current!
    const timeout = window.setTimeout(() => setStatus('error'), 5000)
    function receive(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== iframe.contentWindow || !event.data) return
      const { type, height, offset } = event.data
      switch (type) {
        case 'mfa-guide:resize':
          if (Number.isFinite(height) && height > 0) iframe.style.height = `${height}px`
          break
        case 'mfa-guide:ready':
          window.clearTimeout(timeout)
          setStatus('ready')
          break
        case 'mfa-guide:error':
          window.clearTimeout(timeout)
          setStatus('error')
          break
        case 'mfa-guide:panel':
          if (Number.isFinite(offset)) {
            const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 0
            window.scrollTo({
              top: window.scrollY + iframe.getBoundingClientRect().top + offset - headerHeight - 12,
              behavior: 'instant',
            })
          }
          break
      }
    }
    window.addEventListener('message', receive)
    iframe.contentWindow?.postMessage({ type: 'mfa-guide:status' }, location.origin)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('message', receive)
    }
  }, [attempt])

  useEffect(() => {
    if (status === 'ready' && pendingExplore.current) {
      pendingExplore.current = false
      frame.current?.contentWindow?.postMessage({ type: 'mfa-guide:explore' }, location.origin)
    }
  }, [status])

  function explore() {
    if (status === 'ready') {
      frame.current?.contentWindow?.postMessage({ type: 'mfa-guide:explore' }, location.origin)
    } else {
      pendingExplore.current = true
      document.getElementById('demo')?.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
  }

  function retry() {
    pendingExplore.current = true
    setStatus('loading')
    setAttempt(current => current + 1)
  }

  return (
    <div className="product-intro">
      <section aria-labelledby="product-title" className="product-hero site-width">
        <div className="hero-copy">
          <h1 id="product-title">{hero.title}</h1>
          <p className="hero-description">{hero.lead}</p>
          <dl className="product-metrics">
            {productStats.map(({ label, value, title }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd title={title}>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="hero-actions">
            <a className="site-action site-action-primary" href={installUrl}><Chrome aria-hidden="true" />{hero.install}</a>
            <button type="button" className="site-action site-action-secondary" onClick={explore}>
              <Play aria-hidden="true" />{text.try}
            </button>
          </div>
        </div>
        <SecurityPrint />
      </section>
      <section id="demo" aria-labelledby="demo-heading" className="demo-section site-width">
        <div className="demo-heading">
          <h2 id="demo-heading"><SquarePlay aria-hidden="true" />{text.title}</h2>
          <a className="text-link" href={demoUrl} target="_blank" rel="noopener" onClick={() => { pendingExplore.current = false }}>
            {text.open}<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
        {status !== 'ready' && (
          <div role="status" className="mb-3 flex flex-wrap items-center gap-3 rounded-md bg-cloud px-4 py-2 text-sm text-slate-700">
            {status === 'error' ? <>{text.unavailable}<button className="font-semibold text-teal-700 underline" type="button" onClick={retry}>{text.retry}</button></> : text.loading}
          </div>
        )}
        <div className={status === 'error' ? 'h-0 overflow-hidden' : undefined} inert={status === 'error'}>
          <iframe
            key={attempt}
            ref={frame}
            className="demo-embed"
            title={text.frame}
            src={`${demoUrl}&embed=1`}
            onError={() => setStatus('error')}
            onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'mfa-guide:status' }, location.origin)}
          />
        </div>
      </section>
    </div>
  )
}
