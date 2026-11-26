import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  ArrowRight,
  ChevronDown,
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
} from 'lucide-react'
import { extensionMetadata } from './generated/extensionMetadata'
import { InteractiveDemo } from './InteractiveDemo'
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

type Copy = {
  nav: {
    demo: string
    features: string
    guide: string
    privacy: string
    faq: string
  }
  hero: {
    title: string
    lead: string
    install: string
    stats: { users: string; rating: string; version: string; verifiedOn: string }
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
const verifiedStoreStats = { users: '2k', rating: '5/5', date: '2026-11-23' }
const storeStatFormats = {
  users: /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?[kmb]?\+?$/i,
  rating: /^(?:[0-4](?:\.\d+)?|5(?:\.0+)?)\s*\/\s*5$/,
}

const copy: Record<Locale, Copy> = {
  'zh-CN': {
    nav: {
      demo: '交互演示',
      features: '功能',
      guide: '使用指南',
      privacy: '隐私安全',
      faq: '常见问题',
    },
    hero: {
      title: 'TOTP Authenticator',
      lead: '在 Chrome 中离线生成 2FA 验证码，支持主密码保护。',
      install: '安装扩展',
      stats: { users: '用户数', rating: '评分', version: '版本', verifiedOn: 'Chrome 应用商店核对日期' },
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
        title: '验证码填充与复制',
        body: '点击账户尝试填充当前网页，未能填充时可按设置回退复制。授权网站后，可在验证码输入框旁选择账户。',
      },
      {
        icon: Download,
        title: '导入导出账户',
        body: '支持普通与加密 JSON 备份。普通备份直接预览数量，加密备份先解密再确认，导入时跳过重复账户。',
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
        body: '打开需要 2FA 的网页，点击账户卡片尝试填充验证码，或复制后粘贴。',
      },
      {
        title: '备份和迁移',
        body: '开启密码保护后默认导出加密备份。导入时先查看账户数量，再确认添加；请保管好备份密码。',
      },
    ],
    privacy: [
      {
        icon: LockKeyhole,
        title: '主密码保护',
        body: '开启密码保护后，账户名称、密钥和网站信息一起加密。可手动锁定，浏览器重启后需要重新解锁。',
      },
      {
        icon: ShieldCheck,
        title: 'Chrome 账户同步',
        body: '扩展账户通过 Chrome 同步，无需注册额外账号。未开启密码保护时同步的是明文账户；本官网不接收账户密钥。',
      },
      {
        icon: KeyRound,
        title: '备份文件需保护',
        body: '加密备份需要导出时的密码才能恢复。明文备份包含账户密钥；忘记密码无法恢复加密数据。',
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
          '两台设备需使用同一扩展、同一 Chrome 账号并开启扩展数据同步。另一台收到加密记录后需要输入同一密码；离线或尚未同步的旧副本不会立即锁定，请避免多设备同时编辑。',
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
      demo: 'Demo',
      features: 'Features',
      guide: 'Guide',
      privacy: 'Privacy',
      faq: 'FAQ',
    },
    hero: {
      title: 'TOTP Authenticator',
      lead: 'Generate 2FA codes offline in Chrome and protect your accounts with a password.',
      install: 'Install extension',
      stats: { users: 'Users', rating: 'Rating', version: 'Version', verifiedOn: 'Chrome Web Store · verified on' },
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
        title: 'Fill or copy a code',
        body: 'Click an account to fill the current page, with optional copy fallback. Grant site access to choose accounts beside verification fields.',
      },
      {
        icon: Download,
        title: 'Import and export',
        body: 'Import plain or encrypted JSON backups. Preview the account count, decrypt encrypted files first, then confirm. Duplicate accounts are skipped.',
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
        body: 'Open the site that needs 2FA, then click an account card to fill the code or copy and paste it.',
      },
      {
        title: 'Back up and migrate',
        body: 'With password protection enabled, exports are encrypted by default. Preview the account count before importing and keep the backup password safe.',
      },
    ],
    privacy: [
      {
        icon: LockKeyhole,
        title: 'Master password protection',
        body: 'Password protection encrypts account names, secrets, and websites. Lock manually or unlock again after restarting the browser.',
      },
      {
        icon: ShieldCheck,
        title: 'Chrome account sync',
        body: 'Accounts sync through Chrome without a separate product account. Without password protection, account records are not encrypted by the extension. This website does not receive account secrets.',
      },
      {
        icon: KeyRound,
        title: 'Protect backup files',
        body: 'Encrypted backups require the password used when exported. Plain backups expose account secrets. Encrypted data cannot be recovered if you forget its password.',
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
          'Use the same extension and Chrome account with extension data sync enabled. Another device needs the same password after receiving encrypted records. Offline or unsynced copies do not lock immediately; avoid editing on multiple devices at once.',
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

    async function loadStat(key: keyof typeof stats, url: string) {
      try {
        const response = await fetch(url)
        if (!response.ok) return
        const data = await response.json() as { value?: unknown; message?: unknown; isError?: boolean }
        const rawValue = data.value ?? data.message
        if (data.isError || typeof rawValue !== 'string') return
        const value = rawValue.trim()
        if (!ignore && storeStatFormats[key].test(value)) setStats(current => ({ ...current, [key]: value }))
      } catch {
        return
      }
    }

    void loadStat('users', chromeStoreUsersUrl)
    void loadStat('rating', chromeStoreRatingUrl)

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
    <div className="homepage">
      <header className="masthead">
        <div className="site-width masthead-inner">
          <a className="brand-link" href="#top" aria-label="TOTP Authenticator">
            <img width="36" height="36" src="/icon128.png" alt="" />
            <span>TOTP Authenticator</span>
          </a>
          <nav className="masthead-nav">
            <a href="#demo">{t.nav.demo}</a>
            <a href="#features">{t.nav.features}</a>
            <a href="#guide">{t.nav.guide}</a>
            <a href="#privacy">{t.nav.privacy}</a>
            <a href="#faq">{t.nav.faq}</a>
          </nav>
          <button
            className="language-button"
            type="button"
            onClick={switchLocale}
          >
            <Globe2 className="h-4 w-4" />
            {alternateLocale}
          </button>
        </div>
      </header>

      <main id="top">
        <InteractiveDemo
          key={locale}
          locale={locale}
          hero={t.hero}
          productStats={[
            ...(['users', 'rating'] as const).map(key => ({
              label: t.hero.stats[key],
              value: storeStats[key] ?? verifiedStoreStats[key],
              title: storeStats[key] === undefined ? `${t.hero.stats.verifiedOn} ${verifiedStoreStats.date}` : undefined,
            })),
            { label: t.hero.stats.version, value: `v${siteMetadata.version}` },
          ]}
          installUrl={chromeStoreUrl}
        />

        <section id="features" className="site-width info-section" aria-labelledby="features-heading">
          <SectionHeader id="features-heading" title={t.sections.features} lead={t.sections.featuresLead} />
          <div className="feature-grid">
            {t.features.map(feature => <FeatureCard key={feature.title} feature={feature} />)}
          </div>
        </section>

        <section id="guide" className="guide-band" aria-labelledby="guide-heading">
          <div className="site-width info-section">
            <SectionHeader id="guide-heading" title={t.sections.guide} lead={t.sections.guideLead} />
            <ol className="guide-steps">
              {t.steps.map((step, index) => (
                <li key={step.title}>
                  <span className="step-number" aria-hidden="true">{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
            <a className="text-link guide-link" href={guideUrl}>{t.footer.guide}<ArrowRight aria-hidden="true" /></a>
          </div>
        </section>

        <section id="privacy" className="site-width info-section" aria-labelledby="privacy-heading">
          <div className="privacy-panel">
            <SectionHeader id="privacy-heading" title={t.sections.privacy} lead={t.sections.privacyLead} />
            <div className="privacy-grid">
              {t.privacy.map(feature => <FeatureCard key={feature.title} feature={feature} />)}
            </div>
          </div>
        </section>

        <section id="faq" className="site-width info-section faq-section" aria-labelledby="faq-heading">
          <SectionHeader id="faq-heading" title={t.sections.faq} lead={t.sections.faqLead} />
          <div className="faq-list">
            {t.faqs.map(item => (
              <details key={item.question}>
                <summary>{item.question}<ChevronDown aria-hidden="true" /></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="site-width footer-inner">
          <div className="footer-brand">
            <a className="brand-link" href="#top"><img width="36" height="36" src="/icon128.png" alt="" />TOTP Authenticator</a>
            <p>{t.footer.summary}</p>
          </div>
          <div className="footer-links">
            <a href={guideUrl}>{t.footer.guide}</a>
            <a href={chromeStoreUrl}><Chrome aria-hidden="true" />{t.footer.install}</a>
            <a href={githubUrl}><Github aria-hidden="true" />{t.footer.source}</a>
            {siteMetadata.license === 'MIT' && <a href="https://opensource.org/license/mit">MIT License</a>}
          </div>
        </div>
      </footer>
    </div>
  )
}

function SectionHeader({ id, title, lead }: { id: string; title: string; lead: string }) {
  return (
    <div className="section-heading">
      <h2 id={id}>{title}</h2>
      <p>{lead}</p>
    </div>
  )
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon

  return (
    <article className="feature-card">
      <span className="feature-icon" aria-hidden="true"><Icon /></span>
      <h3>{feature.title}</h3>
      <p>{feature.body}</p>
    </article>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
