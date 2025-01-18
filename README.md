# TOTP 生成器 Chrome 扩展

基于时间的一次性密码 (TOTP) 生成器 Chrome 扩展，用于双因素认证。

## 功能特点

- 生成 30 秒间隔的 TOTP 验证码
- 可视化倒计时进度条
- 本地保存账户信息
- 使用 Web Crypto API 实现安全加密
- 支持 Base32 编码的密钥
- 点击验证码自动复制到剪贴板
- 长按账户可删除（支持触摸屏）
- 自动保存表单状态和滚动位置
- 优化的性能，避免页面闪动

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