import { $ } from 'bun'
import { copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync, readdirSync } from 'fs'
import { LANGUAGE_CONFIGS } from './src/locales'

const isDev = Bun.argv.includes('--watch')

console.log(`🚀 Building TOTP Generator (${isDev ? 'development' : 'production'})...`)

// 读取 package.json 获取版本号
const packageJson = JSON.parse(await readFile('./package.json', 'utf-8'))
const version = packageJson.version

// 生成 version.ts 文件
const versionTs = `// 此文件由 build.ts 自动生成，请勿手动修改
export const VERSION = '${version}'
`
await writeFile('./src/version.ts', versionTs)
console.log(`📝 Generated version.ts with version ${version}`)

// 清理 dist 目录
if (existsSync('./dist')) {
  await $`rm -rf ./dist`
}

await mkdir('./dist', { recursive: true })
await mkdir('./dist/icons', { recursive: true })

// 构建 popup
const popupBuild = await Bun.build({
  entrypoints: ['./src/popup/index.tsx'],
  outdir: './dist',
  target: 'browser',
  minify: !isDev,
  format: 'esm',
})

if (!popupBuild.success) {
  console.error('❌ Popup build failed:')
  for (const log of popupBuild.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log('✅ Popup built successfully')

// 构建 content-script
const contentBuild = await Bun.build({
  entrypoints: ['./src/content-script.ts'],
  outdir: './dist',
  target: 'browser',
  minify: !isDev,
  format: 'iife',
})

if (!contentBuild.success) {
  console.error('❌ Content script build failed:')
  for (const log of contentBuild.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log('✅ Content script built successfully')

// 编译 Tailwind CSS
console.log('🎨 Compiling Tailwind CSS...')
await $`./node_modules/.bin/tailwindcss -i ./src/styles/globals.css -o ./dist/styles.css ${isDev ? '' : '--minify'}`

console.log('✅ Tailwind CSS compiled')

// 复制 HTML 文件
await copyFile('./src/popup/index.html', './dist/popup.html')

// 更新 HTML 文件引用
const html = await Bun.file('./dist/popup.html').text()
const updatedHtml = html
  .replace('<script type="module" src="./index.tsx"></script>', '<script type="module" src="./index.js"></script>')
  .replace('</head>', '<link rel="stylesheet" href="./styles.css"></head>')

await Bun.write('./dist/popup.html', updatedHtml)

console.log('✅ HTML files processed')

// 复制并更新 manifest.json
const manifestJson = JSON.parse(await readFile('./public/manifest.json', 'utf-8'))
manifestJson.version = version
await writeFile('./dist/manifest.json', JSON.stringify(manifestJson, null, 2))
console.log(`✅ Manifest updated with version ${version}`)

// 复制图标
if (existsSync('./public/icons')) {
  const iconFiles = ['icon16.png', 'icon48.png', 'icon128.png']
  for (const icon of iconFiles) {
    const sourcePath = `./public/icons/${icon}`
    const destPath = `./dist/icons/${icon}`
    if (existsSync(sourcePath)) {
      await copyFile(sourcePath, destPath)
    }
  }
  console.log('✅ Icons copied')
} else {
  console.warn('⚠️  No icons found in ./public/icons/')
}

// 自动生成 _locales 目录
console.log('🌐 Generating _locales directory...')
const localesTarget = './dist/_locales'
await mkdir(localesTarget, { recursive: true })

// Chrome 扩展的 locale 代码映射（Chrome 使用下划线，我们的代码使用连字符）
const chromeLocaleMap: Record<string, string> = {
  'zh-CN': 'zh_CN',
  'zh-TW': 'zh_TW',
  'en-US': 'en',
  'es-ES': 'es',
  'fr-FR': 'fr',
  'pt-BR': 'pt_BR',
  'de-DE': 'de',
  'ru-RU': 'ru',
  'ar-SA': 'ar',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'hi-IN': 'hi',
}

// 扩展名称和描述的翻译（从配置中获取）
const extensionNames: Record<string, string> = {
  'zh-CN': 'TOTP 身份验证器 - 双因素验证码生成器',
  'zh-TW': 'TOTP 身份驗證器 - 雙重驗證碼生成器',
  'en-US': 'TOTP Authenticator - 2FA OTP Code Generator',
  'es-ES': 'Autenticador TOTP - Generador de Códigos OTP 2FA',
  'fr-FR': 'Authentificateur TOTP - Générateur de Codes OTP 2FA',
  'pt-BR': 'Autenticador TOTP - Gerador de Códigos OTP 2FA',
  'de-DE': 'TOTP-Authentifikator - 2FA-OTP-Code-Generator',
  'ru-RU': 'TOTP-аутентификатор - генератор OTP-кодов для 2FA',
  'ar-SA': 'مصدق TOTP - مولد رمز OTP للمصادقة الثنائية',
  'ja-JP': 'TOTP認証 - 2FA OTPコード生成器',
  'ko-KR': 'TOTP 인증 - 2FA OTP 코드 생성기',
  'hi-IN': 'TOTP प्रमाणक - 2FA OTP कोड जनरेटर',
}

const extensionDescriptions: Record<string, string> = {
  'zh-CN': '安全快速的 TOTP 双因素认证器。离线生成验证码，轻松管理多个账户。',
  'zh-TW': '安全快速的 TOTP 雙重驗證器。離線生成驗證碼，輕鬆管理多個帳戶。',
  'en-US': 'Secure and fast TOTP authenticator for 2FA login. Generate OTP codes offline and manage multiple accounts easily.',
  'es-ES': 'Autenticador TOTP seguro y rápido para inicio de sesión 2FA. Genere códigos OTP sin conexión y administre múltiples cuentas fácilmente.',
  'fr-FR': 'Authentificateur TOTP sécurisé et rapide pour la connexion 2FA. Générez des codes OTP hors ligne et gérez facilement plusieurs comptes.',
  'pt-BR': 'Autenticador TOTP seguro e rápido para login 2FA. Gere códigos OTP offline e gerencie múltiplas contas facilmente.',
  'de-DE': 'Sicherer und schneller TOTP-Authentifikator für 2FA-Anmeldung. Generieren Sie OTP-Codes offline und verwalten Sie mehrere Konten einfach.',
  'ru-RU': 'Безопасный и быстрый TOTP-аутентификатор для входа с 2FA. Генерируйте OTP-коды офлайн и легко управляйте несколькими аккаунтами.',
  'ar-SA': 'مصادق TOTP آمن وسريع لتسجيل الدخول بالمصادقة الثنائية. قم بإنشاء رموز OTP دون اتصال بالإنترنت وإدارة حسابات متعددة بسهولة.',
  'ja-JP': '2FAログイン用の安全で高速なTOTP認証アプリ。オフラインでOTPコードを生成し、複数のアカウントを簡単に管理できます。',
  'ko-KR': '2FA 로그인을 위한 안전하고 빠른 TOTP 인증기. 오프라인으로 OTP 코드를 생성하고 여러 계정을 쉽게 관리하세요.',
  'hi-IN': '2FA लॉगिन के लिए सुरक्षित और तेज़ TOTP प्रमाणक। ऑफ़लाइन OTP कोड उत्पन्न करें और आसानी से कई खातों का प्रबंधन करें।',
}

// 为每种语言生成 messages.json
for (const config of LANGUAGE_CONFIGS) {
  const langCode = config.code
  const chromeLocale = chromeLocaleMap[langCode]

  if (!chromeLocale) {
    console.warn(`⚠️  No Chrome locale mapping for ${langCode}`)
    continue
  }

  const localeDir = `${localesTarget}/${chromeLocale}`
  await mkdir(localeDir, { recursive: true })

  const messages = {
    extensionName: {
      message: extensionNames[langCode] || extensionNames['en-US'],
      description: 'Extension name',
    },
    extensionDescription: {
      message: extensionDescriptions[langCode] || extensionDescriptions['en-US'],
      description: 'Extension description',
    },
  }

  await writeFile(
    `${localeDir}/messages.json`,
    JSON.stringify(messages, null, 2)
  )
}

console.log(`✅ Generated ${LANGUAGE_CONFIGS.length} locale directories`)

console.log('✅ Build completed successfully!')
console.log('📦 Output directory: ./dist')

if (isDev) {
  console.log('👀 Watching for changes...')
  // 注意：这里只是示意，实际的 watch 模式需要更复杂的实现
  // 可以使用 chokidar 或其他 file watcher
}

// 辅助函数：递归复制目录
async function copyDirectory(src: string, dest: string) {
  const entries = readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = `${src}/${entry.name}`
    const destPath = `${dest}/${entry.name}`

    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true })
      await copyDirectory(srcPath, destPath)
    } else {
      await copyFile(srcPath, destPath)
    }
  }
}
