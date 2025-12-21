# TOTP 生成器 Chrome 扩展

基于时间的一次性密码 (TOTP) 生成器 Chrome 扩展，用于双因素认证。采用现代化 React + TypeScript + Bun 技术栈，支持二维码扫描、自动填充验证码、多语言界面、数据导入导出等功能。

## 核心功能特点

### 🔐 TOTP 验证码生成
- 生成标准 30 秒间隔的 TOTP 验证码
- 支持 Base32 编码的密钥格式
- 使用 Web Crypto API 实现 HMAC-SHA1 安全加密
- 实时可视化倒计时进度环（颜色编码：绿色/橙色/红色）
- 验证码格式化显示（3位数字分组）

### 📷 二维码扫描（新功能）
- **图片上传扫描**：支持从本地上传包含 TOTP 二维码的图片
- **自动识别填充**：自动解析 `otpauth://` URI 并填充表单
- **离线处理**：完全本地化，无需联网
- **格式支持**：兼容 Google Authenticator、Authy 等主流 2FA 应用的二维码格式

### 🎯 智能代码使用
- **左键点击**：自动填充验证码到当前网页的输入框
- **回退机制**：填充失败时自动复制到剪贴板
- **右键点击**：删除账户（带确认对话框）
- 支持键盘导航和无障碍访问

### 💾 数据管理
- 本地安全存储账户信息（Chrome Storage API）
- JSON 格式数据导入导出功能
- 重复账户检测和处理
- 应用状态持久化

### 🌍 多语言支持
- 内置中文（简体）和英文语言包
- 动态语言切换，无需重启
- 完整的 UI 文本国际化
- 语言偏好自动保存

### 🎨 用户体验
- 采用 shadcn/ui 设计系统
- 响应式布局适配
- 流畅的动画效果（Radix UI 动画）
- Toast 消息提示系统（Sonner）
- 空状态友好提示

## 技术架构

### 技术栈

#### 前端框架
- **React 19** - 核心 UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS 3.4** - 原子化 CSS
- **shadcn/ui** - 基于 Radix UI 的组件库

#### 构建工具
- **Bun** - 统一的运行时、包管理器和构建工具
- 自定义构建脚本（`build.ts`）
- PostCSS + Autoprefixer

#### 核心依赖
- **jsQR** - 二维码解析库
- **lucide-react** - 图标库
- **sonner** - Toast 提示库
- **Radix UI** - 无头组件库

### 项目结构

```
mfa/
├── src/
│   ├── components/          # React 组件
│   │   ├── ui/             # shadcn/ui 基础组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   └── alert-dialog.tsx
│   │   ├── AccountItem.tsx      # 账户卡片
│   │   ├── AccountList.tsx      # 账户列表
│   │   ├── AddAccountModal.tsx  # 添加账户弹窗（含二维码扫描）
│   │   ├── EmptyState.tsx       # 空状态组件
│   │   ├── Header.tsx           # 头部组件
│   │   ├── ProgressRing.tsx     # 进度环组件
│   │   └── SettingsModal.tsx    # 设置弹窗
│   ├── contexts/           # React Context
│   │   └── I18nContext.tsx     # 国际化上下文
│   ├── hooks/              # 自定义 Hooks
│   │   ├── useAccounts.ts      # 账户管理
│   │   └── useTOTP.ts          # TOTP 生成
│   ├── locales/            # 国际化
│   │   ├── zh-CN.ts           # 中文语言包
│   │   └── en-US.ts           # 英文语言包
│   ├── popup/              # Popup 页面
│   │   ├── App.tsx            # 主应用
│   │   ├── index.tsx          # 入口文件
│   │   └── index.html         # HTML 模板
│   ├── styles/             # 样式
│   │   └── globals.css        # 全局样式
│   ├── types/              # TypeScript 类型
│   │   └── index.ts
│   ├── utils/              # 工具函数
│   │   ├── totp.ts            # TOTP 算法
│   │   ├── storage.ts         # 存储管理
│   │   ├── import-export.ts   # 导入导出
│   │   ├── page-analyzer.ts   # 页面分析
│   │   ├── qr-parser.ts       # 二维码解析（新增）
│   │   └── cn.ts              # 样式工具
│   └── content-script.ts   # 内容脚本
├── public/
│   ├── manifest.json       # Chrome 扩展配置
│   └── icons/              # 扩展图标
├── build.ts                # Bun 构建脚本
├── tailwind.config.ts      # Tailwind 配置
├── components.json         # shadcn/ui 配置
├── tsconfig.json           # TypeScript 配置
└── package.json            # 依赖配置
```

### 核心模块

#### 1. TOTP 核心引擎 (`src/utils/totp.ts`)
```typescript
class TOTP {
  static base32Decode(secret: string): Uint8Array
  static async generateTOTP(secret: string, interval?: number): Promise<string>
  static getRemainingSeconds(interval?: number): number
  static formatCode(code: string): string
}
```

#### 2. 二维码解析器 (`src/utils/qr-parser.ts`)
```typescript
interface ParsedQRData {
  name: string
  secret: string
  issuer?: string
}

async function parseQRCodeFromFile(file: File): Promise<ParsedQRData>
```
- 支持 `otpauth://totp/` URI 格式
- 自动提取账户名、密钥和发行者信息
- 错误处理和用户友好提示

#### 3. 自定义 Hooks

**`useAccounts`** - 账户管理
```typescript
function useAccounts() {
  const accounts: Account[]
  const addAccount: (account: Account) => Promise<Result>
  const deleteAccount: (name: string) => Promise<void>
  const updateAccounts: (accounts: Account[]) => Promise<void>
}
```

**`useTOTP`** - TOTP 生成
```typescript
function useTOTP(accounts: Account[]) {
  const codes: { [key: string]: string }
  const remaining: number
}
```
- 使用 `requestAnimationFrame` 实现精确计时
- 自动在 30 秒周期更新验证码

#### 4. React Context - 国际化 (`I18nContext`)
```typescript
interface I18nContextType {
  locale: Language
  setLocale: (locale: Language) => Promise<void>
  t: (key: string, params?: Record<string, any>) => string
}
```

### 关键业务流程

#### 账户管理流程
1. **添加账户**：
   - 手动输入：表单验证 → Secret 格式检查 → 存储保存 → UI 更新
   - 二维码扫描：上传图片 → jsQR 解析 → URI 解析 → 自动填充表单 → 保存

2. **删除账户**：右键触发 → 确认对话框（AlertDialog）→ 数据删除 → 列表更新

#### 验证码生成流程
1. **定时更新**：`useTOTP` Hook → requestAnimationFrame 循环 → 30秒周期检测 → 批量生成 → 状态更新
2. **进度显示**：实时计算剩余秒数 → ProgressRing 组件 → SVG 动画渲染

#### 二维码扫描流程
1. **文件选择**：用户点击"扫描二维码" → 触发文件输入
2. **图片处理**：FileReader 读取 → Canvas 绘制 → ImageData 提取
3. **QR 解析**：jsQR 扫描 → otpauth URI 提取
4. **数据填充**：解析 URI 参数 → 自动填充表单 → Toast 提示

#### 代码使用流程
1. **自动填充**：点击卡片 → Chrome Scripting API → 注入内容脚本 → 查找输入框 → 填充验证码
2. **复制回退**：填充失败 → 复制到剪贴板 → Toast 提示

## 安装方法

### 从 Chrome Web Store 安装（推荐）
访问 [Chrome Web Store](https://chromewebstore.google.com/detail/totp-generator/dhipejmoajhjflafhbibojfoeogbmjgf) 直接安装

### 开发者模式安装
1. 克隆此仓库到本地
```bash
git clone https://github.com/yourusername/mfa.git
cd mfa
```

2. 安装依赖
```bash
bun install
```

3. 构建扩展
```bash
bun run build
```

4. 加载到 Chrome
   - 打开 Chrome 浏览器，访问 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `dist` 目录

## 开发说明

### 环境要求
- **Bun 1.2+** - 运行时和构建工具
- **Chrome 浏览器 88+** - 支持 Manifest V3
- **Node.js 16+**（可选）- 用于某些工具

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
```

### 构建流程

`build.ts` 自定义构建脚本：
1. 使用 Bun.build() 编译 TypeScript + React
2. 使用 Tailwind CLI 编译样式
3. 处理 HTML 文件并注入样式
4. 复制静态资源（manifest.json, icons）
5. 输出到 `dist/` 目录

### 添加新的 shadcn/ui 组件

```bash
bun add @radix-ui/react-[component-name]
# 然后手动创建 src/components/ui/[component].tsx
```

### 权限说明

扩展需要以下权限（Manifest V3）：
- `storage` - 本地数据存储
- `activeTab` - 当前标签页访问（用于自动填充）
- `scripting` - 内容脚本注入（用于页面操作）

## 使用指南

### 添加账户（二维码方式）
1. 点击右上角"添加账户"按钮
2. 在弹窗中点击"扫描二维码"
3. 选择包含 TOTP 二维码的图片文件
4. 系统自动识别并填充账户名和密钥
5. 确认后点击"保存"

### 添加账户（手动方式）
1. 点击右上角"添加账户"按钮
2. 输入账户名称（如：GitHub）
3. 输入密钥（从服务提供商获取的 Base32 格式密钥）
4. 点击"保存"

### 使用验证码
- **自动填充**：左键点击账户卡片，验证码将自动填充到当前网页
- **手动复制**：如果自动填充失败，验证码会自动复制到剪贴板

### 数据管理
- **导出**：设置 → 账户管理 → 导出（JSON 格式）
- **导入**：设置 → 账户管理 → 导入（自动跳过重复账户）

### 语言切换
设置 → 语言设置 → 选择"中文"或"English"

## 安全性说明

- ✅ 所有数据存储在本地（Chrome Storage API）
- ✅ 不需要网络连接即可工作
- ✅ 二维码解析完全在本地完成
- ✅ 不收集、不上传任何用户数据
- ✅ 符合 RFC 6238 标准的 TOTP 算法实现
- ⚠️ 导出的 JSON 文件包含未加密的密钥，请妥善保管

## 技术亮点

1. **现代化技术栈**：React 19 + TypeScript + Bun，开发体验极佳
2. **快速构建**：Bun 构建速度 < 200ms
3. **组件化设计**：shadcn/ui + Radix UI，可访问性好
4. **类型安全**：完整的 TypeScript 类型覆盖
5. **二维码扫描**：jsQR 纯 JS 实现，无需额外权限
6. **精确计时**：requestAnimationFrame 实现亚秒级精度
7. **优雅降级**：自动填充失败时自动复制到剪贴板

## 浏览器兼容性

- Chrome 88+
- Edge 88+
- 其他基于 Chromium 的浏览器

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v2.0.0 (2024-12)
- ✨ 全新架构：迁移到 React + TypeScript + Bun
- ✨ 新增二维码扫描功能（jsQR）
- ✨ 采用 shadcn/ui 设计系统
- ✨ 升级到 Manifest V3
- ⚡️ 构建速度提升 10 倍（Bun）
- 🎨 全新 UI 设计，更现代化
- 🔧 完全组件化重构

### v1.0.0
- 🎉 首次发布
- 基础 TOTP 功能
- 自动填充和导入导出
