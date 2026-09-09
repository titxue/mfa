# TOTP 生成器 Chrome 扩展

<div align="center">

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dhipejmoajhjflafhbibojfoeogbmjgf?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)
[![GitHub release](https://img.shields.io/github/v/release/titxue/mfa?label=GitHub)](https://github.com/titxue/mfa/releases)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/dhipejmoajhjflafhbibojfoeogbmjgf)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)
[![GitHub stars](https://img.shields.io/github/stars/titxue/mfa?style=social)](https://github.com/titxue/mfa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**现代化的双因素认证 (2FA) 解决方案**

基于时间的一次性密码 (TOTP) 生成器，采用 React 19 + TypeScript + Bun 构建。
支持离线生成验证码、网站填充、主密码保护、加密备份和 **12 种语言**。账户可通过 Chrome 同步。

[项目官网](https://mfa.xuejy.com/zh/) · [English](README.en.md)

[安装](#安装) • [功能](#功能特性) • [使用](#使用指南) • [开发](#开发) • [国际化](#国际化)

</div>

---

## ✨ 功能特性

- 🔐 **TOTP 验证码生成** - 30秒间隔、RFC 6238标准、实时倒计时进度环
- 📷 **二维码扫描** - 图片上传识别、粘贴/拖拽上传、自动填充、离线处理
- 📤 **二维码导出** - 双击账户卡片生成二维码、支持下载 PNG 图片、便于跨设备迁移
- 🎯 **智能自动填充** - 一键填充到网页、按设置回退复制；授权网站后可使用输入框旁的账户菜单
- 🎨 **拖拽排序** - 自由调整账户顺序、流畅动画效果
- 💾 **数据管理** - Chrome 账号同步、普通/加密 JSON 备份、导入数量预览、重复检测
- 🌍 **12 种语言支持** - 中文简繁、英语、西班牙语、法语、葡萄牙语、德语、俄语、阿拉伯语、日语、韩语、印地语
- 🎨 **现代化 UI** - shadcn/ui 设计系统、流畅动画、响应式布局
- 🔒 **隐私安全** - 验证码和二维码在本地处理；开启主密码后加密账户，未开启时账户以明文形式写入 Chrome 同步存储

---

## 🚀 安装

### Chrome Web Store（推荐）

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dhipejmoajhjflafhbibojfoeogbmjgf?label=Install&style=for-the-badge&logo=googlechrome)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)

### 开发者模式

```bash
git clone https://github.com/titxue/mfa.git
cd mfa
bun install
bun run build
# Chrome → chrome://extensions/ → 开发者模式 → 加载已解压的扩展 → 选择 dist 目录
```

---

## 📖 使用指南

### 添加账户

**二维码扫描（推荐）**
1. 点击 "+" 按钮
2. 点击"扫描二维码"
3. 上传包含 TOTP 二维码的图片
4. 自动识别后检查账户信息，点击“保存”

也支持粘贴/拖拽二维码图片，或粘贴 `otpauth://totp/` URI。当前仅支持 **SHA1、6 位数字、30 秒周期**；不支持的参数会明确提示。

**手动输入**
1. 点击 "+" 按钮
2. 输入账户名称和 Base32 密钥
3. 点击"保存"

### 使用验证码

- **自动填充**：左键点击账户卡片
- **复制回退**：在设置中启用后，填充失败时复制到剪贴板
- **删除账户**：右键点击账户卡片

### 数据管理

- **普通备份导入**：选择 JSON → 查看文件中的账户数量 → 确认导入。重复账户会跳过。
- **加密备份导入**：选择 JSON → 输入备份密码 → “解密并预览” → 查看数量 → 确认导入。错误密码或损坏文件不会导入。
- **导出**：开启保护后默认加密导出；可验证当前密码后选择明文导出。
- **语言**：设置中选择 12 种语言之一。

### 密码保护与同步

在设置中开启密码保护，设置至少 8 位的主密码。账户名称、密钥和网站信息一起加密。解锁状态仅保留在本机浏览器会话中；关闭弹窗不会锁定，浏览器重启后需要重新解锁，也可以手动锁定。

另一台设备收到加密记录后需使用同一密码解锁。离线或尚未同步的设备仍可能保留旧明文副本，开启保护不能立即远程锁定这些副本。当前不保证跨设备同时编辑无冲突，请避免多设备同时修改账户。

修改密码和关闭保护需要当前密码；关闭保护后恢复明文同步。忘记密码无法恢复加密数据，旧备份仍需导出时的密码。详见[密码保护与同步](docs/PASSWORD_PROTECTION.md)、[网站授权](docs/SITE_ACCESS.md)。

---

## 💡 为什么选择

| 特性 | 本扩展 | 说明 |
|------|--------|------|
| 🎨 UI 设计 | shadcn/ui + Radix UI | 现代化组件库 |
| 🌍 多语言 | 12 种语言 | 中英日韩法德西俄阿葡印 + 繁中 |
| 📷 二维码 | 上传/粘贴/拖拽 | 多种方式支持 |
| 🚀 开发构建 | Bun + 文件监听 | 变更后自动重建 |
| 📦 技术栈 | React 19 + TypeScript | 最新技术 |
| 📝 类型安全 | 100% TypeScript | 编译时检查 |
| 🔧 可扩展 | 自动化架构 | 添加语言超简单 | 

---

## 🛠️ 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS
- **UI 库**：shadcn/ui（基于 Radix UI）
- **构建**：Bun + Tailwind CSS
- **核心**：jsQR、lucide-react、sonner
- **标准**：Chrome Extension Manifest V3

---

## 🌍 国际化

### 支持的语言（12 种）

<div align="center">

| 区域 | 语言 | 代码 |
|------|------|------|
| 🇨🇳 | 中文（简体） | zh-CN |
| 🇹🇼 | 中文（繁體） | zh-TW |
| 🇺🇸 | English | en-US |
| 🇪🇸 | Español | es-ES |
| 🇫🇷 | Français | fr-FR |
| 🇧🇷 | Português | pt-BR |
| 🇩🇪 | Deutsch | de-DE |
| 🇷🇺 | Русский | ru-RU |
| 🇸🇦 | العربية | ar-SA |
| 🇯🇵 | 日本語 | ja-JP |
| 🇰🇷 | 한국어 | ko-KR |
| 🇮🇳 | हिन्दी | hi-IN |

</div>

### 特性

- ✅ **自动检测** - 根据浏览器语言自动切换
- ✅ **手动切换** - 设置页面可选择任意语言
- ✅ **完整翻译** - 所有 UI 文本 100% 翻译
- ✅ **类型安全** - TypeScript 编译时检查

### 添加新语言

主界面语言通过注册表加载：

1. **创建翻译文件** `src/locales/xx-XX.ts`
2. **注册语言** 在 `src/locales/index.ts` 添加配置

详见：[添加新语言指南](docs/ADD_NEW_LANGUAGE.md)

语言选择 UI 根据注册表生成。安全文案、页面内联菜单与商店元信息仍需分别补齐。

---

## 🔧 开发

### 环境要求
- Bun 1.2+
- Chrome 102+

### 开发命令

```bash
bun install              # 安装依赖
bun run dev              # 监听源码、静态资源和构建配置变化后重建
bun run build            # 生产构建
bun run type-check       # 类型检查
bun run test             # 自动化测试
bun run generate-icons   # 生成图标
```

### 项目结构

```
src/
├── components/          # React 组件
├── contexts/           # React Context (I18n)
├── hooks/              # 自定义 Hooks
├── locales/            # 语言翻译文件
│   ├── index.ts       # 语言注册中心（添加新语言在此）
│   ├── zh-CN.ts       # 中文（简体）
│   ├── en-US.ts       # English
│   └── ...            # 其他语言
├── utils/              # 工具函数
└── types/              # TypeScript 类型
```

### 添加新语言

详细指南：[docs/ADD_NEW_LANGUAGE.md](docs/ADD_NEW_LANGUAGE.md)

**快速步骤**：
1. 创建 `src/locales/xx-XX.ts` 翻译文件
2. 在 `src/locales/index.ts` 中注册（7行配置）
3. 运行 `bun run build`

同时补齐 `src/locales/security.ts`、网页菜单文案和 `build.ts` 的商店名称/描述映射。

`bun run dev` 合并连续文件变更并串行重建，构建失败后继续监听；生成的 `src/version.ts` 和 `dist/` 不会触发循环构建。重建后仍需在 Chrome 扩展管理页点击“重新加载”。

账户读写由后台 `VaultService` 统一管理，Popup 通过消息请求操作；网页脚本只获取授权范围内的账户摘要与验证码，不获取密钥。

官网位于 `website/`：使用 `npm install` 安装依赖，`npm run build` 构建，已授权 Cloudflare 的环境可执行 `npm run deploy` 发布。版本从根目录 `package.json` 自动同步。

### 权限说明
- `storage` - 本地/同步存储
- `activeTab` - 自动填充
- `scripting` - 页面脚本注入
- `contextMenus` - 网站授权右键菜单
- 可选 `http://*/*` / `https://*/*` 主机权限 - 用户逐站授权页面内联填充

---

## ❓ 常见问题

<details>
<summary><strong>如何备份数据？</strong></summary>

开启密码保护后默认导出加密 JSON；明文导出需要验证当前密码。未开启保护时导出明文 JSON，文件包含账户密钥。加密备份需要导出时的密码才能恢复。
</details>

<details>
<summary><strong>验证码不准确？</strong></summary>

检查系统时间是否准确（TOTP基于时间）。
</details>

<details>
<summary><strong>自动填充失败？</strong></summary>

部分网站使用特殊输入框。开启“填充失败时复制”后可回退剪贴板；页面内联菜单需要先授予该网站访问权限。
</details>

<details>
<summary><strong>数据会随 Google 账号同步吗？</strong></summary>

默认使用 `chrome.storage.sync`。两台设备需使用相同扩展 ID、同一 Chrome 账号并开启扩展数据同步。关闭同步或离线时数据保存在本机，联网并启用同步后再同步。

- 不同扩展 ID 的数据相互独立；仅在 Manifest 中使用同一公钥，才能让不同路径加载的开发版本保持同一 ID。
- 未开启扩展密码保护时，账户记录未经过扩展加密。
- 当前所有账户保存在单条记录中，受单项约 8 KB 限制；同步总配额约 100 KB。超限会提示错误，不会截断账户。
- 同步有延迟；本机保存成功不代表其他设备已经收到更新。
</details>

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

**开发规范**
- 使用 TypeScript，确保类型安全
- 遵循 React Hooks 最佳实践
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)
- 不要提交 console.log

**贡献类型**

1. **翻译贡献** - 帮助添加新语言或改进现有翻译
   - 参考 [添加新语言指南](docs/ADD_NEW_LANGUAGE.md)
   - 请同时检查安全文案、网页菜单和商店元信息。

2. **功能开发** - 添加新功能或改进现有功能
   - 提交前请先创建 Issue 讨论
   - 确保通过 TypeScript 类型检查和构建

3. **Bug 修复** - [报告 Bug](https://github.com/titxue/mfa/issues/new)
   - 提供问题描述、复现步骤、浏览器版本

4. **文档改进** - 完善文档、修正错误、添加示例

---

## 📋 更新日志

### v2.2.0

- 主密码保护、加密账户存储、手动锁定与加密备份。
- 网站按需授权与页面内联验证码菜单。
- 普通备份显示账户数量；加密备份解密预览后再确认导入。
- 拒绝不支持的 TOTP 参数，避免静默生成错误验证码。
- 设置保存失败时恢复原值并提示；开发模式支持真实文件监听。
- 更新中英文官网与使用指南。

### v2.1.0 (2026-01-29)
- ✨ **国际化重大更新** - 从 2 种语言扩展到 12 种语言
  - 新增：繁体中文、西班牙语、法语、葡萄牙语、德语、俄语、阿拉伯语、日语、韩语、印地语
  - 自动检测浏览器语言并切换
  - 支持区域变体（如 es-MX、fr-CA、pt-PT 等）
- 🏗️ **语言架构优化** - 自动化语言注册机制
  - 添加新语言从 5 个文件减少到 2 个文件
  - 类型自动生成，UI 自动更新
  - 单一配置数据源，消除重复代码
  - 详见 [架构文档](docs/LANGUAGE_ARCHITECTURE.md)

### v2.0.5 (2026-01-07)
- ✨ 新增二维码导出功能 - 双击账户卡片即可生成/下载二维码
- ✨ 优化粘贴/拖拽上传体验 - 支持粘贴图片和 otpauth:// URI 文本
- 🐛 修复拖拽排序导致单击复制失效的问题
- ⚡️ 优化拖拽激活阈值（需移动 5px）避免误触

### v2.0.1 (2025-12-21)
- 🐛 修复二维码解析错误
- ✨ 统一版本号管理
- ✨ 添加图标生成系统
- 🎨 优化设置页面 UI
- 🧹 清理 Git 仓库和日志语句
- 📝 完善文档

### v2.0.0 (2025-12)
- ✨ 全新架构：React 19 + TypeScript + Bun
- ✨ 二维码扫描功能
- ✨ shadcn/ui 设计系统
- ✨ Manifest V3 标准
- ⚡️ 构建速度 < 200ms

---

## 📄 许可证

MIT License

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star！**

[报告 Bug](https://github.com/titxue/mfa/issues) • [功能建议](https://github.com/titxue/mfa/issues) • [贡献代码](https://github.com/titxue/mfa/pulls)

Made with ❤️ by [titxue](https://github.com/titxue)

</div>
