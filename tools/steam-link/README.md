# Steam 共用令牌本地助手

这个实验性 CLI 用于验证 **电脑与官方 iPhone Steam App 共用一套新令牌** 的流程。它运行在本机终端，不加入扩展发布包，不启动 Web 服务，不增加扩展网络权限。

**它无法复制 iPhone 内已有的密钥。已有有效验证器时，助手只查询状态，允许保留当前登录会话等待你处理后重新检查，也可退出。** 是否重建必须由账户持有人另行决定并在官方 App 操作；移除现有验证器可能带来 15 天交易/市场限制。不要为了试运行助手而先解绑。

## 已验证与未验证

- 自动测试覆盖模拟登录、邮件/设备码、手机批准、超时、已有令牌、初始化失败、检查点恢复、令牌编号和验证码核对、加密导出。
- `--check` 仅访问 Steam 的公共时间接口，用来检测本机到 Steam 的连接。
- **真实账号登录、AddAuthenticator 初始化与 iPhone 共用激活尚需账户持有人实测。** 模拟通过或时间接口可访问不代表真实绑定已成功。

## 准备和运行

在仓库根目录执行（需要已有 Bun、Node.js 22+ 和 npm）：

```powershell
npm ci --prefix tools/steam-link --ignore-scripts
bun run steam:link --check
bun run steam:link
```

使用账号密码登录，再根据 Steam 要求输入邮件／手机验证码或批准登录。失败时显示阶段及安全过滤后的错误码。

Steam 登录密码、登录验证码、检查点密码均在本地终端输入且不回显。不要通过命令行参数、环境变量或聊天传递这些值。登录会话采用 `steam-session` 的 MobileApp 类型，密码和 access/refresh token 不写入检查点或扩展。

`bun run steam:link` 会先编译本地助手，再由 Node.js 执行。登录库的代理连接在当前 Windows/Bun 环境中出现过超时，Node.js 通过同一代理已验证能够完成登录。

连接方式按优先级使用：`--proxy` → HTTP/HTTPS 代理环境变量 → Windows 已启用的手动系统代理 → 直连。环境 `NO_PROXY` 和 Windows 排除列表中匹配 Steam API 的规则会被尊重；PAC 自动配置不在支持范围。登录、时间查询、状态检查和初始化使用同一代理。

```powershell
bun run steam:link --proxy http://127.0.0.1:7890
bun run steam:link --check
# 仅在确实需要绕过代理时：
bun run steam:link --direct
```

出现“登录成功，但已有有效验证器”时，可输入 `R` 重新检查，或 `Q` 正常退出（退出码为 0）。重新检查复用当前密码登录会话，不会发送解绑请求，也不表示取得旧密钥。若会话已失效，助手会报告 Steam 错误并停止，需重新登录；不会自动重发初始化。未创建检查点时不会显示检查点路径。

## 共用绑定步骤

1. 助手通过账号密码及邮件／手机验证登录并查询当前状态。已有有效验证器时进入等待；如果你自行决定重建，可在官方 App 移除旧验证器后回到终端输入 `R`，暂时不要在手机重新添加。状态变为未绑定后，助手继续使用当前会话进入下一步。不调用任何撤销或迁移接口。
2. 在你已决定重新建立令牌、且当前账号没有有效验证器的前提下，设置至少 8 位的文件密码；本地输入 `LINK` 后才会初始化。
3. 助手先加密记录请求意图，再发送一次 `AddAuthenticator`。收到密钥后加密写入并读回验证检查点。**看见“检查点已写入并验证”后，才继续手机激活。** 保存显示的恢复码。
4. 在 iPhone 官方 Steam App 中为同一账号完成添加验证器。遵循 App 的操作指引；不要在助手里输入初始化时收到的激活短信。
5. 输入 App 当前显示的 5 位 Steam Guard 码。助手检查 Steam 状态为已激活、当前 `token_gid` 与初始化时一致，并用服务端时间验证手机验证码。
6. 核对通过后生成加密 JSON。在扩展的 **设置 → 导入** 中选择该文件，输入同一个文件密码。最后实际登录 Steam，验证扩展和手机都能正常使用。

如果手机实际生成了不同的令牌，助手会报“令牌不同”并停止，不会强制导出。输入的码不匹配或尚未激活时，可以重试核对；不会重新初始化。

## 文件和恢复

默认输出目录是仓库下的 `.steam-link/`，已加入 `.gitignore`。

- `<SteamID>.pending.json`：加密检查点，包含待激活密钥、恢复码及令牌编号；**不能直接导入扩展**。
- `steam-<SteamID>-<时间戳>.json`：核对通过后生成的扩展加密备份，仅包含账户名、Steam 类型、验证码密钥和网站，不包含恢复码或登录会话。
- `<检查点>.lock`：防止同一检查点被多个助手同时操作。正常退出会清理；崩溃留下的锁需要在确认所有相关助手进程已退出后手动删除。

中途退出不会撤销 Steam 上的待激活状态，也不会删除加密检查点。继续操作：

```powershell
bun run steam:link --resume ".steam-link\<SteamID>.pending.json"
```


恢复需要文件密码并重新登录相同 Steam 账号。即使检查点曾核对成功，重新导出前也会再次核对。

如果检查点仍处于 `requesting`，说明没有可靠地保存到初始化响应。**此时不会自动重发请求**；先在官方 App 核实状态。助手不能从请求意图恢复未收到的密钥。

如收到密钥后因磁盘问题无法保存，终端会输出一份**加密检查点**用于应急保存，可保存为独立文件后通过 `--resume` 恢复；不会输出明文密钥或会话令牌。

## 验证命令

```powershell
bun run steam:link:test
bun run steam:link:check
bun run steam:link --demo
```

`--demo` 完全离线，生成的账户、密钥、验证码和文件密码均为合成示例，不对应真实 Steam 账户。

## 参考和边界

- [ASF Joint authenticator](https://github.com/JustArchiNET/ArchiSteamFarm/wiki/Two-factor-authentication#joint-authenticator)：初始化待激活令牌，手机完成绑定后核对验证码。
- [steamguard-cli AccountLinker](https://github.com/dyc3/steamguard-cli/blob/master/steamguard/src/accountlinker.rs)：初始化参数、version 2 和状态检查。
- [steam-session](https://github.com/DoctorMcKay/node-steam-session)：维护中的 Steam 登录库；独立依赖固定为 1.9.4，锁文件位于本目录。

网络仅用于登录及 Steam 官方 API。助手未实现 `RemoveAuthenticator`、短信迁移、`FinalizeAddAuthenticator` 或交易确认。它在共用模式下等待官方 App 激活，不替代手机的绑定操作。
