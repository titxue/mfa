import { mkdir, readFile, open, stat } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { acquireLock, decryptCheckpoint, encryptCheckpoint, saveCheckpoint } from './checkpoint'
import { LinkError, SteamLinkApi, exportVerified, initializeLink, waitForInitialization, verifyJointLink, type LoginIdentity, type PendingLink } from './core'
import { login, prompt, LoginError, describeLoginError } from './login'
import { chooseProxy, createSteamRequester, ProxyError } from './network'

const outputDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../.steam-link')
const help = `Steam 共用令牌助手（实验性，本地运行）

用法：
  bun run steam:link                         登录并检查是否可以初始化
  bun run steam:link --resume <检查点文件>    继续核对手机验证码；不会再次初始化
  bun run steam:link --check                 只检查 Steam 公共时间接口
  bun run steam:link --demo                  完全离线的合成数据演示
  bun run steam:link --proxy http://127.0.0.1:7890  手动指定 HTTP 代理
  bun run steam:link --direct            强制直连

首次安装依赖：npm ci --prefix tools/steam-link --ignore-scripts

当前 iPhone 令牌不会被助手移除或迁移。已有有效令牌时可保留登录会话，等待重新检查或退出。
共用绑定需要账户无现有验证器：如需移除，必须由你另行在官方 App 操作，且会触发交易限制。
初始化后，使用 iPhone 官方 Steam App 完成添加，再用手机当前的 5 位码核对。
不要把登录验证码或收到的激活短信当作最后的核对码。
密码与登录会话仅在内存中使用；检查点和导出文件均加密保存到 .steam-link。
检查点不能直接导入扩展。只有核对通过才生成扩展可导入的 JSON。`

function explain(error: unknown): string {
  if (error instanceof ProxyError) return '代理参数无效或冲突。仅支持 HTTP/HTTPS 代理；--proxy 与 --direct 不能同时使用。'
  if (error instanceof LoginError) return describeLoginError(error)
  if (!(error instanceof LinkError)) return '本地文件或依赖操作失败。检查目录权限、可用空间和依赖安装情况。'
  const messages: Record<string, string> = {
    existing: '这个账号已有有效验证器，助手已停止，未发送初始化请求，也未更改原令牌。',
    uncertain: '上次初始化请求的结果不确定。为避免重复绑定，本次不会重发请求。请先在官方 App 核实状态；此检查点还没有可用密钥。',
    protocol: 'Steam 返回格式或状态不符合已核验的协议，助手已停止。',
    network: 'Steam 请求失败或超时。初始化若已发出，不会自动重试；请保留检查点。',
    rateLimit: 'Steam 限流，请稍后再试。', http: 'Steam 返回 HTTP 错误。',
    checkpoint: '检查点格式无效或未能验证写入。', checkpointPassword: '检查点密码错误，或文件损坏/格式不支持。',
    locked: '这个检查点正在使用，或上次异常退出留下了 .lock。确认没有其他助手进程后再移除对应 .lock 文件。',
    accountMismatch: '登录账号与检查点或 Steam 返回的账号不一致，已停止。',
    notActive: 'Steam 尚未报告已激活。请先在 iPhone 官方 App 完成添加验证器。',
    tokenChanged: 'Steam 当前令牌与检查点中的令牌不同，无法共用；不会导出可能无效的密钥。',
    codeMismatch: '手机验证码与待激活密钥不匹配。确认是同一账号、当前五位码，并在刷新后重试。',
    notVerified: '手机验证码尚未核对，不能导出。', passwordLength: '备份密码至少需要 8 个字符。',
    terminal: '请在本地交互式终端运行，助手不接受从管道输入密码。', cancelled: '已取消。检查点（如已创建）会保留。',
    loginTimeout: '登录等待超时，请重新启动登录。', loginGuard: '此登录验证方式暂不支持，未更改令牌。',
    accountName: '请输入 Steam 登录账号。', login: 'Steam 登录或身份验证失败。',
  }
  if (error.code === 'steam') {
    if (error.result === 29) return 'Steam 报告已有验证器或重复初始化请求。已停止，不会撤销或重试。'
    if (error.result === 84) return 'Steam 限流，请稍后再试。'
    if (error.result === 123) return 'Steam 要求先验证手机号。请在官方账号页面完成后再操作。'
    return `Steam 拒绝请求（结果码 ${error.result ?? '未知'}）。`
  }
  return messages[error.code] ?? '操作未完成，未自动重试。'
}

async function writeExclusive(path: string, data: string) {
  const handle = await open(path, 'wx', 0o600)
  try { await handle.writeFile(data, 'utf8'); await handle.sync() } finally { await handle.close() }
}

async function demo() {
  const folder = resolve(outputDir, `demo-${crypto.randomUUID()}`)
  await mkdir(folder, { recursive: true })
  let active = false
  const api = new SteamLinkApi(async url => {
    const method = url.split('/').at(-3)
    const body = method === 'QueryTime' ? { server_time: '1700000000' }
      : method === 'QueryStatus' ? { state: active ? 1 : 0, token_gid: active ? 'demo-gid' : undefined }
      : { status: 1, account_name: 'demo', shared_secret: 'AAECAwQFBgcICQoLDA0ODxAREhM=', revocation_code: 'RDEMO1', token_gid: 'demo-gid' }
    return new Response(JSON.stringify({ response: body }), { headers: { 'x-eresult': '1' } })
  })
  const identity = { accountName: 'demo', steamId: '76561198000000000', accessToken: 'demo-only' }
  const password = 'demo-only-password', path = resolve(folder, 'checkpoint.json')
  let initial = true
  const pending = await initializeLink(api, identity, async p => { await saveCheckpoint(path, p, password, initial); initial = false })
  active = true
  await verifyJointLink(api, identity, pending, '7MQGM')
  pending.phase = 'verified'
  await saveCheckpoint(path, pending, password)
  await writeExclusive(resolve(folder, 'steam-demo.json'), await exportVerified(pending, password))
  console.log(`离线演示通过：未连接 Steam。\n合成数据文件：${folder}\n演示文件密码：${password}\n这些数据不属于真实 Steam 账号。`)
}

async function main() {
  const input = process.argv.slice(2)
  let explicitProxy: string | undefined
  const proxyIndex = input.indexOf('--proxy')
  if (proxyIndex !== -1) {
    if (!input[proxyIndex + 1] || input[proxyIndex + 1].startsWith('--') || input.lastIndexOf('--proxy') !== proxyIndex) throw new ProxyError()
    explicitProxy = input[proxyIndex + 1]; input.splice(proxyIndex, 2)
  }
  const direct = input.includes('--direct')
  const args = input.filter(arg => arg !== '--direct')
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) { console.log(help); return }
  if (args.length === 1 && args[0] === '--demo') { await demo(); return }
  if (args.length && !(args.length === 1 && args[0] === '--check') && !(args.length === 2 && args[0] === '--resume')) { console.log(help); process.exitCode = 1; return }
  const proxy = chooseProxy(explicitProxy, direct)
  console.log(proxy.url ? `连接方式：${proxy.source === 'windows' ? 'Windows 系统代理' : proxy.source === 'environment' ? '环境代理' : '指定代理'} ${new URL(proxy.url).host}` : '连接方式：直连（没有匹配的 HTTP 代理设置）')
  const api = new SteamLinkApi(createSteamRequester(proxy.url))
  if (args.length === 1 && args[0] === '--check') {
    const serverTime = await api.time()
    console.log(`Steam 公共时间接口可访问；本机与服务端相差约 ${Math.round(Date.now() / 1000 - serverTime)} 秒。未登录或修改任何账户。`)
    return
  }
  if (args.length && !(args.length === 2 && args[0] === '--resume')) { console.log(help); process.exitCode = 1; return }
  console.log(help + '\n')
  let password = '', identity: LoginIdentity | undefined, release: (() => Promise<void>) | undefined
  let checkpointPath: string | undefined
  try {
    let pending: PendingLink | undefined
    if (args[0] === '--resume') {
      checkpointPath = resolve(args[1])
      if ((await stat(checkpointPath)).size > 1024 * 1024) throw new LinkError('checkpoint')
      release = await acquireLock(checkpointPath)
      password = await prompt('检查点密码（不回显）：', true)
      pending = await decryptCheckpoint(await readFile(checkpointPath, 'utf8'), password)
      if (pending.phase === 'requesting') throw new LinkError('uncertain')
    }
    identity = await login(undefined, undefined, undefined, undefined, { proxy: proxy.url })
    if (pending && pending.steamId !== identity.steamId) throw new LinkError('accountMismatch')
    if (!pending) {
      checkpointPath = resolve(outputDir, `${identity.steamId}.pending.json`)
      await mkdir(outputDir, { recursive: true })
      release = await acquireLock(checkpointPath)
      try {
        await stat(checkpointPath)
        console.log(`已有检查点，请使用：bun run steam:link --resume "${checkpointPath}"`)
        return
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
      await waitForInitialization(api, identity, async () => {
        console.log('登录已成功，但账号仍有有效验证器，尚不能初始化另一套密钥。')
        console.log('如果你决定重建共用令牌：在 iPhone 官方 Steam App 中移除旧验证器，暂时不要重新添加，然后回到这里重新检查。移除旧验证器会触发交易/市场限制。')
        console.log('如果要保留旧令牌不变，请退出。助手不会代你解绑。')
        for (;;) {
          const answer = (await prompt('R：保留当前登录并重新检查；Q：退出：')).trim().toUpperCase()
          if (answer === 'Q') return false
          if (answer === 'R') { console.log('正在重新检查验证器状态…'); return true }
          console.log('请输入 R 或 Q。')
        }
      })
      password = await prompt('设置检查点及导出文件密码（至少 8 位，不回显）：', true)
      if (password.length < 8) throw new LinkError('passwordLength')
      if (password !== await prompt('再次输入密码：', true)) throw new LinkError('checkpointPassword')
      console.log('接下来会向 Steam 请求创建新的待激活验证器，可能发送激活短信/邮件。仅在你准备好按共用流程重新绑定时继续。')
      if (await prompt('输入 LINK 确认初始化，其他输入取消：') !== 'LINK') throw new LinkError('cancelled')
      let initial = true
      pending = await initializeLink(api, identity, async value => {
        try { await saveCheckpoint(checkpointPath!, value, password, initial); initial = false }
        catch (error) {
          if (value.phase !== 'requesting') {
            console.error('未能写入待激活密钥。请把下面的加密检查点保存到独立文件，再使用 --resume。不要重新初始化。')
            console.error(await encryptCheckpoint(value, password))
          }
          throw error
        }
      })
      console.log(`加密检查点已写入并验证：${checkpointPath}`)
      console.log(`请在你自己的安全位置保存恢复码：${pending.recoveryCode}`)
    }
    console.log('现在在 iPhone 官方 Steam App 为同一账号完成添加验证器。不要在本助手输入激活短信。')
    console.log('如果需要中途退出，检查点会保留，下次使用 --resume 继续。')
    for (;;) {
      const code = await prompt('输入手机当前 5 位 Steam Guard 码（不回显），或输入 Q 退出：', true)
      if (code.trim().toUpperCase() === 'Q') throw new LinkError('cancelled')
      try { await verifyJointLink(api, identity, pending, code); break }
      catch (error) {
        if (error instanceof LinkError && ['codeMismatch', 'notActive'].includes(error.code)) { console.log(explain(error)); continue }
        throw error
      }
    }
    pending.phase = 'verified'
    await saveCheckpoint(checkpointPath!, pending, password)
    const output = resolve(dirname(checkpointPath!), `steam-${identity.steamId}-${Date.now()}.json`)
    await writeExclusive(output, await exportVerified(pending, password))
    console.log(`核对通过：Steam 已激活，令牌编号一致，手机当前验证码匹配。\n可导入文件：${output}\n在扩展「设置 → 导入」中选择这个 JSON，并输入刚才设置的文件密码。\n请再实际登录 Steam 验证一次；本助手的核对不是 Steam 登录成功证明。`)
  } catch (error) {
    const existing = error instanceof LinkError && error.code === 'existing'
    if (existing) console.log('登录成功。' + explain(error))
    else console.error(explain(error))
    if (checkpointPath) {
      try { await stat(checkpointPath); console.error(`已保留检查点：${checkpointPath}`) } catch { /* No request was persisted. */ }
    }
    process.exitCode = existing ? 0 : 1
  } finally {
    password = ''; if (identity) identity.accessToken = ''
    await release?.().catch(() => {})
  }
}

export async function runCli() { await main().catch(error => { console.error(explain(error)); process.exitCode = 1 }) }
