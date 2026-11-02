# 商店功能覆盖检查（2026-11-02）

目标：当前 master 保留商店已有功能，优化不能造成账户丢失、验证码类型变化或基本操作退化。

基准为扩展 ID `dhipejmoajhjflafhbibojfoeogbmjgf` 的官方公开 2.3.8 CRX。下载包 SHA-256：`a23e02a6c7057032119193a424916bcfa29ca66715b0279af0448284540bd79a`。提交 `a9be25f` 在同一依赖环境下复现了全部 23 个程序与资源文件；Manifest 仅有商店添加的 update_url 差异，商店另有验证元数据。

## 修复的兼容缺口

- [x] 旧版可用的非典型长度 Base32 继续按原字节生成 TOTP，不被误识别为 Steam Base64；普通与加密备份都保留这些账户。
- [x] 普通与加密原生备份保留精确账户名，避免 `" Demo "` 与 `"Demo"` 被合并。外部格式继续整理名称。
- [x] 兼容传统 Steam 标签／发行者、大小写 encoder 与旧 digits=6 标记，保持五位码。新导出的普通 `Steam demo` TOTP 不使用含混的 Steam 发行者标记。
- [x] 分段验证码可通过标准 HTML 标题识别，同时拒绝将五位码部分填入六格或将字母码填入数字框。
- [x] 无效二维码或不支持的链接保留添加表单草稿；关闭重开后旧识别结果不能污染新表单。

## 功能与验收依据

| 商店现有功能 | master 中的保留或升级 | 验证依据 |
| --- | --- | --- |
| 首次添加、名称与网站编辑、重复检测、删除确认 | 保留；保存中阻止冲突操作，删除失败保留确认框 | store-parity、account-interactions、browser regression |
| 上传二维码、粘贴图片、粘贴 URI、拖拽图片 | 四种入口保留；增加多文件和 Google 迁移 | store-parity 四种实际录入；otp-import |
| 普通与 Steam 验证码、30 秒倒计时 | 保留；签名跨周期与恢复窗口刷新 | totp、steam、critical-flows、account-interactions |
| 单击填充／复制回退 | 保留；严格检查分段长度和输入类型，解锁后恢复已有网页 | browser regression、vault-background、site-context-menu、critical-flows |
| 排序与动画 | 保留；连续排序合并串行保存、失败恢复 | critical-flows、account-interactions |
| 右键编辑、删除、查看二维码 | 保留；二维码入口不触发复制 | store-parity、critical-flows、browser regression |
| 下载二维码 PNG、再次扫描迁移 | 保留；Steam 账户完整名称往返 | store-parity 下载与重扫；steam |
| 普通 JSON 备份导出与导入 | 保留；增加逐账户预览、选择和混合导入 | store-parity 下载后恢复空库并逐字段比较；otp-import |
| 加密备份、错误密码保护、恢复 | 保留；备份密码不受后续主密码修改影响 | store-parity 加密下载／恢复；vault、import-preview |
| 主密码开启、锁定、解锁、修改、关闭保护 | 保留原有加密格式和验证流程 | vault、vault-background |
| Chrome 同步、旧数据迁移、冲突与写入失败保护 | 保留；原始名称、密钥语义与类型兼容 | vault、storage、storage-errors、site-access |
| 明／暗／跟随系统主题 | 保留；本机偏好、系统变化和写入失败恢复 | critical-flows、account-interactions |
| 12 语言、语言持久化、隐藏语言重置 | 保留；原生语言选择和可滚动设置 | store-parity、vault 翻译检查；源码与隔离界面检查 |
| 网站授权、输入框内联菜单、撤销授权 | 保留；长授权列表可滚动，Steam API 授权不授予网页填充 | site-access、site-context-menu、browser regression |
| Steam 浏览器登录、检查点、手机核对与保存 | 保留商店接口和流程；额外提供独立本地助手 | steam-binding、steam-binding-request、steam-background、steam-binding.pw.ts、助手测试 |
| 离线生成、存储权限、12 种商店语言和安装资源 | 保留；版本仍由 package.json 生成 | 生产构建、site-access、vault；Manifest 与包文件核对 |

## 八项审查问题修复

本轮从 `5ce0c34` 开始修复，不迁移账户记录，不更改加密格式，不读取或改写日常浏览器的数据。

| 问题 | 修复与保留的行为 | 回归检查 |
| --- | --- | --- |
| 排队排序借用外部 revision 覆盖账户 | 保存响应必须与本次提交的账户数据一致；不一致就停止旧队列、重新加载最新数据；正常连续排序仍合并串行保存 | account-interactions 覆盖外部新增、编辑、删除和重试；save-sync-race 在真实扩展后台通知与回读之间注入同步新增 |
| 手动 Steam Base64 被当作 Base32 | 手动选择密钥格式，按所选格式解码；Base32、Base64 均保留；URI/QR 已知来源使用规范 Base32 | review-ui-regressions 覆盖含混密钥两种显式格式与 URI/QR 来源 |
| `Steam:alice` 普通 TOTP 二维码改码 | 仅含混名称的新普通 QR 加 `encoder=totp`；原名称、类型、密钥和验证码完整往返；常规 QR 和旧 Steam 输入继续兼容 | steam、otp-import；含混名称码值与常规无 encoder 输出检查 |
| 重复发行者名称被缩短、误判重复 | 显式 `issuer:` 只剥一层并保留完整账户名称 | otp-import、steam 覆盖重复前缀、不同密钥身份和导入去重 |
| 用户名／邮编被误填 | 登录邻近和数字长度不再独立判定 OTP；标准标记、明确语义和局部 OTP 标题配合数字形状仍可识别 | browser regression 的用户名／邮编负例及真实单框、标题、分段、Steam 和输入事件阳性 |
| 旧提交清空新会话草稿 | 提交回调检查会话 generation；重新打开恢复可编辑状态；旧请求仍持久化；普通 revision 更新不关闭新的添加窗口 | review-ui-regressions 覆盖旧验证完成、已发写入完成及另一窗口草稿 |
| Steam 响应体读取无限等待 | 15 秒截止覆盖响应头与正文解析，所有路径清理定时器，超时释放后续串行操作 | steam-api-timeout 覆盖挂起正文、正文失败、后续请求、错误分类与定时器清理 |
| 系统语言首次与重置后重开失效 | 区分无设置与显式中文选择；首次和重置后跟随系统，既有语言选择继续优先 | i18n、storage、review-ui-regressions 的首次英文、显式中文、重置与重开 |

含混普通 TOTP 名称的新二维码需要接收端支持明确的 `encoder=totp`。旧商店版只接受其已知的 encoder 值，因此这类名称跨版本迁移使用 JSON 备份；常见普通名称的新二维码不添加该标记，继续可供旧商店版读取。

## 验证范围

- 自动化浏览器测试加载实际构建的扩展，使用独立临时配置、合成账户、真实二维码图片和下载文件。结束后删除临时配置。
- 同步、额度、网络失败与 Steam 绑定使用受控模拟测试。没有操作日常 Chrome 账户或真实 Steam 令牌；真实跨设备同步与 Steam 官方接口成功率不由这些测试证明。
- 商店与 master 目前都标为 2.3.8；本次覆盖修复不是商店发布。后续上传需递增版本号。
- 上轮 `5ce0c34` 验证：152 项单元／组件测试、31 项助手测试、19 项浏览器测试、生产构建及两项类型检查通过。
- 本轮八项修复验证：165 项单元／组件测试、31 项助手测试、27 项 Chromium 扩展／浏览器测试、生产构建及两项类型检查全部通过。浏览器测试仍包含商店四种录入与普通／加密备份导出恢复，并新增外部同步保存竞态、Steam 两种密钥格式、提交会话隔离及系统语言回归。
