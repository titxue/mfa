import jsQR from 'jsqr'

export interface ParsedQRData {
  name: string
  secret: string
  issuer?: string
}

/**
 * 从图片文件中解析 TOTP 二维码
 */
export async function parseQRCodeFromFile(file: File): Promise<ParsedQRData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      const imageData = e.target?.result
      if (!imageData || typeof imageData !== 'string') {
        reject(new Error('Failed to read image'))
        return
      }

      try {
        const result = await decodeQRFromImageData(imageData)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * 从 ImageData 解码二维码
 */
async function decodeQRFromImageData(dataURL: string): Promise<ParsedQRData> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (!code || !code.data) {
        reject(new Error('No QR code found'))
        return
      }

      try {
        const parsed = parseOtpauthURI(code.data)
        resolve(parsed)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = dataURL
  })
}

/**
 * 解析 otpauth:// URI
 * 格式: otpauth://totp/Issuer:Account?secret=BASE32SECRET&issuer=Issuer
 */
function parseOtpauthURI(uri: string): ParsedQRData {
  // 验证 URI 格式
  if (!uri.startsWith('otpauth://totp/')) {
    throw new Error('Invalid otpauth URI format')
  }

  try {
    const url = new URL(uri)

    // 提取 secret (必需)
    const secret = url.searchParams.get('secret')
    if (!secret) {
      throw new Error('Missing secret parameter')
    }

    // 提取 label (路径部分)
    let label = decodeURIComponent(url.pathname.substring(1)) // 移除开头的 '/'
    let issuer = url.searchParams.get('issuer') || undefined

    // 如果 label 包含 "Issuer:Account" 格式
    let name = label
    if (label.includes(':')) {
      const parts = label.split(':')
      issuer = parts[0]
      name = parts.slice(1).join(':')
    }

    return {
      name: name.trim(),
      secret: secret.trim().toUpperCase().replace(/\s/g, ''),
      issuer: issuer?.trim()
    }
  } catch (error) {
    throw new Error('Failed to parse otpauth URI')
  }
}
