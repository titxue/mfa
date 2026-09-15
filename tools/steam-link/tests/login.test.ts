import { describe, test, expect } from 'bun:test'
import { EventEmitter } from 'node:events'
import { login, loginError, describeLoginError, type LoginDriver, type Prompt } from '../login'
import { LinkError } from '../core'

class Driver extends EventEmitter implements LoginDriver {
  loginTimeout = 0
  accountName = 'demo'
  steamID = { getSteamID64: () => '76561198000000000' }
  accessToken = 'test-access-token'
  cancelled = 0
  starts = 0
  submits: string[] = []
  actions: { type: number }[] = []
  failCodeOnce = false
  completeImmediately = false
  async startWithCredentials(details: { accountName: string; password: string }) {
    this.starts++
    expect(details).toEqual({ accountName: 'demo', password: 'test-password' })
    if (this.completeImmediately) queueMicrotask(() => this.emit('authenticated'))
    else if (this.actions.some(a => a.type === 4 || a.type === 5)) setTimeout(() => this.emit('authenticated'), 1)
    return { actionRequired: this.actions.length > 0, validActions: this.actions }
  }
  async submitSteamGuardCode(code: string) {
    this.submits.push(code)
    if (this.failCodeOnce && this.submits.length === 1) throw Object.assign(new Error('secret-in-error'), { eresult: 88 })
    queueMicrotask(() => this.emit('authenticated'))
  }
  async refreshAccessToken() { this.accessToken = 'refreshed-token' }
  cancelLoginAttempt() { this.cancelled++ }
}
const answers = (values: string[], requests: { hidden?: boolean; label: string }[] = []): Prompt => async (label, hidden) => {
  requests.push({ label, hidden }); const answer = values.shift()
  if (answer === undefined) throw new Error('Unexpected prompt')
  return answer
}

describe('local Steam session login', () => {
  test('password is hidden and tokens are returned only after authentication', async () => {
    const driver = new Driver(); driver.completeImmediately = true
    const prompts: { hidden?: boolean; label: string }[] = [], messages: string[] = []
    const result = await login(answers(['demo', 'test-password'], prompts), message => messages.push(message), () => driver)
    expect(result).toEqual({ steamId: '76561198000000000', accountName: 'demo', accessToken: 'test-access-token' })
    expect(prompts[1].hidden).toBe(true)
    expect(messages.join('')).not.toContain('test-password')
    expect(messages.join('')).not.toContain('test-access-token')
    expect(driver.cancelled).toBe(1)
  })
  test.each([2, 3])('guard type %i submits a code without restarting login', async type => {
    const driver = new Driver(); driver.actions = [{ type }]; driver.failCodeOnce = true
    const prompts: { hidden?: boolean; label: string }[] = []
    await login(answers(['demo', 'test-password', 'WRONG', '7MQGM'], prompts), () => {}, () => driver)
    expect(driver.starts).toBe(1)
    expect(driver.submits).toEqual(['WRONG', '7MQGM'])
    expect(prompts.slice(1).every(p => p.hidden)).toBe(true)
    expect(driver.cancelled).toBe(1)
  })
  test('phone approval requires no unnecessary additional code', async () => {
    const driver = new Driver(); driver.actions = [{ type: 4 }, { type: 3 }]
    await login(answers(['demo', 'test-password']), () => {}, () => driver)
    expect(driver.submits).toEqual([])
    expect(driver.cancelled).toBe(1)
  })
  test('Steam mobile-verification, rejection, and transport errors have safe diagnostics', () => {
    const guard = describeLoginError(loginError({ eresult: 85, message: 'private-token' }, 'credentials'))
    expect(guard).toContain('85')
    expect(guard).toContain('手机二次验证')
    expect(guard).not.toContain('private-token')
    const password = describeLoginError(loginError({ eresult: 5, message: 'test-password' }, 'credentials'))
    expect(password).toContain('InvalidPassword')
    expect(password).not.toContain('test-password')
    const network = describeLoginError(loginError({ code: 'ECONNRESET', message: 'test-access-token' }, 'confirmation'))
    expect(network).toContain('ECONNRESET')
    expect(network).toContain('不代表密码错误')
    expect(network).not.toContain('test-access-token')
    expect(describeLoginError(loginError({ code: 403 }, 'credentials'))).toContain('HTTP 403')
    expect(describeLoginError(loginError({ eresult: 'private-token', code: 'private-token', message: 'private-token' }, 'refresh'))).not.toContain('private-token')
  })
  test('missing access token is refreshed in memory', async () => {
    const driver = new Driver(); driver.completeImmediately = true; driver.accessToken = ''
    expect((await login(answers(['demo', 'test-password']), () => {}, () => driver)).accessToken).toBe('refreshed-token')
  })
  test('access-token refresh is also bounded by the login deadline', async () => {
    const driver = new Driver(); driver.completeImmediately = true; driver.accessToken = ''
    driver.refreshAccessToken = () => new Promise(() => {})
    await expect(login(answers(['demo', 'test-password']), () => {}, () => driver, 15)).rejects.toThrow('loginTimeout')
    expect(driver.cancelled).toBe(1)
  })
  test('unsupported guard and login timeout stop cleanly', async () => {
    const unsupported = new Driver(); unsupported.actions = [{ type: 999 }]
    await expect(login(answers(['demo', 'test-password']), () => {}, () => unsupported)).rejects.toThrow('loginGuard')
    expect(unsupported.cancelled).toBe(1)
    const timeout = new Driver()
    await expect(login(answers(['demo', 'test-password']), () => {}, () => timeout, 15)).rejects.toThrow('loginTimeout')
    expect(timeout.cancelled).toBe(1)
  })
  test('raw dependency failures are reduced to a result code', async () => {
    const driver = new Driver()
    driver.startWithCredentials = async () => { throw Object.assign(new Error('test-password test-access-token'), { eresult: 5 }) }
    try {
      await login(answers(['demo', 'test-password']), () => {}, () => driver)
      throw new Error('Expected rejection')
    } catch (error) {
      expect(error).toBeInstanceOf(LinkError)
      expect(error).toMatchObject({ code: 'login', result: 5 })
      expect(String(error)).not.toContain('test-password')
      expect(String(error)).not.toContain('test-access-token')
    }
  })
  test('cancel before submitting credentials makes no login request', async () => {
    const driver = new Driver()
    await expect(login(async () => { throw new LinkError('cancelled') }, () => {}, () => driver)).rejects.toThrow('cancelled')
    expect(driver.starts).toBe(0)
    expect(driver.cancelled).toBe(1)
  })
})
