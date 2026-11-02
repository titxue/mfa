import type { Language } from '../types'

const en = {
  title: 'Set up Steam Guard', intro: 'Link a new authenticator shared with the official Steam mobile app.',
  continue: 'Continue',
  authorizing: 'Requesting Steam API access. Check the browser permission prompt.', signingIn: 'Connecting to Steam and signing in…',
  steps: ['Sign in', 'Check account', 'Save key', 'Verify on phone', 'Add account'],
  username: 'Steam login name', password: 'Steam password', login: 'Sign in to Steam',
  guard: 'Enter the login code from your email or Steam app. You can also approve the login on your phone when offered.',
  loginCode: 'Login verification code', check: 'Check authenticator status',
  existing: 'This account already has an authenticator. To create a shared one, you must separately remove the old authenticator in the official app, then check again. Removal causes trade/market restrictions. Do not add a new one on your phone yet.',
  ready: 'Ready to create a new key. It will be encrypted and saved on this computer before phone activation.',
  acknowledge: 'I understand this creates a new authenticator and may trigger Steam verification messages.',
  initialize: 'Create and save key', filePassword: 'Recovery backup password (at least 8 characters)',
  pending: 'Key saved. Now add the authenticator in the official Steam app for this account. Then enter the current 5-character code below. Do not enter the SMS activation code here.',
  recovery: 'Recovery code — save it somewhere safe', verify: 'Verify phone code', phoneCode: 'Current Steam Guard code',
  backup: 'Download recovery checkpoint', restore: 'Restore a checkpoint', resume: 'Unlock the saved checkpoint to continue.',
  uncertain: 'An initialization request was recorded but its result is uncertain. Do not repeat it. Check the official app first; this checkpoint may not contain a key.',
  verified: 'Phone code and active token match. Choose a name and add the account.',
  saved: 'Account added. Verify a real Steam login using the extension before relying on it.',
  logout: 'Sign out of this flow', clear: 'Clear saved checkpoint', clearConfirm: 'Clear the local checkpoint? Download it first if you may need it. This does not remove anything from Steam.',
  locked: 'Unlock the extension from its toolbar popup, then reload this page.',
  failure: 'Operation failed', duplicate: 'An account with this name already exists. Choose another name.',
  recoveryOnly: 'Steam returned a key, but persistent storage failed. Download the recovery checkpoint before closing the browser. Resolve the storage problem, then retry. Do not activate on your phone yet.',
}
type Strings = { [K in keyof typeof en]: K extends 'steps' ? string[] : string }
const zh: Strings = {
  title: '绑定 Steam Guard', intro: '建立与 iPhone 官方 Steam App 共用的新令牌。',
  continue: '继续',
  authorizing: '正在申请 Steam 接口访问权限，请处理浏览器的权限提示。', signingIn: '正在连接 Steam 并登录，请稍候…',
  steps: ['登录', '检查账号', '保存密钥', '手机核对', '添加账户'],
  username: 'Steam 登录账号（不是昵称）', password: 'Steam 密码', login: '登录 Steam',
  guard: '输入邮件或 Steam App 中的登录验证码；如果 Steam 提供手机批准，也可以在手机上确认本次登录。',
  loginCode: '登录验证码', check: '重新检查令牌状态',
  existing: '账号已有有效令牌。如决定重建共用令牌，请另行在官方 App 移除旧令牌，再回来重新检查。移除会触发交易／市场限制。此时先不要在手机重新添加。',
  ready: '可以初始化新密钥。手机激活前，密钥会先加密保存在这台电脑上。',
  acknowledge: '我确认创建一套新令牌，并知悉 Steam 可能发送验证短信或邮件。',
  initialize: '初始化并保存密钥', filePassword: '恢复备份密码（至少 8 位）',
  pending: '密钥已保存。现在到官方 Steam App 为同一账号添加验证器，再输入手机当前显示的 5 位验证码。不要在这里输入激活短信。',
  recovery: '恢复码，请单独妥善保存', verify: '核对手机验证码', phoneCode: '手机当前 Steam Guard 码',
  backup: '下载恢复检查点', restore: '恢复检查点', resume: '输入检查点密码，继续上次绑定。',
  uncertain: '已记录初始化请求，但结果不确定。请先在官方 App 核实，勿重复初始化；这个检查点可能尚未包含密钥。',
  verified: '手机验证码与已激活令牌均匹配，可以设置名称并添加账户。',
  saved: '账户已添加。请用扩展生成的验证码实际登录一次 Steam，确认可用。',
  logout: '退出本次登录', clear: '清除本机检查点', clearConfirm: '确定清除本机检查点？如后续仍需要恢复，请先下载备份。这不会移除 Steam 上的令牌。',
  locked: '请先从浏览器工具栏打开扩展并解锁，再刷新此页面。',
  failure: '操作未完成', duplicate: '账户名称已存在，请换一个名称。',
  recoveryOnly: 'Steam 已返回密钥，但本机持久化失败。关闭浏览器前请先下载恢复检查点，处理存储问题后重试。暂时不要在手机激活。',
}
export function bindingStrings(locale: Language): Strings { return locale === 'zh-CN' || locale === 'zh-TW' ? zh : en }

export function bindingError(locale: Language, error: string, result?: number): string {
  const s = bindingStrings(locale), chinese = locale.startsWith('zh')
  const messages: Record<string, string> = {
    rateLimit: chinese ? 'Steam 请求过于频繁，请稍后重试。' : 'Steam is receiving too many requests. Wait before trying again.',
    permission: chinese ? '请允许扩展连接 Steam API 后重试。' : 'Allow access to the Steam API and try again.',
    permissionTimeout: chinese ? '等待访问权限确认超时。请处理浏览器权限提示后重试。' : 'Permission confirmation timed out. Respond to the browser prompt and retry.',
    requestTimeout: chinese ? '扩展后台响应超时。请重新打开绑定页面查看状态，勿重复初始化。' : 'The background response timed out. Reopen this page to check the state; do not repeat initialization.',
    network: chinese ? '连接 Steam 失败，请检查浏览器的网络／代理。' : 'Could not connect to Steam. Check browser connectivity/proxy.',
    backgroundUnavailable: chinese ? '扩展后台没有返回结果。请在扩展管理页重新加载扩展，并关闭后重新打开绑定页面。' : 'The extension background did not respond. Reload the extension, then close and reopen this page.',
    storageError: chinese ? '扩展后台或存储操作未完成。请重新加载扩展后重试；登录失败时会保留当前密码输入。' : 'The extension background or storage operation failed. Reload the extension and retry. The password input is kept on login failure.',
    sessionStorage: chinese ? '无法读写 Chrome 会话存储，登录状态未保存。请重新加载扩展后重试。' : 'Chrome session storage could not be read or written. Reload the extension and retry.',
    authProcessing: chinese ? '处理 Steam 登录响应失败（authProcessing），不是密码输入被清空导致的。请保留此错误码反馈。' : 'The Steam login response could not be processed (authProcessing). Please report this code.',
    existing: s.existing, uncertain: s.uncertain, locked: s.locked, duplicate: s.duplicate,
    checkpointPassword: chinese ? '检查点密码错误或文件损坏。' : 'Wrong checkpoint password or damaged file.',
    checkpointExists: chinese ? '已有检查点，请先恢复或备份后清除。' : 'A checkpoint already exists. Restore it, or back it up before clearing.',
    codeMismatch: chinese ? '验证码不匹配，请检查账号并在手机验证码刷新后重试。' : 'Codes do not match. Check the account and try the next phone code.',
    tokenChanged: chinese ? '手机激活了不同的令牌，不能使用这份密钥。请保留检查点并核实绑定流程。' : 'A different token was activated. Keep the checkpoint and check the enrollment flow.',
    notActive: chinese ? 'Steam 尚未确认激活，请先在手机完成添加。' : 'Steam has not confirmed activation. Complete setup on your phone.',
    accountMismatch: chinese ? '登录账号与检查点不一致。' : 'The login account does not match the checkpoint.',
    loginTimeout: chinese ? '登录已过期，请重新登录。' : 'Login expired. Sign in again.',
    passwordLength: chinese ? '文件密码至少需要 8 位。' : 'Use at least 8 characters for the backup password.',
    notVerified: chinese ? '请重新核对手机验证码后再保存。' : 'Verify the phone code again before saving.',
  }
  if (error === 'steam' && result === 5) return chinese ? 'Steam 拒绝了账号或密码，请检查登录账号。' : 'Steam rejected the account name or password.'
  if (error === 'steam' && [65, 71, 88].includes(result ?? 0)) return chinese ? '登录验证码无效或已过期，请重试。' : 'The login code is invalid or expired. Try again.'
  return messages[error] ?? `${s.failure} (${error}${result ? ` ${result}` : ''})`
}
