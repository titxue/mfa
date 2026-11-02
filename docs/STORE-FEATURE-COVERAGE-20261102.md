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

## 验证范围

- 自动化浏览器测试加载实际构建的扩展，使用独立临时配置、合成账户、真实二维码图片和下载文件。结束后删除临时配置。
- 同步、额度、网络失败与 Steam 绑定使用受控模拟测试。没有操作日常 Chrome 账户或真实 Steam 令牌；真实跨设备同步与 Steam 官方接口成功率不由这些测试证明。
- 商店与 master 目前都标为 2.3.8；本次覆盖修复不是商店发布。后续上传需递增版本号。
- 验证通过：`bun run type-check`、`bun run steam:link:check`；`bun run test` 中 152 项单元／组件测试、31 项助手测试、生产构建和 19 项 Chromium 扩展／浏览器测试全部通过。浏览器测试包含原有 8 项 DOM 检查，并增加 12 项商店功能与草稿保护检查。
