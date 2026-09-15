import { createInterface } from 'node:readline'
import { Writable } from 'node:stream'
import { LinkError, type LoginIdentity } from './core'

export type Prompt = (label: string, hidden?: boolean, signal?: AbortSignal) => Promise<string>

export type LoginStage = 'credentials' | 'confirmation' | 'refresh'
export class LoginError extends LinkError {
  constructor(public readonly stage: LoginStage, result?: number, public readonly transport?: string) { super('login', result) }
}

/** Preserve only numeric Steam/HTTP codes and known transport names; never raw error text. */
export function loginError(error: unknown, stage: LoginStage): LoginError {
  const e = error as { eresult?: unknown; code?: unknown; name?: unknown; message?: unknown } | null
  if (typeof e?.eresult === 'number' && Number.isInteger(e.eresult) && e.eresult > 0 && e.eresult < 256) return new LoginError(stage, e.eresult)
  const names: Record<string, number> = { InvalidPassword: 5, ServiceUnavailable: 20, AccessDenied: 15,
    RateLimitExceeded: 84, AccountLoginDeniedNeedTwoFactor: 85, TwoFactorCodeMismatch: 88,
    InvalidLoginAuthCode: 65, ExpiredLoginAuthCode: 71 }
  if (typeof e?.message === 'string' && Object.hasOwn(names, e.message)) return new LoginError(stage, names[e.message])
  if (typeof e?.code === 'number' && Number.isInteger(e.code) && e.code >= 100 && e.code <= 599) return new LoginError(stage, undefined, `HTTP ${e.code}`)
  const network = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN',
    'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT']
  if (typeof e?.code === 'string' && network.includes(e.code)) return new LoginError(stage, undefined, e.code)
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return new LoginError(stage, undefined, 'TIMEOUT')
  return new LoginError(stage)
}

export function describeLoginError(error: LoginError): string {
  const stages: Record<LoginStage, string> = { credentials: '创建密码登录会话', confirmation: '等待或提交手机/邮件验证', refresh: '获取登录访问令牌' }
  const reasons: Record<number, string> = {
    5: 'Steam 返回 InvalidPassword，拒绝了本次账号/密码登录。请确认使用的是 Steam 登录账号而非昵称。',
    15: 'Steam 拒绝访问。', 20: 'Steam 登录服务暂时不可用。', 84: 'Steam 限制了登录请求，请稍后再试。',
    85: 'Steam 要求手机二次验证，请在手机上批准登录或按提示输入 Steam Guard 码。',
    88: 'Steam 手机验证码不匹配。', 65: 'Steam 登录验证码无效。', 71: 'Steam 登录验证码已过期。',
  }
  const detail = error.result ? `${reasons[error.result] ?? 'Steam 拒绝了登录请求。'}（Steam 结果码 ${error.result}）`
    : error.transport ? `连接或 HTTP 请求失败（${error.transport}），这不代表密码错误。`
    : '登录库未返回可识别的错误码，尚不能判断是否与密码有关。'
  return `登录阶段：${stages[error.stage]}。${detail}`
}

/** Secrets are entered interactively: no CLI flags, shell history or echoed characters. */
export const prompt: Prompt = (label, hidden = false, signal) => new Promise((resolve, reject) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) { reject(new LinkError('terminal')); return }
  if (signal?.aborted) { reject(new LinkError('cancelled')); return }
  const output = hidden ? new Writable({ write(_chunk, _encoding, done) { done() } }) : process.stdout
  const reader = createInterface({ input: process.stdin, output, terminal: true, historySize: 0 })
  let finished = false
  const end = (value?: string) => {
    if (finished) return
    finished = true; signal?.removeEventListener('abort', abort); reader.close()
    if (hidden) process.stdout.write('\n')
    if (value === undefined) reject(new LinkError('cancelled')); else resolve(value)
  }
  const abort = () => end()
  reader.on('SIGINT', abort)
  reader.on('close', () => { if (!finished) end() })
  signal?.addEventListener('abort', abort, { once: true })
  if (hidden) process.stdout.write(label)
  reader.question(hidden ? '' : label, answer => end(answer))
})

export interface LoginDriver {
  loginTimeout: number
  accountName: string
  steamID: { getSteamID64(): string }
  accessToken: string
  on(event: 'authenticated' | 'timeout' | 'error' | 'remoteInteraction', listener: (...args: any[]) => void): unknown
  startWithCredentials(details: { accountName: string; password: string }): Promise<{ actionRequired: boolean; validActions?: { type: number }[] }>
  submitSteamGuardCode(code: string): Promise<void>
  refreshAccessToken(): Promise<void>
  cancelLoginAttempt(): unknown
}

export async function login(ask: Prompt = prompt, say: (message: string) => void = console.log,
  create?: () => LoginDriver, timeoutMs = 180000,
  options: { proxy?: string } = {}): Promise<LoginIdentity> {
  // Disable dependency debug logging before it is loaded. Never register debug event handlers.
  delete process.env.DEBUG
  delete process.env.NODE_DEBUG
  if (!create) {
    const { LoginSession, EAuthTokenPlatformType } = await import('steam-session')
    create = () => new LoginSession(EAuthTokenPlatformType.MobileApp, options.proxy ? { httpProxy: options.proxy } : {})
  }
  const driver = create(), abort = new AbortController()
  driver.loginTimeout = timeoutMs
  let stage: LoginStage = 'credentials'
  let authenticated = false, failure: LinkError | undefined
  let resolveDone!: () => void, rejectDone!: (error: LinkError) => void
  const done = new Promise<void>((resolve, reject) => { resolveDone = resolve; rejectDone = reject })
  let rejectDeadline!: (error: LinkError) => void
  const deadline = new Promise<never>((_resolve, reject) => { rejectDeadline = reject })
  void done.catch(() => {})
  void deadline.catch(() => {})
  const fail = (error: LinkError) => { failure = error; rejectDone(error); abort.abort() }
  driver.on('authenticated', () => { authenticated = true; resolveDone(); abort.abort() })
  driver.on('timeout', () => fail(new LinkError('loginTimeout')))
  driver.on('error', error => fail(loginError(error, stage)))
  driver.on('remoteInteraction', () => say('Steam 已检测到手机端操作，请在 iPhone 上检查登录信息并点击批准。'))
  const timer = setTimeout(() => {
    const error = new LinkError('loginTimeout'); fail(error); rejectDeadline(error)
  }, timeoutMs)
  let password = ''
  try {
    const accountName = (await ask('Steam 登录账号：', false, abort.signal)).trim()
    if (!accountName) throw new LinkError('accountName')
    password = await ask('Steam 密码（不回显）：', true, abort.signal)
    say('正在连接 Steam，创建密码登录会话…')
    const result = await Promise.race([driver.startWithCredentials({ accountName, password }), done.then(() => undefined)])
    password = ''
    stage = 'confirmation'
    if (!authenticated && result?.actionRequired) {
      const actions = result.validActions ?? []
      if (actions.some(action => action.type === 4 || action.type === 5)) {
        say('请在 Steam 手机 App 或 Steam 发来的邮件中批准本次登录。')
      } else if (actions.some(action => action.type === 2 || action.type === 3)) {
        const label = actions.some(action => action.type === 3) ? '手机 Steam Guard 登录码：' : 'Steam 邮件登录码：'
        for (let attempt = 0; attempt < 3 && !authenticated; attempt++) {
          let code: string | undefined
          try { code = await Promise.race([ask(label, true, abort.signal), done.then(() => undefined)]) }
          catch (error) { if (authenticated) break; throw error }
          if (code === undefined || authenticated) break
          try { await driver.submitSteamGuardCode(code.trim()); break }
          catch (error) {
            const result = (error as { eresult?: number }).eresult
            if (![65, 71, 88].includes(result ?? 0) || attempt === 2) throw loginError(error, stage)
            say('验证码不匹配或已过期，请重新输入。')
          }
        }
      } else throw new LinkError('loginGuard')
    }
    await done
    stage = 'refresh'
    if (!driver.accessToken) await Promise.race([driver.refreshAccessToken(), deadline])
    const steamId = driver.steamID.getSteamID64()
    if (!/^\d{17}$/.test(steamId) || !driver.accessToken || !driver.accountName) throw new LinkError('login')
    return { steamId, accountName: driver.accountName, accessToken: driver.accessToken }
  } catch (error) {
    if (failure) throw failure
    if (error instanceof LinkError) throw error
    throw loginError(error, stage)
  } finally {
    password = ''; clearTimeout(timer); abort.abort(); driver.cancelLoginAttempt()
  }
}
