# TOTP 生成器 Chrome 扩展

<div align="center">

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dhipejmoajhjflafhbibojfoeogbmjgf?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/dhipejmoajhjflafhbibojfoeogbmjgf)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)
[![GitHub stars](https://img.shields.io/github/stars/titxue/mfa?style=social)](https://github.com/titxue/mfa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**现代化的双因素认证 (2FA) 解决方案**

基于时间的一次性密码 (TOTP) 生成器，采用 React 19 + TypeScript + Bun 构建。
支持二维码扫描、自动填充、完全离线、数据本地存储。

[安装](#安装) • [功能](#功能特性) • [使用](#使用指南) • [开发](#开发)

</div>

---

## ✨ 功能特性

- 🔐 **TOTP 验证码生成** - 30秒间隔、RFC 6238标准、实时倒计时进度环
- 📷 **二维码扫描** - 图片上传识别、自动填充、离线处理
- 🎯 **智能自动填充** - 一键填充到网页、失败自动复制到剪贴板
- 💾 **数据管理** - 本地/同步存储（Chrome 账号，支持回退到本地）、JSON 导入导出、重复检测
- 🌍 **多语言 UI** - 中英双语、shadcn/ui 设计、流畅动画
- 🔒 **隐私安全** - 无第三方网络请求、不收集数据；若启用 Chrome 同步，可在浏览器设置中开启“同步加密密码短语”

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
- **语言**：设置 → 选择中文或English

---

## 💡 为什么选择

| 特性 | 本扩展 | 
|------|--------|
| 🎨 UI | shadcn/ui + Radix UI |
| 📷 二维码 | 图片上传 |
| 🚀 构建 | Bun < 200ms | 
| 📦 技术 | React 19 + TS |
| 📝 类型 | 100% TypeScript | 

---

## 🛠️ 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS
- **UI 库**：shadcn/ui（基于 Radix UI）
- **构建**：Bun（< 200ms）
- **核心**：jsQR、lucide-react、sonner
- **标准**：Chrome Extension Manifest V3

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

**提交 Bug**：[创建 Issue](https://github.com/titxue/mfa/issues/new) 并提供问题描述、复现步骤、浏览器版本。

---

## 📋 更新日志

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
