import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Keep the familiar Bun command, but run the Node-targeted login dependency on Node.
const folder = dirname(fileURLToPath(import.meta.url))
const output = join(folder, 'runtime.mjs')
const result = await Bun.build({ entrypoints: [join(folder, 'node-entry.ts')], outdir: folder,
  naming: 'runtime.mjs', target: 'node', format: 'esm', packages: 'external' })
if (!result.success) {
  console.error('绑定助手编译失败。请先运行 bun run steam:link:check。')
  process.exitCode = 1
} else {
  const child = spawnSync('node', [output, ...process.argv.slice(2)], { stdio: 'inherit' })
  if (child.error) console.error('无法启动 Node.js。请确认 node --version 能正常运行。')
  process.exitCode = child.status ?? 1
}
