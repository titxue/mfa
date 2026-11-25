import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, PlayCircle } from 'lucide-react'

const content = {
  'zh-CN': {
    label: '交互式使用指南',
    title: '先试一下，再开始使用。',
    description: '一键看完整流程，也可以随时接手。这里的账户和密钥均为公开演示样例，不关联真实账户。',
    open: '在新窗口完整体验',
    frame: 'MFA 交互式使用指南，仅使用示例账户',
  },
  'en-US': {
    label: 'INTERACTIVE GUIDE',
    title: 'Try it before you install.',
    description: 'Watch the full walkthrough, or take over anytime. All accounts and secrets are public demo samples, unrelated to real accounts.',
    open: 'Open the full experience',
    frame: 'Interactive MFA walkthrough using sample accounts only',
  },
}

export function InteractiveDemo({ locale }: { locale: keyof typeof content }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState<number>()
  const t = content[locale]
  const demoUrl = `/demo/?lang=${locale === 'zh-CN' ? 'zh' : 'en'}`

  useEffect(() => {
    const resize = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'mfa-guide:resize' && Number.isFinite(event.data.height)) {
        setHeight(Math.ceil(event.data.height))
      }
    }
    window.addEventListener('message', resize)
    return () => window.removeEventListener('message', resize)
  }, [])

  return (
    <section id="demo" className="interactive-demo bg-white py-16" aria-labelledby="demo-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-mint-ink">
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              {t.label}
            </p>
            <h2 id="demo-title" className="text-3xl font-bold leading-tight text-ink sm:text-4xl">{t.title}</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{t.description}</p>
          </div>
          <a className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-sm font-semibold text-mint-ink underline-offset-4 hover:underline" href={demoUrl} target="_blank" rel="noopener">
            {t.open}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-[#fafaf7]">
          <iframe
            ref={frame}
            key={locale}
            id="mfa-interactive-demo"
            className="interactive-demo-frame"
            src={`${demoUrl}&embed=1`}
            title={t.frame}
            loading="lazy"
            allow="clipboard-write"
            style={height ? { height } : undefined}
          />
        </div>
      </div>
    </section>
  )
}
