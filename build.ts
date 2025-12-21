import { $ } from 'bun'
import { copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

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
  await $`cp -r ./public/icons/* ./dist/icons/`
  console.log('✅ Icons copied')
} else {
  console.warn('⚠️  No icons found in ./public/icons/')
}

console.log('✅ Build completed successfully!')
console.log('📦 Output directory: ./dist')

if (isDev) {
  console.log('👀 Watching for changes...')
  // 注意：这里只是示意，实际的 watch 模式需要更复杂的实现
  // 可以使用 chokidar 或其他 file watcher
}
