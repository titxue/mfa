# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 Chrome 浏览器扩展（Manifest V3），提供 TOTP 双因素认证码生成功能。

- **技术栈**：原生 JavaScript + HTML + CSS，无构建工具
- **核心依赖**：Web Crypto API (HMAC-SHA1)、Chrome Storage API
- **主要特性**：TOTP 生成、自动填充验证码、数据导入导出、多语言支持

## 开发命令

```bash
# 安装依赖（仅用于图标生成）
npm install

# 生成图标资源（可选）
node generate_icons.js
```

开发调试：在 Chrome 浏览器打开 `chrome://extensions/`，启用开发者模式，加载项目根目录。

## 核心架构

### 文件组织

```
popup.js (1000+ 行) - 主应用逻辑，包含以下模块：
├── CONFIG - 全局配置常量
├── Utils - 工具函数集（DOM、键盘、Chrome API、数据验证）
├── StorageManager - 存储管理（chrome.storage.sync / localStorage）
├── UIManager - UI 控制（Toast、对话框、进度环）
├── ImportExportManager - 数据导入导出
├── PageAnalyzer - 页面输入框检测和自动填充
└── App - 主控制器（生命周期、定时器、验证码管理）

totp.js - TOTP 核心算法
├── base32Decode() - Base32 解码
├── generateTOTP() - 验证码生成（RFC 6238）
└── getRemainingSeconds() - 剩余时间计算

i18n.js - 国际化系统（中文/英文）
```

### 关键数据结构

**账户存储格式**：
```javascript
{
  accounts: [
    { name: "账户名", secret: "Base32密钥" }
  ],
  language: "zh" | "en"
}
```

存储位置：`chrome.storage.sync`（跨设备同步），非扩展环境降级为 `localStorage`。

### 核心业务流程

1. **TOTP 生成**：Base32 解码密钥 → 计算时间步（30秒）→ HMAC-SHA1 签名 → 动态截断 → 生成 6 位验证码

2. **自动填充机制**：
   - 通过 `chrome.scripting.executeScript` 注入内容脚本到当前标签页
   - 在页面中查找可能的输入框（基于 `CONFIG.TOTP_KEYWORDS`）
   - 优先填充到输入框，失败则回退到剪贴板复制

3. **定时更新**：30 秒周期自动刷新验证码，通过 `requestAnimationFrame` 实现进度环动画

## 开发注意事项

- **修改 TOTP 算法**：编辑 `totp.js`，注意符合 RFC 6238 标准
- **调整 UI**：编辑 `popup.html` + `UIManager` 类（popup.js:147+）
- **添加新语言**：在 `i18n.js` 的 `languages` 对象中添加语言包
- **修改自动填充逻辑**：编辑 `PageAnalyzer` 类（popup.js:800+）
- **存储操作**：统一通过 `StorageManager` 类处理，避免直接调用 Chrome API

## 权限依赖

- `storage` - 本地数据持久化
- `activeTab` - 获取当前标签页信息
- `scripting` - 注入内容脚本实现自动填充

## 关键技术细节

- **加密实现**：使用 `crypto.subtle` API，无外部加密库依赖
- **密钥格式**：始终以 Base32 字符串存储，运行时解码
- **进度环动画**：SVG `stroke-dasharray` + `requestAnimationFrame`
- **账户删除**：右键点击触发，需二次确认
- **表单状态保存**：自动记录滚动位置和输入框内容
