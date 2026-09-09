import { watch } from 'node:fs'

/** Watch source inputs only; generated version.ts and dist must not trigger builds. */
export async function watchBuild(): Promise<never> {
  let child: ReturnType<typeof Bun.spawn> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending = false
  let stopped = false

  async function rebuild() {
    if (stopped) return
    if (child) { pending = true; return }
    pending = false
    console.log('🔄 Rebuilding extension...')
    child = Bun.spawn([process.execPath, 'run', 'build.ts', '--development'], {
      stdin: 'ignore', stdout: 'inherit', stderr: 'inherit',
    })
    const code = await child.exited
    child = undefined
    if (stopped) return
    if (code !== 0) console.error('Build failed. Waiting for changes to retry.')
    if (pending) void rebuild()
  }

  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(() => { void rebuild() }, 150)
  }

  const watchers = ['src', 'public'].map(directory => watch(directory, { recursive: true }, (_event, filename) => {
    if (directory === 'src' && filename?.toString().replaceAll('\\', '/') === 'version.ts') return
    schedule()
  }))
  const rootInputs = new Set(['build.ts', 'package.json', 'tsconfig.json', 'tailwind.config.ts', 'postcss.config.js'])
  watchers.push(watch('.', (_event, filename) => {
    if (filename && rootInputs.has(filename.toString())) schedule()
  }))

  function stop() {
    stopped = true
    clearTimeout(timer)
    watchers.forEach(watcher => watcher.close())
    child?.kill()
    process.exit(0)
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  console.log('👀 Watching src/, public/ and build configuration. Press Ctrl+C to stop.')
  await rebuild()
  return new Promise<never>(() => {})
}
