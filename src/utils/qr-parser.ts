import jsQR from 'jsqr'
import { parseOTPURI, type ImportChunk } from './otp-import'

/** Decode one QR symbol, which may contain an entire Google migration account list. */
export async function parseQRCodeFromFile(file: File): Promise<ImportChunk> {
  if (file.size > 16 * 1024 * 1024) throw new Error('invalid')
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('invalid'))
      img.src = url
    })
    if (!img.width || !img.height || img.width * img.height > 16_000_000) throw new Error('invalid')
    const canvas = document.createElement('canvas')
    canvas.width = img.width; canvas.height = img.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('invalid')
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(data.data, data.width, data.height)
    if (!code?.data) throw new Error('noQr')
    return parseOTPURI(code.data)
  } finally { URL.revokeObjectURL(url) }
}
