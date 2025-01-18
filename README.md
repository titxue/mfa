# TOTP 生成器 Chrome 扩展

基于时间的一次性密码 (TOTP) 生成器 Chrome 扩展，用于双因素认证。

## 功能特点

- 生成 30 秒间隔的 TOTP 验证码
- 可视化倒计时进度条
- 本地保存账户信息
- 使用 Web Crypto API 实现安全加密
- 支持 Base32 编码的密钥

## 安装方法

1. 克隆此仓库
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 在右上角启用"开发者模式"
4. 点击"加载已解压的扩展程序"，选择扩展目录

## 开发说明

### 环境要求

- Node.js 和 npm（用于生成图标）

### 设置步骤

1. 安装依赖：
```bash
npm install
```

2. 生成图标：
```bash
node generate_icons.js
```

### 项目结构

- `manifest.json` - 扩展配置文件
- `popup.html` - 扩展弹出界面
- `popup.js` - 界面交互逻辑
- `totp.js` - TOTP 生成实现
- `generate_icons.js` - 图标生成脚本
- `icons/` - 扩展图标

## 使用方法

1. 点击 Chrome 工具栏中的扩展图标
2. 输入账户名称和 Base32 格式的密钥
3. 点击"保存"存储信息
4. TOTP 验证码将自动生成并每 30 秒更新一次
5. 进度条显示当前验证码的剩余有效时间

## 安全性

- 所有敏感数据存储在 Chrome 的安全存储中
- TOTP 生成使用 Web Crypto API 进行安全加密
- 不进行任何外部网络请求

## 提交记录

- 35a0d71 - 初始提交：创建 TOTP 生成器 Chrome 扩展
  - 实现基本的 TOTP 生成功能
  - 创建扩展界面和交互逻辑
  - 添加图标生成脚本
  - 配置扩展清单文件
  - 添加中英文文档
  - 设置 .gitignore

## 开源协议

MIT 许可证