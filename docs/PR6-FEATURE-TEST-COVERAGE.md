# PR #6 新功能测试覆盖

对象为原 PR HEAD `c232ed8f9c7d6ded11978a429af050dd07365ad5`，加上本地修复 `c0218a1`。本轮补充测试，不修改生产实现。测试使用合成密钥、测试密码、独立存储和临时 Chromium profile。

## 功能与回归映射

| 功能或风险 | 测试及验证内容 |
| --- | --- |
| SHA1 / SHA256 / SHA512，6 / 8 位 | `totp.test.ts` 的 RFC 6238 六个时间向量；`otp-parameter-roundtrip.test.ts` 六种算法/位数组合使用独立 Node HMAC 计算预期码。 |
| 纯 JS SHA-2 fallback、长密钥和跨块消息 | `totp.test.ts` 覆盖无 WebCrypto 时的全部 RFC 6238 向量、64/65/128/129/131/256 字节密钥和 257 字节消息；新增 RFC 4231 第 6 例的 SHA256/SHA512 固定摘要，避免仅依赖同环境实现互相对照。 |
| 自定义 15–120 秒周期 | `otp-import.test.ts`、`vault-compatibility.test.ts` 验证合法/非法范围；`e2e/otp-parameters.pw.ts` 验证导入 45 秒及编辑至 15/120 秒；新往返测试覆盖 15/45/120 秒边界。 |
| 手动选择参数及持久化 | `e2e/sha2-roundtrip.pw.ts` 手动选择 SHA512/8/60，保存、重开、复制、下载二维码、重扫后逐项核对参数和密钥；SHA256/8/45 由 `e2e/otp-parameters.pw.ts` 覆盖。 |
| 每个账户独立倒计时及进度环 | `use-totp-parameters.test.tsx` 检验 15/30/45/120 秒共存、多个边界和独立预期码；浏览器检验 15/30/45/60 秒的倒计时、圆环比例和跨周期验证码。 |
| 参数编辑后立即刷新及异步竞态 | 新 hook 测试分别改变 algorithm/digits/period；编辑和 focus 后，迟到的旧计算不能覆盖新状态；错误账户不阻断正常账户，错误占位符匹配 6/8 位和 Steam。已有 `use-totp.test.tsx` 保留挂起恢复/监听器清理测试。 |
| 页面内联菜单按各账户周期刷新 | `e2e/inline-periods.pw.ts` 验证 15/30/45/60 秒共存和关闭后定时器清理。 |
| 8 位显示、复制和网页填充 | `e2e/sha2-roundtrip.pw.ts` 验证 4+4 分组显示及无空格剪贴板值；`e2e/eight-digit-fill.pw.ts` 使用真实填充引擎验证单框、8 段、前导零、冒泡事件，以及不兼容 6 段拒绝且不部分写入。填充测试只替代 Chrome 标签页消息桥接。 |
| URI、TXT、原生 JSON、二维码往返 | `otp-parameter-roundtrip.test.ts` 对全部六种组合和普通/Steam 歧义/前导冒号名称核对密钥、配置及边界码；真实 PNG 重扫由浏览器测试覆盖；旧商店解析器必须拒绝不支持的参数。 |
| JSON 内嵌 URI 参数优先级 | `otp-import.test.ts` 保留显式 SHA1/6/30 优先于外层字段、缺省值继承及非法参数测试。 |
| Google Authenticator migration | `otp-import.test.ts` 覆盖合法 SHA256/SHA512 枚举与位数；`e2e/add-account-draft.pw.ts` 保留非法 MD5/不完整批次测试，并验证合法 SHA256 保存和重开。 |
| 加密备份保留新参数 | 新单元测试将全部六种组合放在一个加密备份内恢复；浏览器下载 SHA512/8/45 加密备份，清空隔离测试仓库后通过 UI 解锁/导入，重开后核对全部字段。 |
| 保存队列、存储边界及 Steam 固定参数 | `account-interactions.test.tsx` 检验远端三种参数变化被视为冲突；`vault-compatibility.test.ts` 拒绝非法参数/Steam 组合，保留旧记录与参数缺省行为；Steam 原有单元和浏览器流程继续运行。 |
| 新旧客户端和 V1/V2 到达顺序 | `vault-sync-protocol.test.ts` 使用冻结商店源码，覆盖第三设备先 V1 后 V2、旧设备迟到写回、两次迁移及并发新客户端；新 `vault-sync-failures.test.ts` 补充 guard/候选先到均不能自动创建空库。 |
| 迁移中断、读回不一致及配额失败 | 新失败测试验证加密迁移中断、同步与本机读回不一致、改密写失败可分别恢复原密码/新密码分支，以及真实存储适配器的单 key、总配额、多字节计量。现有协议测试保留明文中断和本机/同步失败覆盖。 |
| 冲突恢复、保护状态及导出 | 协议/失败测试核对选中与未选中版本均可独立导出、解密恢复；`e2e/sync-recovery.pw.ts` 验证明文/加密迁移、冲突导出、恢复后导出与 pending 重试。 |
| 多语言与原有商店功能 | `i18n.test.tsx`、`e2e/store-parity.pw.ts` 及完整旧测试继续执行；生产类型检查保证新增翻译键在全部语言中存在。本轮没有对每种翻译做母语语义审校。 |

RFC 固定向量来源：[RFC 6238 Appendix B](https://www.rfc-editor.org/rfc/rfc6238.html#appendix-B)、[RFC 4231 §4.7](https://www.rfc-editor.org/rfc/rfc4231.html#section-4.7)。

## 验证边界

这些测试覆盖上述功能和已识别故障场景，并不穷尽所有输入或证明绝对无缺陷。Chrome storage.sync 无跨设备 CAS，也没有同步完成标志；模拟设备和故障顺序不等于真实 Google 云同步验收。未观察到的旧设备写入仍存在竞争窗口，本机未同步恢复副本依赖原设备保留。详见 [兼容性方案](OTP-PARAMETER-COMPATIBILITY.md)。

远端 PR 未改动；本地测试结果不代表 GitHub Actions 已运行或 PR 已合并。完整命令和结果见 [核对记录](PR6-REVIEW-20261105.md)。
