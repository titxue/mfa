# 注意输出结果需要是中文形式
# TOTP 生成器扩展说明

## 项目概述

这是一个用于生成基于时间的一次性密码的 Chrome 浏览器扩展。它在浏览器内提供两步验证功能。

主要功能包括：

* 生成六位动态验证码，时间间隔为三十秒。
* 使用浏览器提供的存储接口保存密钥。
* 使用浏览器的加密接口生成验证码，不依赖外部加密库。
* 可以在当前浏览页面自动填充验证码。
* 提供导入和导出功能，格式为 JSON。
* 支持英文和中文界面。
* 支持深色模式和浅色模式，通过样式文件和系统设置自动切换。

## 技术栈

* 平台为 Chrome 扩展 Manifest V3。
* 使用的语言为 JavaScript、HTML 和 CSS。
* 加密操作使用 Web Crypto API 中的 crypto.subtle。
* 存储使用 chrome.storage.sync，不在扩展环境下开发时会退回使用 localStorage。
* 构建工具不作用于扩展代码，Node.js 仅用于生成图标文件。

## 项目结构

* manifest.json 为扩展的配置文件，请求的权限包括 storage、activeTab 和 scripting。
* popup.html 为扩展界面的入口文件。
* popup.js 管理界面逻辑、事件和 Chrome 接口调用，通过 App、UIManager 和 StorageManager 维护应用状态。
* totp.js 包含核心逻辑类 TOTP，负责 Base32 解码以及 HMAC SHA1 生成。
* i18n.js 负责界面文本的国际化。
* generate_icons.js 用于使用画布生成不同尺寸的图标。
* icons 目录存放生成的图标资源。

## 开发与设置

### 一 准备条件

需要安装 Node.js 与 npm，用于生成图标。

### 二 安装

```
npm install
```

### 三 构建与资源生成

扩展代码本身不需要编译。如果图标缺失或需要重新生成，可以执行：

```
node generate_icons.js
```

### 四 在浏览器中运行

一 打开 Chrome，进入 chrome://extensions。

二 启用开发者模式。

三 点击加载已解压的扩展。

四 选择本项目的根目录。

## 核心逻辑与约定

### 动态验证码生成 totp.js

* 通过 crypto.subtle.importKey 与 crypto.subtle.sign 生成 HMAC SHA1。
* 自带 Base32 解码函数 base32Decode。
* 密钥以原始 Base32 字符串形式存储，在生成验证码时才进行解码。

### 存储管理 popup.js

* 通过 StorageManager 处理保存逻辑。
* 优先使用 chrome.storage.sync 实现跨设备同步。
* 存储的账号数据结构为数组，元素形式为 name 和 secret。

### 国际化 i18n.js

* 基于字典的文本替换方式。
* 带有 data-i18n 属性的元素会自动替换内容。
* 支持动态参数，例如 count。

### 界面结构 popup.js

* App 为主控制器。
* UIManager 负责界面更新，包括提示信息与对话框。
* ImportExportManager 管理 JSON 文件的导入与导出。
* PageAnalyzer 在当前标签页插入脚本，用于查找输入框并填入验证码。

## 常见操作

* 若要添加新语言，在 i18n.js 的 languages 对象中增加语言内容。
* 若要修改界面，在 popup.html 调整结构，并在 popup.js 的 UIManager 中更新界面逻辑。
* 如需调整加密逻辑，修改 totp.js；自动填充依赖 activeTab 权限注入脚本。

## 关于 popup.zip

popup.zip 是扩展打包后的文件。在开发模式下无需使用此文件，应直接操作源代码目录。