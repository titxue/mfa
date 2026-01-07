import QRCode from 'qrcode'

/**
 * 从账户信息生成 otpauth:// URI
 * @param name - 账户名称
 * @param secret - Base32 格式的密钥
 * @param issuer - 可选的发行者名称（从 name 中自动提取）
 * @returns otpauth://totp/ 格式的 URI
 */
export function generateOtpauthURI(
  name: string,
  secret: string
): string {
  // 尝试从 name 中提取 issuer（如果包含空格，第一部分作为 issuer）
  const parts = name.trim().split(/\s+/)
  const issuer = parts.length > 1 ? parts[0] : undefined
  const accountName = parts.length > 1 ? parts.slice(1).join(' ') : name

  // 构造 label (path 部分)
  let label = accountName
  if (issuer) {
    label = `${issuer}:${accountName}`
  }

  // 构造查询参数
  const params = new URLSearchParams()
  params.set('secret', secret.toUpperCase())
  params.set('algorithm', 'SHA1')
  params.set('digits', '6')
  params.set('period', '30')
  if (issuer) {
    params.set('issuer', issuer)
  }

  // 组合 URI
  const uri = `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`
  return uri
}

/**
 * 生成二维码 Data URL
 * @param uri - otpauth:// URI
 * @param size - 二维码大小（像素），默认 300
 * @returns Promise<string> - Data URL (PNG base64)
 */
export async function generateQRDataURL(
  uri: string,
  size: number = 300
): Promise<string> {
  try {
    const dataURL = await QRCode.toDataURL(uri, {
      type: 'image/png',
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    return dataURL
  } catch (error) {
    throw new Error('Failed to generate QR code')
  }
}

/**
 * 下载二维码为 PNG 图片
 * @param dataURL - 二维码 Data URL
 * @param name - 账户名称（用于文件名）
 */
export function downloadQRCodeImage(
  dataURL: string,
  name: string
): void {
  // 创建隐藏的 <a> 元素
  const link = document.createElement('a')
  link.href = dataURL

  // 清理文件名（移除特殊字符）
  const sanitizedName = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
  link.download = `${sanitizedName}-totp-qr-${Date.now()}.png`

  // 触发下载
  document.body.appendChild(link)
  link.click()

  // 清理 DOM
  document.body.removeChild(link)
}
