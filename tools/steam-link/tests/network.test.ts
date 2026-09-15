import { describe, expect, test } from 'bun:test'
import { chooseProxy, normalizeProxy, createSteamRequester, ProxyError } from '../network'

const disabled = { enabled: false }
describe('shared Steam proxy routing', () => {
  test('uses enabled Windows manual proxy when environment has no proxy', () => {
    expect(chooseProxy(undefined, false, {}, { enabled: true, server: '127.0.0.1:7890' })).toEqual({ source: 'windows', url: 'http://127.0.0.1:7890/' })
    expect(chooseProxy(undefined, false, {}, { enabled: true, server: 'http=first:8000;https=second:8001' }).url).toBe('http://second:8001/')
    expect(chooseProxy(undefined, false, {}, disabled)).toEqual({ source: 'direct' })
    expect(chooseProxy(undefined, false, {}, { enabled: true, server: 'http=first:8000' })).toEqual({ source: 'direct' })
  })
  test('explicit proxy and direct choices override environment and system', () => {
    const env = { HTTPS_PROXY: 'http://environment:8000' }, system = { enabled: true, server: 'system:8001' }
    expect(chooseProxy('http://explicit:9000', false, env, system)).toEqual({ source: 'argument', url: 'http://explicit:9000/' })
    expect(chooseProxy(undefined, true, env, system)).toEqual({ source: 'direct' })
    expect(chooseProxy(undefined, false, env, system)).toEqual({ source: 'environment', url: 'http://environment:8000/' })
    expect(() => chooseProxy('http://explicit:9000', true, env, system)).toThrow(ProxyError)
  })
  test('Steam proxy exclusions apply to the destination, not the local proxy host', () => {
    const system = { enabled: true, server: '127.0.0.1:7890' }
    for (const entry of ['*', 'api.steampowered.com', '.steampowered.com', '*.steampowered.com', 'api.steampowered.com:443']) {
      expect(chooseProxy(undefined, false, { NO_PROXY: entry }, system)).toEqual({ source: 'direct' })
      expect(chooseProxy(undefined, false, {}, { ...system, bypass: entry })).toEqual({ source: 'direct' })
    }
    expect(chooseProxy(undefined, false, { NO_PROXY: 'localhost,127.0.0.1' }, system).source).toBe('windows')
  })
  test('invalid proxy URLs are rejected without echoing credentials', () => {
    for (const value of ['socks5://user:private@localhost:1', 'http://localhost/path', 'http://localhost/?token=private', 'not a host']) {
      try { normalizeProxy(value); throw new Error('Expected rejection') }
      catch (error) { expect(error).toBeInstanceOf(ProxyError); expect(String(error)).not.toContain('private') }
    }
    expect(new URL(normalizeProxy('http://user:private@localhost:7890')).host).toBe('localhost:7890')
  })
  test('native requester rejects non-Steam destinations and unexpected operations before connecting', async () => {
    const request = createSteamRequester()
    const init = { method: 'POST', body: new URLSearchParams({ input_json: '{}' }) }
    for (const url of ['http://api.steampowered.com/ITwoFactorService/QueryTime/v1/', 'https://example.test/', 'https://api.steampowered.com/ITwoFactorService/RemoveAuthenticator/v1/']) {
      await expect(request(url, init)).rejects.toThrow('Unexpected Steam endpoint')
    }
    await expect(request('https://api.steampowered.com/ITwoFactorService/QueryTime/v1/', { ...init, method: 'GET' })).rejects.toThrow('Unexpected Steam request')
  })
})
