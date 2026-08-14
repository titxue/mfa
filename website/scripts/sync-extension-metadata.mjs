import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const websiteRoot = resolve(scriptDir, '..')
const repoRoot = resolve(websiteRoot, '..')

const packageJson = JSON.parse(await readFile(resolve(repoRoot, 'package.json'), 'utf8'))
const repository =
  typeof packageJson.repository === 'string'
    ? packageJson.repository
    : packageJson.repository?.url

const metadata = {
  name: packageJson.name,
  version: packageJson.version,
  license: packageJson.license,
  repository: normalizeRepositoryUrl(repository),
}

await mkdir(resolve(websiteRoot, 'src/generated'), { recursive: true })
await mkdir(resolve(websiteRoot, 'public'), { recursive: true })

await writeFile(
  resolve(websiteRoot, 'src/generated/extensionMetadata.ts'),
  `export const extensionMetadata = ${JSON.stringify(metadata, null, 2)} as const\n`,
)

await writeFile(
  resolve(websiteRoot, 'public/version.json'),
  `${JSON.stringify(metadata, null, 2)}\n`,
)

for (const relativePath of ['index.html', 'zh/index.html']) {
  const htmlPath = resolve(websiteRoot, relativePath)
  const html = await readFile(htmlPath, 'utf8')
  const updated = html.replace(
    /"softwareVersion":\s*"[^"]+"/,
    `"softwareVersion": "${metadata.version}"`,
  )

  await writeFile(htmlPath, updated)
}

function normalizeRepositoryUrl(repositoryUrl) {
  if (!repositoryUrl) {
    return 'https://github.com/titxue/mfa'
  }

  return repositoryUrl
    .replace(/^git\+/, '')
    .replace(/^git:/, 'https:')
    .replace(/\.git$/, '')
}
