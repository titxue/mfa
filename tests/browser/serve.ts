// Run `bun tests/browser/serve.ts`, then open http://127.0.0.1:4179.
// Uses real DOM and React; all accounts and Chrome responses are synthetic.
const output = `${import.meta.dir}/../../output/playwright/regression`
const result = await Bun.build({ entrypoints: [`${import.meta.dir}/regression.tsx`], outdir: output,
  target: 'browser', define: { 'process.env.NODE_ENV': '"development"' } })
if (!result.success) throw new AggregateError(result.logs, 'Browser test build failed')
Bun.serve({ hostname: '127.0.0.1', port: 4179, fetch(request) {
  const path = new URL(request.url).pathname
  if (path === '/') return new Response(Bun.file(`${import.meta.dir}/index.html`))
  if (path === '/regression.js') return new Response(Bun.file(`${output}/regression.js`))
  if (path === '/styles.css') return new Response(Bun.file(`${import.meta.dir}/../../dist/styles.css`))
  if (path === '/favicon.ico') return new Response(null, { status: 204 })
  return new Response('Not found', { status: 404 })
} })
console.log('Browser regression checks: http://127.0.0.1:4179')
