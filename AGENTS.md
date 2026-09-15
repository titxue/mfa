# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

TOTP 双因素认证码生成器 Chrome 扩展，基于 React 19 + TypeScript + Bun 构建。这是一个完全离线的 Chrome Extension Manifest V3 应用，用于生成基于时间的一次性密码（TOTP）。

**核心特性**：
- 支持 4 种方式添加账户：点击上传图片、粘贴图片、粘贴 otpauth:// URI 文本、拖拽图片文件
- 二维码识别使用 jsQR 库（Canvas 方案）
- 本地存储使用 Chrome Storage API（带 localStorage 回退）
- shadcn/ui + Radix UI 组件库
- 中英双语支持

## 开发命令

```bash
# 安装依赖
bun install

# 开发模式（监听文件变化）
bun run dev

# 生产构建
bun run build

# TypeScript 类型检查
bun run type-check

# 生成图标（需要 Canvas 库）
bun run generate-icons
```

**加载扩展到 Chrome**：
1. 运行 `bun run build` 生成 `dist/` 目录
2. 打开 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"，选择 `dist/` 目录

## 构建系统架构

### build.ts 工作流程

构建脚本是自定义的 Bun 脚本，执行以下步骤：

1. **版本同步**：从 `package.json` 读取版本号并生成 `src/version.ts`
2. **清理构建**：删除旧的 `dist/` 目录
3. **Popup 构建**：使用 Bun.build 编译 React 应用（ESM 格式）
4. **Content Script 构建**：编译内容脚本（IIFE 格式，用于页面注入）
5. **Tailwind CSS 编译**：编译全局样式
6. **HTML 处理**：复制并修改 HTML 文件的资源引用
7. **Manifest 更新**：复制并更新 `manifest.json` 的版本号
8. **图标复制**：使用 Node.js `copyFile` API 复制图标（避免 Windows 环境的 shell 命令兼容性问题）

**重要**：图标复制使用原生 `copyFile` 而非 shell 命令（`cp -r` 在 Windows 下不兼容）。

### 开发模式注意事项

- `bun run dev` 监听 `src/`、`public/` 和根目录构建配置，变更后串行重建（禁用 minify）
- 连续变更合并处理；构建失败后继续监听。生成的 `src/version.ts` 和 `dist/` 不触发重建
- 重建完成后仍需在 Chrome 扩展管理页手动重新加载扩展

## 应用架构

### 核心数据流

```
App.tsx (主入口)
  ↓
useAccounts Hook → StorageManager → Chrome Storage API
  ↓                                    ↓
useTOTP Hook → TOTP.generateTOTP()   localStorage (回退)
  ↓
AccountList → AccountItem (显示验证码 + 倒计时)
```

### 关键模块

**TOTP 生成（src/utils/totp.ts）**
- `TOTP.generateTOTP(secret, interval)` - 生成 6 位验证码
- 实现 RFC 6238 标准：Base32 解码 → HMAC-SHA1 → 动态截断
- 默认 30 秒时间间隔
- 使用 `crypto.subtle` API（Web Crypto）

**二维码解析（src/utils/qr-parser.ts）**
- `parseQRCodeFromFile(file)` - 从图片文件解析二维码
- `parseOtpauthURI(uri)` - 解析 otpauth://totp/ URI 格式
- 工作流程：File → FileReader.readAsDataURL → Image → Canvas → jsQR → 提取 otpauth URI
- 支持的 URI 格式：`otpauth://totp/Issuer:Account?secret=SECRET&issuer=Issuer&algorithm=SHA1&digits=6&period=30`
- 参数缺省时使用 SHA1 / 6 位 / 30 秒；显式指定不支持的 algorithm、digits、period 时拒绝导入并提示

**存储管理（src/utils/storage.ts）**
- `StorageManager.getAccounts()` / `saveAccounts()` - Chrome Storage 操作
- 自动回退到 localStorage（非扩展环境）
- 账户数据结构：`{ name: string, secret: string }[]`

**自动填充（src/utils/page-analyzer.ts）**
- `PageAnalyzer.fillCode(code)` - 查找页面中的验证码输入框并自动填充
- 失败时自动复制到剪贴板

### 组件层级结构

```
App
├── Header (顶部栏：标题 + 添加账户按钮 + 设置按钮)
├── AccountList
│   └── AccountItem[] (账户卡片：名称 + 验证码 + 倒计时进度环)
├── AddAccountModal (对话框)
│   ├── 扫描二维码按钮
│   ├── 粘贴/拖拽区域（监听 paste 和 drag 事件）
│   └── 表单：账户名称 + 密钥
└── SettingsModal (对话框)
    ├── 语言切换
    ├── 导出账户
    └── 导入账户
```

**AddAccountModal 粘贴/拖拽实现**：
- 监听全局 `paste` 事件（排除 Input/Textarea）
- 优先检查文本类型（`text/plain`）→ 如果是 `otpauth://totp/` 开头则直接解析
- 次级检查图片类型（`image/*`）→ 调用 `parseQRCodeFromFile`
- 拖拽事件：`dragenter`、`dragover`、`dragleave`、`drop`
- 拖拽时显示固定定位的 Overlay（`fixed inset-0 z-[100]`，避免影响 grid 布局）

### Hooks

**useAccounts**
- 管理账户列表的 CRUD 操作
- 自动验证密钥格式（调用 `TOTP.generateTOTP` 测试）
- 检查重复账户名

**useTOTP**
- 使用 `requestAnimationFrame` 实现精确的定时更新
- 自动计算每个账户的验证码和剩余秒数
- 30 秒周期循环

**useI18n**（在 contexts/I18nContext.tsx）
- 提供 `t(key)` 函数进行翻译
- 支持中文（zh-CN）和英文（en-US）
- 自动检测浏览器语言

## 国际化

### 架构说明

项目使用自动化语言注册机制，添加新语言无需修改多个文件。

**核心文件**：
- **`src/locales/index.ts`**: 语言注册中心（唯一需要修改的地方）
- **`src/locales/*.ts`**: 各语言翻译文件
- **`src/types/index.ts`**: Language 类型自动从 locales 导入
- **`src/contexts/I18nContext.tsx`**: 自动使用注册的语言
- **`src/components/SettingsModal.tsx`**: 自动渲染所有语言选项

### 当前支持的语言（12 种）

- 🇨🇳 中文（zh-CN）
- 🇹🇼 繁体中文（zh-TW）
- 🇺🇸 English（en-US）
- 🇪🇸 Español（es-ES）
- 🇫🇷 Français（fr-FR）
- 🇧🇷 Português（pt-BR）
- 🇩🇪 Deutsch（de-DE）
- 🇷🇺 Русский（ru-RU）
- 🇸🇦 العربية（ar-SA）
- 🇯🇵 日本語（ja-JP）
- 🇰🇷 한국어（ko-KR）
- 🇮🇳 हिन्दी（hi-IN）

### 添加新语言（仅需 2 步）

**详细指南**：参见 `docs/ADD_NEW_LANGUAGE.md`

**快速步骤**：

1. **创建翻译文件** `src/locales/xx-XX.ts`：
```typescript
import type { Translations } from './zh-CN'
export const xxXX: Translations = { /* 翻译内容 */ }
```

2. **在 `src/locales/index.ts` 中注册**：
```typescript
// 导入
import { xxXX } from './xx-XX'

// 添加到 LANGUAGE_CONFIGS 数组
{
  code: 'xx-XX',
  nativeName: '原生名称',
  translations: xxXX,
  detectCodes: ['xx', 'xx-XX'],
}
```

完成！运行 `bun run build` 即可。

### 自动化特性

- ✅ 类型自动生成（TypeScript 联合类型）
- ✅ 翻译映射自动构建
- ✅ 语言检测自动配置
- ✅ UI 选项自动渲染
- ✅ 编译时类型检查

## Content Script

`src/content-script.ts` 在网页上下文中运行，用于：
- 自动填充验证码到页面输入框
- 与扩展 Popup 通信

## 常见开发任务

### 修改 TOTP 参数

当前仅支持：SHA1 算法、6 位数字、30 秒周期。若需支持其他配置：
1. 修改 `src/types/index.ts` 的 `Account` 接口添加字段
2. 修改 `src/utils/qr-parser.ts` 的 `parseOtpauthURI` 提取参数
3. 修改 `src/utils/totp.ts` 的 `TOTP.generateTOTP` 支持参数
4. 修改 UI 组件显示/编辑这些参数

### 添加新的上传方式

参考 `AddAccountModal.tsx` 中的粘贴和拖拽实现：
- 统一调用 `processQRImage(file)` 处理图片
- 或调用 `parseOtpauthURI(uri)` 处理文本

### Windows 构建兼容性

避免在 `build.ts` 中使用 shell 命令（如 `cp`、`rm`），改用 Node.js 原生 API：
- `copyFile` 代替 `cp`
- `mkdir` 代替 `mkdir -p`
- `rm -rf` 可用 Bun 的 `$` 函数（已支持跨平台）

## 关键注意事项

1. **版本管理**：`package.json` 是唯一的版本来源，构建时自动同步到 `manifest.json` 和 `version.ts`
2. **图标生成**：`generate-icons.ts` 使用 Canvas 库，可能在某些环境下安装失败（不影响核心功能）
3. **布局问题**：拖拽 Overlay 必须使用 `fixed` 定位并放在 DialogContent 最后，避免影响 grid 布局
4. **事件清理**：粘贴事件监听器必须在 useEffect 的 cleanup 函数中移除
5. **QR 解析性能**：jsQR 处理大图片可能较慢，可在 `qr-parser.ts` 中添加图片缩放优化
6. **Chrome Storage 限制**：单个 key 最大 8KB，整体配额约 10MB（SYNC）或无限制（LOCAL）

## 扩展权限说明

- `storage` - 本地数据存储（账户信息）
- `activeTab` - 获取当前活跃标签页信息（用于自动填充）
- `scripting` - 在页面注入和运行脚本（Content Script）

## 技术栈版本

- React 19.2+
- TypeScript 5.9+
- Bun 1.2+
- Tailwind CSS 3.4+
- Chrome Extension Manifest V3
- 目标浏览器：Chrome 88+

## 常见问题与解决方案

### 拖拽排序跳动问题（dnd-kit）

**问题现象**：
使用 dnd-kit 实现拖拽排序时，拖拽结束后卡片会跳动（从拖拽位置跳回原位，再跳到新位置）。

**根本原因**：
`useAccounts.ts` 中的 `updateAccounts`、`addAccount`、`deleteAccount` 函数使用了错误的顺序：
```typescript
// ❌ 错误：先 await 存储，后更新状态
await StorageManager.saveAccounts(newAccounts)  // 需要 10-50ms
setAccounts(newAccounts)  // 状态更新被延迟
```

**时序问题**：
```
T0:  onReorder(newAccounts) 调用
T0:  await saveAccounts() - 开始等待 Chrome Storage API
T16: setActiveId(null) - 清除拖拽状态（来自 handleDragEnd）
T50: setAccounts(newAccounts) - 状态更新（被 await 延迟）
     ↓
结果：React 状态在拖拽清除后 30ms 才更新，导致 dnd-kit 的动画出现跳动
```

**解决方案**：
```typescript
// ✅ 正确：先更新状态，后异步存储
setAccounts(newAccounts)  // 立即更新 UI（< 1ms）
await StorageManager.saveAccounts(newAccounts)  // 后台异步保存
```

**关键原则**：
- **UI 响应优先**：用户操作必须立即反馈到 UI（< 16ms）
- **持久化异步**：存储操作不应阻塞 UI 更新
- **乐观更新**：先更新 UI，后保存数据（Optimistic UI）

**误区**：
- ❌ 以为问题在 `handleDragEnd` 的执行顺序
- ❌ 以为问题在 dnd-kit 的动画配置
- ❌ 以为问题在 React 的批处理机制
- ✅ 实际问题在 `await` 阻塞了 `setState`

**适用场景**：
任何需要异步存储的状态更新（Chrome Storage API、IndexedDB、网络请求等）都应该使用这个模式。

### requestAnimationFrame 的正确使用

在拖拽结束时清除状态仍然需要使用 `requestAnimationFrame`：
```typescript
const handleDragEnd = (event: DragEndEvent) => {
  // ... 计算并更新数据
  onReorder(newAccounts)  // 立即更新

  // 延迟清除 UI 状态，让动画完成
  requestAnimationFrame(() => {
    setActiveId(null)
  })
}
```

**原因**：确保 DragOverlay 的 CSS 动画有时间完成，避免闪烁。
