// Content script for auto-filling TOTP codes
// This script is injected into web pages to find and fill TOTP input fields

// 导出给 executeScript 使用的函数
declare const fillTOTPCode: (code: string) => boolean

// 这个文件会被编译为 IIFE 格式，在页面中执行
