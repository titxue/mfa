import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  ArrowRight,
  CheckCircle2,
  Chrome,
  Clock3,
  CloudOff,
  Download,
  Github,
  Globe2,
  KeyRound,
  Languages,
  LockKeyhole,
  Copy,
  QrCode,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { extensionMetadata } from './generated/extensionMetadata'
import './styles.css'

type Locale = 'zh-CN' | 'en-US'

type Feature = {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}

type Faq = {
  question: string
  answer: string
}

type Step = {
  title: string
  body: string
}

type TrustSignal = {
  label: string
  value: string
  dynamic?: 'users' | 'rating' | 'version'
}

type Copy = {
  nav: {
    features: string
    guide: string
    privacy: string
    faq: string
  }
  hero: {
    badge: string
    title: string
    lead: string
    install: string
    github: string
    proof: string[]
    trustSignals: TrustSignal[]
    usersSuffix: string
    ratingSuffix: string
  }
  mockup: {
    title: string
    add: string
    accounts: Array<{ name: string; code: string; time: string }>
    hint: string
  }
  sections: {
    features: string
    featuresLead: string
    guide: string
    guideLead: string
    privacy: string
    privacyLead: string
    faq: string
    faqLead: string
  }
  features: Feature[]
  steps: Step[]
  privacy: Feature[]
  faqs: Faq[]
  footer: {
    summary: string
    install: string
    source: string
    guide: string
  }
}

const chromeStoreUrl =
  'https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf?utm_source=official_site&utm_medium=website&utm_campaign=install_cta'
const githubUrl = 'https://github.com/titxue/mfa'
const chromeStoreUsersUrl =
  'https://img.shields.io/chrome-web-store/users/dhipejmoajhjflafhbibojfoeogbmjgf.json'
const chromeStoreRatingUrl =
  'https://img.shields.io/chrome-web-store/rating/dhipejmoajhjflafhbibojfoeogbmjgf.json'

const copy: Record<Locale, Copy> = {
  'zh-CN': {
    nav: {
      features: '功能',
      guide: '使用指南',
      privacy: '隐私安全',
      faq: '常见问题',
    },
    hero: {
      badge: 'Chrome 扩展 · 完全离线 · Manifest V3',
      title: 'TOTP Authenticator',
      lead:
        '安全快速的双因素认证码生成器。离线生成 2FA 验证码，支持二维码导入、验证码复制、账户导入导出和 12 种语言。',
      install: '安装扩展',
      github: '查看源码',
      proof: ['本地生成验证码', '无第三方网络请求', '支持 Chrome 同步存储'],
      trustSignals: [
        { label: '用户数量', value: 'Chrome Web Store', dynamic: 'users' },
        { label: '评分', value: 'Chrome Web Store', dynamic: 'rating' },
        { label: '版本', value: '自动同步', dynamic: 'version' },
        { label: '源代码', value: 'GitHub 开源' },
        { label: '许可证', value: 'MIT License' },
      ],
      usersSuffix: '用户',
      ratingSuffix: '评分',
    },
    mockup: {
      title: 'TOTP 生成器',
      add: '添加账户',
      accounts: [
        { name: 'GitHub', code: '482 917', time: '18s' },
        { name: 'Cloudflare', code: '036 884', time: '24s' },
        { name: 'Google', code: '719 430', time: '09s' },
      ],
      hint: '点击账户即可复制验证码，适合快速粘贴到登录页面。',
    },
    sections: {
      features: '为日常登录做得足够顺手',
      featuresLead:
        '从添加账号到使用验证码，核心流程都围绕少点击、少等待和本地安全设计。',
      guide: '三分钟开始使用',
      guideLead:
        '安装扩展后，可以从服务商提供的二维码图片、剪贴板图片或 otpauth:// URI 快速导入账户。',
      privacy: '隐私优先的认证码工具',
      privacyLead:
        '验证码在浏览器本地按 RFC 6238 标准计算，官网只负责说明和引导，不接收账户密钥。',
      faq: '常见问题',
      faqLead: '遇到时间、复制、同步或备份问题时，可以先从这里排查。',
    },
    features: [
      {
        icon: Clock3,
        title: '实时 TOTP 验证码',
        body: '30 秒周期刷新，显示倒计时进度，便于在验证码过期前完成登录。',
      },
      {
        icon: QrCode,
        title: '多方式导入二维码',
        body: '支持上传图片、粘贴图片、拖拽图片文件，也支持粘贴 otpauth:// URI。',
      },
      {
        icon: Copy,
        title: '一键复制验证码',
        body: '点击账户即可复制当前验证码，再粘贴到需要 2FA 的登录页面。',
      },
      {
        icon: Download,
        title: '导入导出账户',
        body: '使用 JSON 文件备份和迁移账户，导入时自动跳过重复项。',
      },
      {
        icon: CloudOff,
        title: '离线处理',
        body: '二维码解析和验证码生成都在本地完成，不依赖第三方服务。',
      },
      {
        icon: Languages,
        title: '12 种语言',
        body: '覆盖中文、英文、西班牙语、法语、德语、日语、韩语等常用语言。',
      },
    ],
    steps: [
      {
        title: '安装 Chrome 扩展',
        body: '从 Chrome Web Store 安装，或在开发者模式下加载项目构建生成的 dist 目录。',
      },
      {
        title: '添加第一个账户',
        body: '点击添加按钮，上传服务商提供的 TOTP 二维码，或手动输入账户名和 Base32 密钥。',
      },
      {
        title: '使用验证码登录',
        body: '打开需要 2FA 的网页，点击账户卡片复制验证码，再粘贴到登录页面。',
      },
      {
        title: '备份和迁移',
        body: '在设置中导出 JSON 文件，换设备后再导入。导出文件包含密钥，请妥善保存。',
      },
    ],
    privacy: [
      {
        icon: LockKeyhole,
        title: '密钥留在浏览器中',
        body: '账户信息通过 Chrome Storage API 保存，非扩展环境才回退到 localStorage。',
      },
      {
        icon: ShieldCheck,
        title: '无数据收集',
        body: '扩展不需要账号系统，不向第三方服务器上传验证码、密钥或账户列表。',
      },
      {
        icon: KeyRound,
        title: '备份文件需保护',
        body: '导出的 JSON 用于迁移账户，里面包含未加密密钥，建议只存放在可信位置。',
      },
    ],
    faqs: [
      {
        question: '验证码总是不正确怎么办？',
        answer: 'TOTP 基于时间计算，请先确认电脑系统时间和时区准确，并开启自动校时。',
      },
      {
        question: '复制验证码后无法登录怎么办？',
        answer:
          '请先确认验证码没有过期，再检查系统时间和服务商账户是否匹配。',
      },
      {
        question: '数据会跟随 Google 账号同步吗？',
        answer:
          '扩展优先使用 Chrome Storage，同一 Google 账号且开启同步时可跨设备同步；未登录或不可用时回退本地存储。',
      },
      {
        question: '可以通过开发者模式安装吗？',
        answer:
          '可以。运行项目构建命令生成 dist 目录后，在 chrome://extensions/ 中开启开发者模式并加载已解压扩展。',
      },
    ],
    footer: {
      summary: '一个专注、离线、开源的 2FA 验证码工具。',
      install: '前往 Chrome Web Store',
      source: 'GitHub 项目',
      guide: '完整使用指南',
    },
  },
  'en-US': {
    nav: {
      features: 'Features',
      guide: 'Guide',
      privacy: 'Privacy',
      faq: 'FAQ',
    },
    hero: {
      badge: 'Chrome extension · Fully offline · Manifest V3',
      title: 'TOTP Authenticator',
      lead:
        'A secure and fast two-factor code generator for Chrome. Generate 2FA codes offline, import QR codes, copy codes quickly, back up accounts, and use it in 12 languages.',
      install: 'Install extension',
      github: 'View source',
      proof: ['Codes generated locally', 'No third-party network requests', 'Chrome sync storage support'],
      trustSignals: [
        { label: 'Users', value: 'Chrome Web Store', dynamic: 'users' },
        { label: 'Rating', value: 'Chrome Web Store', dynamic: 'rating' },
        { label: 'Version', value: 'Synced from package.json', dynamic: 'version' },
        { label: 'Source code', value: 'Open source on GitHub' },
        { label: 'License', value: 'MIT License' },
      ],
      usersSuffix: 'users',
      ratingSuffix: 'rating',
    },
    mockup: {
      title: 'TOTP Generator',
      add: 'Add account',
      accounts: [
        { name: 'GitHub', code: '482 917', time: '18s' },
        { name: 'Cloudflare', code: '036 884', time: '24s' },
        { name: 'Google', code: '719 430', time: '09s' },
      ],
      hint: 'Click an account to copy the code, then paste it into the sign-in page.',
    },
    sections: {
      features: 'Made for everyday sign-ins',
      featuresLead:
        'The main flows are built around fewer clicks, fast feedback, and local-first security.',
      guide: 'Start in three minutes',
      guideLead:
        'After installing the extension, import accounts from QR images, pasted images, or otpauth:// URIs.',
      privacy: 'A privacy-first authenticator',
      privacyLead:
        'Codes are calculated locally in the browser using RFC 6238. This website only explains the product and never receives secrets.',
      faq: 'Frequently asked questions',
      faqLead: 'Time, copying, sync, and backup issues usually start here.',
    },
    features: [
      {
        icon: Clock3,
        title: 'Real-time TOTP codes',
        body: 'Refreshes on a 30-second interval with a countdown ring so you know when to use the code.',
      },
      {
        icon: QrCode,
        title: 'Flexible QR import',
        body: 'Upload, paste, or drag QR images, and paste otpauth:// URI text directly.',
      },
      {
        icon: Copy,
        title: 'One-click code copy',
        body: 'Click an account to copy the current code, then paste it into the 2FA sign-in page.',
      },
      {
        icon: Download,
        title: 'Import and export',
        body: 'Back up and move accounts with JSON files, with duplicate accounts skipped on import.',
      },
      {
        icon: CloudOff,
        title: 'Offline by design',
        body: 'QR parsing and code generation happen locally without third-party services.',
      },
      {
        icon: Languages,
        title: '12 languages',
        body: 'Includes Chinese, English, Spanish, French, German, Japanese, Korean, and more.',
      },
    ],
    steps: [
      {
        title: 'Install the Chrome extension',
        body: 'Install from the Chrome Web Store, or load the built dist directory in Chrome developer mode.',
      },
      {
        title: 'Add your first account',
        body: 'Use a service-provided TOTP QR code, or enter the account name and Base32 secret manually.',
      },
      {
        title: 'Sign in with a code',
        body: 'Open the site that needs 2FA, click an account card to copy the code, then paste it.',
      },
      {
        title: 'Back up and migrate',
        body: 'Export a JSON backup from settings and import it on another device. Keep exported secrets safe.',
      },
    ],
    privacy: [
      {
        icon: LockKeyhole,
        title: 'Secrets stay in the browser',
        body: 'Accounts are stored with the Chrome Storage API, with localStorage fallback outside extension contexts.',
      },
      {
        icon: ShieldCheck,
        title: 'No data collection',
        body: 'No product account is required, and codes, secrets, and account lists are not uploaded.',
      },
      {
        icon: KeyRound,
        title: 'Protect backup files',
        body: 'Exported JSON files contain unencrypted secrets for migration, so keep them in trusted storage.',
      },
    ],
    faqs: [
      {
        question: 'Why are my codes incorrect?',
        answer: 'TOTP is time-based. Check that your system time and timezone are accurate and synced automatically.',
      },
      {
        question: 'What if a copied code does not work?',
        answer: 'Check that the code has not expired, then confirm your system time and selected account are correct.',
      },
      {
        question: 'Does data sync with my Google account?',
        answer:
          'The extension uses Chrome Storage first. It can sync across devices when the same Google account has Chrome sync enabled.',
      },
      {
        question: 'Can I install it in developer mode?',
        answer:
          'Yes. Build the project, then open chrome://extensions/, enable developer mode, and load the unpacked dist directory.',
      },
    ],
    footer: {
      summary: 'A focused, offline, open-source 2FA code tool.',
      install: 'Open Chrome Web Store',
      source: 'GitHub project',
      guide: 'Full setup guide',
    },
  },
}

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'en-US'
  }

  if (window.location.pathname.startsWith('/zh')) {
    return 'zh-CN'
  }

  const saved = window.localStorage.getItem('mfa-site-locale')
  if (saved === 'zh-CN' || saved === 'en-US') {
    return saved
  }

  const browserLanguages = [window.navigator.language, ...window.navigator.languages]
    .filter(Boolean)
    .map((language) => language.toLowerCase())

  return browserLanguages.some((language) => language.startsWith('zh')) ? 'zh-CN' : 'en-US'
}

function useChromeWebStoreStats() {
  const [stats, setStats] = React.useState<{ users?: string; rating?: string }>({})

  React.useEffect(() => {
    let ignore = false

    async function loadStats() {
      try {
        const [usersResponse, ratingResponse] = await Promise.all([
          fetch(chromeStoreUsersUrl),
          fetch(chromeStoreRatingUrl),
        ])

        if (!usersResponse.ok || !ratingResponse.ok) {
          return
        }

        const users = (await usersResponse.json()) as { value?: string; message?: string }
        const rating = (await ratingResponse.json()) as { value?: string; message?: string }

        if (!ignore) {
          setStats({
            users: users.value ?? users.message,
            rating: rating.value ?? rating.message,
          })
        }
      } catch {
        if (!ignore) {
          setStats({})
        }
      }
    }

    void loadStats()

    return () => {
      ignore = true
    }
  }, [])

  return stats
}

function useExtensionMetadata() {
  const [metadata, setMetadata] = React.useState(extensionMetadata)

  React.useEffect(() => {
    let ignore = false

    async function loadMetadata() {
      try {
        const response = await fetch('/version.json')

        if (!response.ok) {
          return
        }

        const nextMetadata = (await response.json()) as typeof extensionMetadata

        if (!ignore) {
          setMetadata(nextMetadata)
        }
      } catch {
        if (!ignore) {
          setMetadata(extensionMetadata)
        }
      }
    }

    void loadMetadata()

    return () => {
      ignore = true
    }
  }, [])

  return metadata
}

function App() {
  const [locale, setLocale] = React.useState<Locale>(getInitialLocale)
  const storeStats = useChromeWebStoreStats()
  const siteMetadata = useExtensionMetadata()
  const t = copy[locale]

  React.useEffect(() => {
    document.documentElement.lang = locale
    window.localStorage.setItem('mfa-site-locale', locale)
  }, [locale])

  const alternateLocale = locale === 'zh-CN' ? 'en-US' : 'zh-CN'
  const guideUrl = locale === 'zh-CN' ? '/zh/guide/how-to-use-totp-authenticator/' : '/guide/how-to-use-totp-authenticator/'
  const switchLocale = () => {
    const nextPath = alternateLocale === 'zh-CN' ? '/zh/' : '/'

    setLocale(alternateLocale)
    window.history.pushState(null, '', nextPath)
  }

  return (
    <div className="min-h-screen bg-cloud text-ink">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a className="flex min-w-0 items-center gap-3" href="#top" aria-label="TOTP Authenticator">
            <img className="h-9 w-9 shrink-0" src="/icon128.png" alt="" />
            <span className="truncate text-base font-semibold sm:text-lg">TOTP Authenticator</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a className="hover:text-ink" href="#features">
              {t.nav.features}
            </a>
            <a className="hover:text-ink" href="#guide">
              {t.nav.guide}
            </a>
            <a className="hover:text-ink" href="#privacy">
              {t.nav.privacy}
            </a>
            <a className="hover:text-ink" href="#faq">
              {t.nav.faq}
            </a>
          </nav>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-ink shadow-sm transition hover:border-mint hover:text-mint"
            type="button"
            onClick={switchLocale}
          >
            <Globe2 className="h-4 w-4" />
            {alternateLocale}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden bg-white">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_460px] lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-mint/20 bg-mint/10 px-4 py-2 text-sm font-semibold text-mint">
                <ShieldCheck className="h-4 w-4" />
                {t.hero.badge}
              </div>
              <h1 className="mt-7 max-w-3xl text-4xl font-bold leading-tight text-ink sm:text-5xl lg:text-6xl">
                {t.hero.title}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">{t.hero.lead}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-5 text-base font-semibold text-white shadow-panel transition hover:bg-slate-800" href={chromeStoreUrl}>
                  <Chrome className="h-5 w-5" />
                  {t.hero.install}
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-base font-semibold text-ink transition hover:border-saffron hover:text-saffron" href={githubUrl}>
                  <Github className="h-5 w-5" />
                  {t.hero.github}
                </a>
              </div>
              <div className="mt-8 grid gap-3 text-sm font-medium text-slate-700 sm:grid-cols-3">
                {t.hero.proof.map((item) => (
                  <div className="flex items-start gap-2" key={item}>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {t.hero.trustSignals.map((item) => (
                  <div className="rounded-lg border border-slate-200 bg-cloud px-4 py-3" key={item.label}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="mt-1 text-sm font-bold text-ink">
                      {formatTrustSignal(item, storeStats, siteMetadata, t)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <ExtensionMockup copy={t.mockup} />
          </div>
        </section>

        <SectionHeader id="features" title={t.sections.features} lead={t.sections.featuresLead} />
        <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
          {t.features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </section>

        <section id="guide" className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold leading-tight text-ink sm:text-4xl">{t.sections.guide}</h2>
              <p className="mt-4 text-lg leading-8 text-slate-700">{t.sections.guideLead}</p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {t.steps.map((step, index) => (
                <article className="rounded-lg border border-slate-200 bg-cloud p-5" key={step.title}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron text-sm font-bold text-ink">
                    {index + 1}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <SectionHeader id="privacy" title={t.sections.privacy} lead={t.sections.privacyLead} />
        <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-16 sm:px-6 lg:grid-cols-3 lg:px-8">
          {t.privacy.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} tone="privacy" />
          ))}
        </section>

        <section id="faq" className="bg-white py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-ink sm:text-4xl">{t.sections.faq}</h2>
              <p className="mt-4 text-lg leading-8 text-slate-700">{t.sections.faqLead}</p>
            </div>
            <div className="mt-10 space-y-3">
              {t.faqs.map((item) => (
                <details className="group rounded-lg border border-slate-200 bg-cloud p-5" key={item.question}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink">
                    {item.question}
                    <ArrowRight className="h-4 w-4 shrink-0 transition group-open:rotate-90" />
                  </summary>
                  <p className="mt-4 text-sm leading-6 text-slate-700">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-ink text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <img className="h-10 w-10" src="/icon128.png" alt="" />
            <div>
              <p className="font-semibold">TOTP Authenticator</p>
              <p className="text-sm text-slate-300">{t.footer.summary}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/25 px-4 text-sm font-semibold text-white" href={guideUrl}>
              <ArrowRight className="h-4 w-4" />
              {t.footer.guide}
            </a>
            <a className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-ink" href={chromeStoreUrl}>
              <Chrome className="h-4 w-4" />
              {t.footer.install}
            </a>
            <a className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/25 px-4 text-sm font-semibold text-white" href={githubUrl}>
              <Github className="h-4 w-4" />
              {t.footer.source}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function formatTrustSignal(
  signal: TrustSignal,
  stats: { users?: string; rating?: string },
  metadata: typeof extensionMetadata,
  t: Copy,
) {
  if (signal.dynamic === 'users' && stats.users) {
    return `${stats.users} ${t.hero.usersSuffix}`
  }

  if (signal.dynamic === 'rating' && stats.rating) {
    return `${stats.rating} ${t.hero.ratingSuffix}`
  }

  if (signal.dynamic === 'version') {
    return `v${metadata.version}`
  }

  return signal.value
}

function SectionHeader({ id, title, lead }: { id: string; title: string; lead: string }) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold leading-tight text-ink sm:text-4xl">{title}</h2>
        <p className="mt-4 text-lg leading-8 text-slate-700">{lead}</p>
      </div>
    </section>
  )
}

function FeatureCard({ feature, tone = 'feature' }: { feature: Feature; tone?: 'feature' | 'privacy' }) {
  const Icon = feature.icon
  const iconClass = tone === 'privacy' ? 'bg-ink text-white' : 'bg-mint/10 text-mint'

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-md ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-ink">{feature.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-700">{feature.body}</p>
    </article>
  )
}

function ExtensionMockup({ copy: mockup }: { copy: Copy['mockup'] }) {
  return (
    <div className="mx-auto w-full max-w-[460px] rounded-[28px] border border-slate-200 bg-slate-950 p-3 shadow-panel">
      <div className="rounded-[20px] bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <img className="h-10 w-10 shrink-0" src="/icon128.png" alt="" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{mockup.title}</p>
              <p className="text-xs text-slate-500">2FA OTP Code Generator</p>
            </div>
          </div>
          <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink text-white" type="button" aria-label={mockup.add}>
            <Upload className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {mockup.accounts.map((account, index) => (
            <div className="rounded-lg border border-slate-200 bg-cloud p-4" key={account.name}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{account.name}</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-ink">{account.code}</p>
                </div>
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[5px] border-slate-200">
                  <div
                    className={`absolute inset-[-5px] rounded-full border-[5px] ${
                      index === 2 ? 'border-saffron' : 'border-mint'
                    } border-l-transparent border-b-transparent`}
                  />
                  <span className="text-xs font-bold text-slate-700">{account.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-lg bg-mint/10 p-4 text-sm leading-6 text-slate-700">
          <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
          <p>{mockup.hint}</p>
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
