import { execFileSync } from 'node:child_process'
import { request } from 'node:https'
import { getProxyAgent } from '@doctormckay/stdlib/http.js'
import type { Requester } from './core'

export class ProxyError extends Error {
  constructor() { super('invalidProxy') }
}
export interface ProxySettings { enabled: boolean; server?: string; bypass?: string }
export interface ProxyChoice { url?: string; source: 'argument' | 'environment' | 'windows' | 'direct' }

export function normalizeProxy(value: string): string {
  try {
    const url = new URL(value.includes('://') ? value : `http://${value}`)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.pathname !== '/' || url.search || url.hash) throw new ProxyError()
    return url.toString()
  } catch { throw new ProxyError() }
}

function bypassesSteam(value?: string): boolean {
  return (value ?? '').split(/[,;]/).some(item => {
    let host = item.trim().toLowerCase().replace(/:443$/, '')
    if (host === '*') return true
    if (host.startsWith('*.')) host = host.slice(1)
    return host === 'api.steampowered.com' || (host.startsWith('.') && 'api.steampowered.com'.endsWith(host)) || host === 'steampowered.com'
  })
}

export function windowsProxySettings(): ProxySettings | undefined {
  if (process.platform !== 'win32') return undefined
  try {
    const result = execFileSync('reg.exe', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'], { encoding: 'utf8', windowsHide: true, timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] })
    return {
      enabled: /ProxyEnable\s+REG_DWORD\s+0x1\b/i.test(result),
      server: result.match(/ProxyServer\s+REG_SZ\s+([^\r\n]+)/i)?.[1].trim(),
      bypass: result.match(/ProxyOverride\s+REG_SZ\s+([^\r\n]+)/i)?.[1].trim(),
    }
  } catch { return undefined }
}

export function chooseProxy(explicit?: string, direct = false, env: Record<string, string | undefined> = process.env,
  system: ProxySettings | undefined = windowsProxySettings()): ProxyChoice {
  if (direct && explicit !== undefined) throw new ProxyError()
  if (direct) return { source: 'direct' }
  if (explicit !== undefined) return { source: 'argument', url: normalizeProxy(explicit) }
  if (bypassesSteam(env.NO_PROXY ?? env.no_proxy)) return { source: 'direct' }
  const environment = env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy
  if (environment) return { source: 'environment', url: normalizeProxy(environment) }
  if (system?.enabled && system.server && !bypassesSteam(system.bypass)) {
    const value = system.server.includes('=')
      ? system.server.split(';').map(item => item.trim()).find(item => /^https=/i.test(item))?.slice(6)
      : system.server
    if (value) return { source: 'windows', url: normalizeProxy(value) }
  }
  return { source: 'direct' }
}

/** Node HTTPS is used for API calls too, so login and enrollment share the same proxy. */
export function createSteamRequester(proxy?: string): Requester {
  const agent = proxy ? getProxyAgent(true, normalizeProxy(proxy)) : undefined
  return async (address, init) => {
    const url = new URL(address)
    if (url.origin !== 'https://api.steampowered.com' || !/^\/ITwoFactorService\/(QueryTime|QueryStatus|AddAuthenticator)\/v1\/$/.test(url.pathname) || url.search || url.hash || url.username || url.password) throw new Error('Unexpected Steam endpoint')
    if (init.method !== 'POST' || !(init.body instanceof URLSearchParams)) throw new Error('Unexpected Steam request')
    const body = Buffer.from(init.body.toString())
    return new Promise<Response>((resolve, reject) => {
      const req = request(url, {
        method: 'POST', agent, signal: init.signal ?? undefined,
        headers: { ...Object.fromEntries(new Headers(init.headers)), 'Content-Length': String(body.length) },
      }, response => {
        const chunks: Buffer[] = []; let length = 0
        response.on('data', (chunk: Buffer) => {
          length += chunk.length
          if (length > 1024 * 1024) { response.destroy(new Error('Oversized Steam response')); return }
          chunks.push(chunk)
        })
        response.on('error', reject)
        response.on('end', () => {
          const headers = new Headers()
          for (const [key, value] of Object.entries(response.headers)) {
            if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
          }
          const status = response.statusCode ?? 502
          resolve(new Response([204, 205, 304].includes(status) ? null : Buffer.concat(chunks), { status, headers }))
        })
      })
      req.on('error', reject)
      req.end(body)
    })
  }
}
