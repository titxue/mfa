# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 Chrome 浏览器扩展（Manifest V3），提供 TOTP 双因素认证码生成功能。

- **技术栈**：React 18 + TypeScript + Bun + shadcn/ui
- **构建工具**：Bun（一体化运行时 + 包管理器 + 构建器）
- **UI 框架**：shadcn/ui（基于 Radix UI + Tailwind CSS）
- **核心依赖**：Web Crypto API (HMAC-SHA1)、Chrome Storage API
- **主要特性**：TOTP 生成、自动填充验证码、数据导入导出、多语言支持

## 开发命令

```bash
# 安装依赖
bun install

# 开发模式（监听文件变化）
bun run dev

# 生产构建
bun run build

# 类型检查
bun run type-check

# 生成图标资源（可选）
node generate_icons.js
```

### 开发调试

1. 运行 `bun run build` 构建扩展
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `dist/` 目录

## 项目结构

```
src/
├── components/
│   ├── ui/                    # shadcn/ui 基础组件
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   └── alert-dialog.tsx
│   ├── Header.tsx             # 顶栏（标题 + 按钮）
│   ├── AccountList.tsx        # 账户列表容器
│   ├── AccountItem.tsx        # 单个账户卡片
│   ├── AddAccountModal.tsx    # 添加账户模态框
│   ├── SettingsModal.tsx      # 设置页面
│   ├── ProgressRing.tsx       # SVG 进度环
│   └── EmptyState.tsx         # 空状态提示
├── hooks/
│   ├── useAccounts.ts         # 账户管理（增删改查）
│   ├── useTOTP.ts             # TOTP 生成 + 定时更新
│   ├── useI18n.ts             # 国际化 Hook
│   └── useToast.ts            # Toast 消息管理
├── utils/
│   ├── totp.ts                # TOTP 核心算法
│   ├── storage.ts             # Chrome Storage 封装
│   ├── import-export.ts       # 导入导出逻辑
│   ├── page-analyzer.ts       # 自动填充工具
│   └── cn.ts                  # shadcn className 工具
├── contexts/
│   └── I18nContext.tsx        # 国际化上下文
├── locales/
│   ├── zh-CN.ts               # 中文语言包
│   └── en-US.ts               # 英文语言包
├── types/
│   └── index.ts               # TypeScript 类型定义
├── popup/
│   ├── App.tsx                # 主应用组件
│   ├── index.tsx              # 入口文件
│   └── index.html             # HTML 模板
├── content-script.ts          # 内容脚本（自动填充）
└── styles/
    └── globals.css            # Tailwind 全局样式

build.ts                       # Bun 构建脚本
components.json                # shadcn/ui 配置
tailwind.config.ts             # Tailwind 配置
tsconfig.json                  # TypeScript 配置
public/
├── manifest.json              # Chrome 扩展配置
└── icons/                     # 图标资源
```

## 核心架构

### 关键数据结构

**账户类型 (Account)**：
```typescript
interface Account {
  name: string      // 账户名称
  secret: string    // Base32 密钥
}
```

**存储格式**：
- 账户列表：`chrome.storage.sync.accounts` (Account[])
- 语言设置：`chrome.storage.sync.language` ('zh-CN' | 'en-US')
- 应用状态：`chrome.storage.sync.state` (AppState)

### 核心 Hooks

1. **useTOTP** (`src/hooks/useTOTP.ts`)
   - 管理所有账户的验证码生成
   - 使用 `requestAnimationFrame` 实现精确的 30 秒定时更新
   - 自动检测时间周期边界并重新生成验证码

2. **useAccounts** (`src/hooks/useAccounts.ts`)
   - 账户的增删改查操作
   - 自动同步到 Chrome Storage
   - 验证账户名唯一性和密钥格式

3. **useI18n** (`src/contexts/I18nContext.tsx`)
   - 多语言文本管理
   - 动态语言切换
   - 支持参数插值（如 `{count}`, `{name}`）

### 核心业务流程

1. **TOTP 生成** (`src/utils/totp.ts`):
   ```
   Base32 解码密钥 → 计算时间步（30秒）→ HMAC-SHA1 签名
   → 动态截断 → 生成 6 位验证码
   ```

2. **自动填充机制** (`src/utils/page-analyzer.ts`):
   ```
   检测 Chrome API → 获取当前标签页 → 注入脚本查找输入框
   → 填充验证码 → 失败则复制到剪贴板
   ```

3. **定时更新** (`src/hooks/useTOTP.ts`):
   ```
   requestAnimationFrame 循环 → 计算剩余时间 → 检测时间边界
   → 重新生成验证码 → 更新 UI
   ```

4. **导入导出** (`src/utils/import-export.ts`):
   ```
   导出：序列化为 JSON → 下载文件
   导入：读取 JSON → 验证格式 → 检查重复 → 验证密钥 → 合并数据
   ```

## 开发注意事项

### 修改功能

- **TOTP 算法**：编辑 `src/utils/totp.ts`，保持 RFC 6238 标准兼容
- **UI 组件**：
  - shadcn/ui 组件：`src/components/ui/`
  - 自定义组件：`src/components/`
- **添加新语言**：
  1. 在 `src/locales/` 添加新语言文件
  2. 更新 `src/types/index.ts` 的 `Language` 类型
  3. 在 `I18nContext.tsx` 注册语言
- **修改自动填充**：编辑 `src/utils/page-analyzer.ts` 的 `findTOTPInput()`
- **存储操作**：统一通过 `StorageManager` 类，避免直接调用 Chrome API

### 构建系统

构建脚本 (`build.ts`) 执行以下步骤：
1. 清理 `dist/` 目录
2. 使用 Bun 打包 React 应用（`src/popup/index.tsx`）
3. 打包 content script（`src/content-script.ts`）
4. 编译 Tailwind CSS（`src/styles/globals.css`）
5. 处理 HTML 文件（更新资源引用）
6. 复制 manifest.json 和图标

**注意事项**：
- Bun build 不支持 `splitting: true`（会导致命名冲突）
- Tailwind CSS 必须使用 v3.x（v4.x 有兼容性问题）
- 所有路径必须使用 `@/` 别名（配置在 `tsconfig.json`）

### 类型安全

- 所有组件和函数都有完整的 TypeScript 类型
- Chrome API 使用 `@types/chrome` 类型定义
- 语言包使用类型推导确保翻译 key 一致性

### shadcn/ui 组件使用

shadcn/ui 组件已集成到项目中，使用方法：
```tsx
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

// 使用
<Button variant="outline" size="sm">Click me</Button>
```

可用组件：Button, Dialog, Card, Input, Label, Select, AlertDialog

## Chrome 扩展配置

### Manifest V3

- **permissions**: `storage`, `activeTab`, `scripting`
- **action**: popup 使用 `dist/popup.html`
- **icons**: 16px, 48px, 128px（位于 `dist/icons/`）

### 内容安全策略 (CSP)

- 无内联脚本：所有 JS 都通过 Bun 打包
- 无 `eval()`：TOTP 算法使用 `crypto.subtle`
- shadcn/ui 和 Radix UI 完全兼容 CSP

## 关键技术细节

- **加密实现**：使用 `crypto.subtle` API，无外部加密库依赖
- **密钥格式**：始终以 Base32 字符串存储，运行时解码
- **进度环动画**：SVG + CSS transition，颜色根据剩余时间变化（绿 → 黄 → 红）
- **账户删除**：右键点击触发 AlertDialog 二次确认
- **Toast 消息**：使用 `sonner` 库（轻量级 React Toast）
- **状态管理**：React Context + Custom Hooks，无需 Redux/Zustand
- **构建性能**：Bun 比 Webpack 快 10-100 倍，构建时间 < 1 秒

## 性能优化

- **代码分割**：目前禁用，未来可考虑手动分离大依赖
- **Tree-shaking**：Bun 自动移除未使用代码
- **Minification**：生产构建自动压缩
- **CSS 优化**：Tailwind 自动移除未使用的样式类

## 故障排查

### 构建失败

- **Tailwind 错误**：确保使用 `tailwindcss@^3.4.0`
- **命名冲突**：检查 `build.ts` 中 `splitting: false`
- **路径错误**：确认 `@/` 别名在 `tsconfig.json` 中配置

### 运行时错误

- **Chrome API 不可用**：检查是否在扩展环境中运行（`chrome.storage` 存在）
- **TOTP 生成失败**：验证密钥是否为有效的 Base32 格式
- **自动填充失败**：检查 `activeTab` 和 `scripting` 权限

### 类型错误

- 运行 `bun run type-check` 检查类型错误
- 确保所有导入路径使用 `@/` 别名
- 检查 `src/types/index.ts` 中的类型定义

## 参考资源

- [Bun 文档](https://bun.sh/docs)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Radix UI 文档](https://www.radix-ui.com)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [RFC 6238 TOTP 标准](https://tools.ietf.org/html/rfc6238)
