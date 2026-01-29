# TOTP 生成器 Chrome 扩展

<div align="center">

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dhipejmoajhjflafhbibojfoeogbmjgf?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)
[![GitHub release](https://img.shields.io/github/v/release/titxue/mfa?label=GitHub)](https://github.com/titxue/mfa/releases)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/dhipejmoajhjflafhbibojfoeogbmjgf)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)
[![GitHub stars](https://img.shields.io/github/stars/titxue/mfa?style=social)](https://github.com/titxue/mfa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**现代化的双因素认证 (2FA) 解决方案**

基于时间的一次性密码 (TOTP) 生成器，采用 React 19 + TypeScript + Bun 构建。
支持二维码扫描、自动填充、完全离线、数据本地存储、**12 种语言**。

[安装](#安装) • [功能](#功能特性) • [使用](#使用指南) • [开发](#开发) • [国际化](#国际化)

</div>

---

## ✨ 功能特性

- 🔐 **TOTP 验证码生成** - 30秒间隔、RFC 6238标准、实时倒计时进度环
- 📷 **二维码扫描** - 图片上传识别、粘贴/拖拽上传、自动填充、离线处理
- 📤 **二维码导出** - 双击账户卡片生成二维码、支持下载 PNG 图片、便于跨设备迁移
- 🎯 **智能自动填充** - 一键填充到网页、失败自动复制到剪贴板
- 🎨 **拖拽排序** - 自由调整账户顺序、流畅动画效果
- 💾 **数据管理** - 本地/同步存储（Chrome 账号，支持回退到本地）、JSON 导入导出、重复检测
- 🌍 **12 种语言支持** - 中文简繁、英语、西班牙语、法语、葡萄牙语、德语、俄语、阿拉伯语、日语、韩语、印地语
- 🎨 **现代化 UI** - shadcn/ui 设计系统、流畅动画、响应式布局
- 🔒 **隐私安全** - 无第三方网络请求、不收集数据；若启用 Chrome 同步，可在浏览器设置中开启"同步加密密码短语"

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
4. 自动识别并保存

**手动输入**
1. 点击 "+" 按钮
2. 输入账户名称和 Base32 密钥
3. 点击"保存"

### 使用验证码

- **自动填充**：左键点击账户卡片
- **手动复制**：填充失败时自动复制到剪贴板
- **删除账户**：右键点击账户卡片

### 数据管理

- **导出**：设置 → 导出（JSON格式）
- **导入**：设置 → 导入（自动跳过重复）
- **语言**：设置 → 选择 12 种语言之一（自动检测浏览器语言）

---

## 💡 为什么选择

| 特性 | 本扩展 | 说明 |
|------|--------|------|
| 🎨 UI 设计 | shadcn/ui + Radix UI | 现代化组件库 |
| 🌍 多语言 | 12 种语言 | 中英日韩法德西俄阿葡印 + 繁中 |
| 📷 二维码 | 上传/粘贴/拖拽 | 多种方式支持 |
| 🚀 构建速度 | < 400ms | Bun 超快构建 |
| 📦 技术栈 | React 19 + TypeScript | 最新技术 |
| 📝 类型安全 | 100% TypeScript | 编译时检查 |
| 🔧 可扩展 | 自动化架构 | 添加语言超简单 | 

---

## 🛠️ 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS
- **UI 库**：shadcn/ui（基于 Radix UI）
- **构建**：Bun（< 200ms）
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

我们使用自动化的语言注册机制，添加新语言只需 2 步：

1. **创建翻译文件** `src/locales/xx-XX.ts`
2. **注册语言** 在 `src/locales/index.ts` 添加配置

详见：[添加新语言指南](docs/ADD_NEW_LANGUAGE.md)

**架构优势**：
- 单一配置文件
- 类型自动生成
- UI 自动更新
- 零重复代码

---

## 🔧 开发

### 环境要求
- Bun 1.2+
- Chrome 88+

### 开发命令

```bash
bun install              # 安装依赖
bun run dev              # 开发模式
bun run build            # 生产构建
bun run type-check       # 类型检查
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

无需修改其他文件，类型和 UI 自动更新！

### 权限说明
- `storage` - 本地/同步存储
- `activeTab` - 自动填充
- `scripting` - 页面操作

---

## ❓ 常见问题

<details>
<summary><strong>如何备份数据？</strong></summary>

设置 → 导出，下载 JSON 文件。⚠️ 文件包含未加密密钥，请妥善保管。
</details>

<details>
<summary><strong>验证码不准确？</strong></summary>

检查系统时间是否准确（TOTP基于时间）。
</details>

<details>
<summary><strong>自动填充失败？</strong></summary>

部分网站使用特殊输入框，填充失败时验证码会自动复制到剪贴板。
</details>

<details>
<summary><strong>数据会随 Google 账号同步吗？</strong></summary>

是的，默认使用 chrome.storage.sync，在同一 Google 账号且开启同步的设备间自动同步；未登录或关闭同步时回退为本地存储。
注意：
- 商店版与“开发者模式加载”的解压版因扩展 ID 不同，数据不会互通
- 可在 Chrome 同步设置中启用“加密密码短语”以端到端加密同步数据
- 同步存在配额（单 key 最大约 8KB，整体约 10MB），首次拉取可能有延迟
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
   - 只需创建翻译文件和添加配置，非常简单！

2. **功能开发** - 添加新功能或改进现有功能
   - 提交前请先创建 Issue 讨论
   - 确保通过 TypeScript 类型检查和构建

3. **Bug 修复** - [报告 Bug](https://github.com/titxue/mfa/issues/new)
   - 提供问题描述、复现步骤、浏览器版本

4. **文档改进** - 完善文档、修正错误、添加示例

---

## 📋 更新日志

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
