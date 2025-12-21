# TOTP 生成器 Chrome 扩展

<div align="center">

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dhipejmoajhjflafhbibojfoeogbmjgf?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/dhipejmoajhjflafhbibojfoeogbmjgf)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)
[![GitHub stars](https://img.shields.io/github/stars/titxue/mfa?style=social)](https://github.com/titxue/mfa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**现代化的双因素认证 (2FA) 解决方案**

基于时间的一次性密码 (TOTP) 生成器 Chrome 扩展，采用 React 19 + TypeScript + Bun 技术栈构建。支持二维码扫描、自动填充验证码、完全离线工作、数据安全本地存储。

[安装使用](#安装方法) • [功能特性](#核心功能) • [开发文档](#开发说明) • [贡献指南](#贡献)

</div>

---

## ✨ 核心功能

### 🔐 TOTP 验证码生成
- 标准 30 秒间隔的 6 位数字验证码
- 实时可视化倒计时进度环（颜色编码）
- 符合 RFC 6238 标准，使用 Web Crypto API
- 支持 Base32 编码密钥格式

### 📷 二维码扫描
- **图片上传扫描** - 本地上传二维码图片自动识别
- **自动填充表单** - 解析 `otpauth://` URI 自动填充
- **完全离线** - 无需联网，本地处理
- **广泛兼容** - 支持 Google Authenticator、Authy 等主流应用

### 🎯 智能自动填充
- **一键填充** - 左键点击卡片自动填充到网页输入框
- **智能回退** - 填充失败自动复制到剪贴板
- **快速删除** - 右键点击删除账户（带确认）

### 💾 数据管理
- Chrome Storage API 本地安全存储
- JSON 格式导入导出
- 重复账户自动检测
- 应用状态持久化

### 🌍 多语言 & 现代化 UI
- 中文（简体）和 English 双语支持
- 采用 shadcn/ui 设计系统
- 流畅的动画效果和响应式布局
- Toast 消息提示和友好的空状态

---

## 🖼️ 界面预览

> **注意**：待添加界面截图
> - 主界面：账户列表、验证码显示、进度环
> - 二维码扫描：上传图片、自动识别
> - 设置页面：语言切换、导入导出、关于

---

## 🚀 快速开始

### 从 Chrome Web Store 安装（推荐）

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dhipejmoajhjflafhbibojfoeogbmjgf?label=Chrome%20Web%20Store&style=for-the-badge&logo=googlechrome)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)

访问 [Chrome Web Store - TOTP Authenticator](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf) 直接安装

### 开发者模式安装

```bash
# 1. 克隆仓库
git clone https://github.com/titxue/mfa.git
cd mfa

# 2. 安装依赖
bun install

# 3. 构建扩展
bun run build

# 4. 加载到 Chrome
# 访问 chrome://extensions/
# 启用"开发者模式" → "加载已解压的扩展程序" → 选择 dist 目录
```

---

## 📖 使用指南

### 添加账户

**方式 1：二维码扫描（推荐）**
1. 点击右上角 "+" 按钮
2. 点击"扫描二维码"
3. 上传包含 TOTP 二维码的图片
4. 自动识别并填充账户信息
5. 点击"保存"

**方式 2：手动输入**
1. 点击右上角 "+" 按钮
2. 输入账户名称（如：GitHub）
3. 输入 Base32 格式密钥
4. 点击"保存"

### 使用验证码

- **自动填充**：左键点击账户卡片，验证码自动填充到当前网页
- **手动复制**：如果自动填充失败，验证码会自动复制到剪贴板

### 数据管理

- **导出**：设置 → 账户管理 → 导出（JSON 格式）
- **导入**：设置 → 账户管理 → 导入（自动跳过重复账户）
- **语言切换**：设置 → 语言设置 → 选择"中文"或"English"

---

## 💡 为什么选择这个扩展

| 特性 | 本扩展 | 其他扩展 |
|------|--------|----------|
| 🎨 现代化 UI | ✅ shadcn/ui + Radix UI | ⚠️ 传统样式 |
| 📷 二维码扫描 | ✅ 图片上传扫描 | ❌ 或需要摄像头权限 |
| 🚀 构建速度 | ✅ Bun < 200ms | ⚠️ Webpack/Vite 1-5s |
| 📦 技术栈 | ✅ React 19 + TS + Bun | ⚠️ 旧版框架或 Vanilla JS |
| 🔒 隐私安全 | ✅ 完全离线，本地存储 | ✅ 大部分相同 |
| 🌍 多语言 | ✅ 中英双语 | ⚠️ 部分支持 |
| ♿ 无障碍 | ✅ 完整支持 | ⚠️ 部分支持 |
| 📝 TypeScript | ✅ 100% 类型覆盖 | ⚠️ 部分或无 |

---

## 🛠️ 技术架构

### 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS 3.4
- **UI 库**：shadcn/ui（基于 Radix UI）
- **构建工具**：Bun（运行时 + 包管理器 + 构建器）
- **核心库**：jsQR（二维码）、lucide-react（图标）、sonner（Toast）
- **扩展标准**：Chrome Extension Manifest V3

### 项目结构

<details>
<summary>点击展开查看详细结构</summary>

```
mfa/
├── src/
│   ├── components/          # React 组件
│   │   ├── ui/             # shadcn/ui 基础组件
│   │   ├── AccountItem.tsx      # 账户卡片
│   │   ├── AccountList.tsx      # 账户列表
│   │   ├── AddAccountModal.tsx  # 添加账户（含二维码扫描）
│   │   ├── EmptyState.tsx       # 空状态
│   │   ├── Header.tsx           # 头部
│   │   ├── ProgressRing.tsx     # 进度环
│   │   └── SettingsModal.tsx    # 设置
│   ├── contexts/           # React Context
│   │   └── I18nContext.tsx     # 国际化
│   ├── hooks/              # 自定义 Hooks
│   │   ├── useAccounts.ts      # 账户管理
│   │   └── useTOTP.ts          # TOTP 生成
│   ├── locales/            # 国际化
│   │   ├── zh-CN.ts           # 中文
│   │   └── en-US.ts           # 英文
│   ├── utils/              # 工具函数
│   │   ├── totp.ts            # TOTP 算法（RFC 6238）
│   │   ├── storage.ts         # Chrome Storage API
│   │   ├── import-export.ts   # 导入导出
│   │   ├── page-analyzer.ts   # 自动填充
│   │   ├── qr-parser.ts       # 二维码解析
│   │   └── cn.ts              # 样式工具
│   ├── popup/              # Popup 页面
│   ├── content-script.ts   # 内容脚本
│   └── version.ts          # 自动生成的版本文件
├── public/
│   ├── manifest.json       # Chrome 扩展配置
│   └── icons/              # 扩展图标
├── .claude/
│   └── CLAUDE.md           # 详细开发文档
├── build.ts                # Bun 构建脚本
├── generate-icons.ts       # 图标生成脚本
└── package.json            # 依赖配置
```

</details>

> 📚 **查看详细技术文档**：[.claude/CLAUDE.md](.claude/CLAUDE.md) - 包含完整的架构说明、实现细节、开发工作流等

---

## 🔧 开发说明

### 环境要求

- **Bun 1.2+** - 运行时和构建工具
- **Chrome 88+** - 支持 Manifest V3

### 开发命令

```bash
# 安装依赖
bun install

# 开发模式（监听文件变化）
bun run dev

# 生产构建
bun run build

# 类型检查
bun run type-check

# 生成扩展图标
bun run generate-icons
```

### 构建流程

1. 读取 `package.json` 获取版本号
2. 生成 `src/version.ts`（自动同步版本）
3. 使用 Bun.build() 编译 TypeScript + React
4. 使用 Tailwind CLI 编译 CSS
5. 处理 HTML 并注入样式
6. 更新 `manifest.json` 版本号
7. 复制图标资源到 `dist/icons/`

### 权限说明

扩展需要以下权限（Manifest V3）：
- `storage` - 本地数据存储
- `activeTab` - 当前标签页访问（自动填充）
- `scripting` - 内容脚本注入（页面操作）

---

## ❓ 常见问题 (FAQ)

<details>
<summary><strong>如何备份我的账户数据？</strong></summary>

进入设置 → 账户管理 → 导出，会下载一个 JSON 文件。请妥善保管此文件，因为它包含未加密的密钥。

</details>

<details>
<summary><strong>验证码不准确怎么办？</strong></summary>

1. 检查系统时间是否准确（TOTP 基于时间）
2. 确认密钥是否正确输入
3. 尝试删除账户后重新添加

</details>

<details>
<summary><strong>如何迁移到新设备？</strong></summary>

1. 在旧设备导出账户数据（设置 → 导出）
2. 在新设备安装扩展
3. 导入之前导出的 JSON 文件（设置 → 导入）

</details>

<details>
<summary><strong>支持哪些服务？</strong></summary>

支持所有基于 TOTP (RFC 6238) 标准的服务，包括但不限于：
- GitHub, GitLab, Bitbucket
- Google, Microsoft, Apple
- AWS, Cloudflare
- Discord, Slack, Telegram
- 等几乎所有支持 2FA 的服务

</details>

<details>
<summary><strong>数据安全吗？</strong></summary>

✅ 完全安全：
- 所有数据存储在本地（Chrome Storage API）
- 不需要网络连接即可工作
- 二维码解析完全在本地完成
- 不收集、不上传任何用户数据
- 符合 RFC 6238 标准的 TOTP 算法

⚠️ 注意：导出的 JSON 文件包含未加密的密钥，请妥善保管

</details>

<details>
<summary><strong>为什么自动填充失败？</strong></summary>

可能的原因：
1. 网页使用了特殊的输入框（如 Shadow DOM）
2. 网站阻止了内容脚本注入
3. 输入框未正确识别

解决方法：自动填充失败时，验证码会自动复制到剪贴板，手动粘贴即可。

</details>

---

## 🔒 安全性说明

- ✅ 所有数据存储在本地（Chrome Storage API）
- ✅ 不需要网络连接即可工作
- ✅ 二维码解析完全在本地完成
- ✅ 不收集、不上传任何用户数据
- ✅ 符合 RFC 6238 标准的 TOTP 算法实现
- ⚠️ 导出的 JSON 文件包含未加密的密钥，请妥善保管

---

## 🌐 浏览器兼容性

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ 其他基于 Chromium 的浏览器

---

## 🤝 贡献

欢迎贡献代码、提交 Issue 和 Pull Request！

### 如何贡献

1. **Fork 本仓库**
2. **创建功能分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **创建 Pull Request**

### 开发规范

- 使用 TypeScript，确保类型安全
- 遵循 React Hooks 最佳实践
- 代码风格遵循 ESLint 配置
- 提交信息使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 不要提交 console.log 等调试语句

### 提交 Bug

如果发现 Bug，请 [创建 Issue](https://github.com/titxue/mfa/issues/new) 并提供：
- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 浏览器版本和扩展版本
- 截图（如果适用）

---

## 🗺️ 路线图

### 计划中的功能

- [ ] 支持更多 TOTP 算法（SHA-256, SHA-512）
- [ ] 支持自定义验证码位数
- [ ] 支持自定义时间间隔
- [ ] 浏览器内置摄像头扫描二维码
- [ ] 数据加密导出
- [ ] 云同步（可选）
- [ ] 移动端适配（PWA）
- [ ] 更多主题选择
- [ ] 账户分组功能
- [ ] 搜索和过滤功能

### 改进方向

- 性能优化
- 更好的无障碍支持
- 更多语言支持
- 用户体验改进

---

## 📋 更新日志

### v2.0.1 (2025-12-21)
- 🐛 **修复二维码解析错误** - 修正 FileReader 类型检查逻辑 (`typeof imageData !== 'string'`)
- ✨ **统一版本号管理** - 实现单一数据源（package.json）+ 自动同步
- ✨ **添加图标生成系统** - 创建 generate-icons.ts 脚本，使用 canvas 生成扩展图标
- 🎨 **优化关于部分 UI** - 使用 Card + Icon + Button 设计，添加 GitHub 链接
- 🔗 **添加 GitHub 链接** - 在 manifest.json、package.json、设置页面添加仓库链接
- 🧹 **清理 Git 仓库** - 删除 dist/、CLAUDE.md、GEMINI.md、popup.zip、bun.lock、.cursor/ 等不必要文件
- 🧹 **清理日志语句** - 删除所有 console.log/error/warn（共 12 处），代码更整洁
- 🔧 **更新 .gitignore** - 添加 bun.lock、.cursor/、.claude/ 等规则
- 📝 **优化 README** - 添加 Chrome Web Store 徽章和链接，完善文档结构

### v2.0.0 (2025-12)
- ✨ **全新架构** - 从 vanilla JS 迁移到 React 19 + TypeScript + Bun
- ✨ **二维码扫描** - 集成 jsQR 库，支持图片上传扫描
- ✨ **shadcn/ui** - 采用现代化设计系统（基于 Radix UI）
- ✨ **Manifest V3** - 升级到最新 Chrome 扩展标准
- ⚡️ **极速构建** - Bun 构建速度 < 200ms
- 🎨 **全新 UI** - 现代化界面设计，流畅动画效果
- 🔧 **组件化重构** - 完全组件化的代码架构

### v1.0.0 (2024)
- 🎉 **首次发布** - 基础 TOTP 功能
- 🔐 TOTP 验证码生成
- 🎯 自动填充验证码
- 💾 数据导入导出

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [shadcn/ui](https://ui.shadcn.com) - 精美的 UI 组件库
- [Radix UI](https://www.radix-ui.com) - 无头组件库
- [Bun](https://bun.sh) - 超快的 JavaScript 运行时
- [jsQR](https://github.com/cozmo/jsQR) - 纯 JavaScript 二维码库

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star！**

[报告 Bug](https://github.com/titxue/mfa/issues) • [功能建议](https://github.com/titxue/mfa/issues) • [贡献代码](https://github.com/titxue/mfa/pulls)

Made with ❤️ by [titxue](https://github.com/titxue)

</div>
