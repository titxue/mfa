/**
 * TOTP (Time-based One-Time Password) 算法实现
 * 符合 RFC 6238 标准
 */

import { hmacSha1 } from './hmac-sha1'
import type { Account } from '@/types'

export class TOTP {
  private static readonly BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

  static base32Encode(bytes: Uint8Array): string {
    let result = '', bits = 0, buffer = 0
    for (const byte of bytes) {
      buffer = (buffer << 8) | byte; bits += 8
      while (bits >= 5) { bits -= 5; result += this.BASE32_CHARS[(buffer >>> bits) & 31] }
    }
    if (bits) result += this.BASE32_CHARS[(buffer << (5 - bits)) & 31]
    return result
  }

  /** maFile shared_secret is case-sensitive Base64; vault secrets are always Base32. */
  static steamSecretToBase32(value: string): string {
    const encoded = value.replace(/\s/g, '')
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('invalid')
    const decoded = atob(encoded)
    if (!decoded.length || btoa(decoded).replace(/=+$/, '') !== encoded.replace(/=+$/, '')) throw new Error('invalid')
    return this.base32Encode(Uint8Array.from(decoded, c => c.charCodeAt(0)))
  }

  static steamSecretToBase64(secret: string): string {
    return btoa(Array.from(this.base32Decode(secret), byte => String.fromCharCode(byte)).join(''))
  }

  /**
   * Base32 解码
   * @param base32 - Base32 编码的字符串
   * @returns 解码后的字节数组
   */
  static base32Decode(base32: string): Uint8Array {
    let bits = ''
    const base32Upper = base32.toUpperCase().replace(/\s/g, '')

    for (let i = 0; i < base32Upper.length; i++) {
      const val = this.BASE32_CHARS.indexOf(base32Upper[i])
      if (val === -1) {
        throw new Error('Invalid base32 character')
      }
      bits += val.toString(2).padStart(5, '0')
    }

    const bytes = new Uint8Array(Math.floor(bits.length / 8))
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.substr(i * 8, 8), 2)
    }

    return bytes
  }

  /**
   * 生成 TOTP 验证码
   * 优先使用 WebCrypto（crypto.subtle），不可用时（如 http 页面上的内容脚本）回退到纯 JS HMAC-SHA1
   * @param secret - Base32 编码的密钥
   * @param interval - 时间间隔（秒），默认 30 秒
   * @param type - 标准 TOTP 或 Steam Guard（均使用 Base32 存储密钥）
   * @param now - 毫秒时间戳；默认系统时间，本地绑定助手核对时可传 Steam 服务端时间
   * @returns 6 位数字 TOTP 或 5 位字母数字 Steam Guard 验证码
   */
  static async generateTOTP(secret: string, interval: number = 30, type: Account['type'] = 'totp', now: number = Date.now()): Promise<string> {
    if (type !== 'totp' && type !== 'steam') throw new Error('invalid')
    if (type === 'steam' && interval !== 30) throw new Error('invalid')
    // Base32 解码
    const key = this.base32Decode(secret)
    if (!key.length) throw new Error('invalid')

    // 计算当前时间步
    const timestamp = Math.floor(now / 1000 / interval)

    // 将时间戳转换为 8 字节大端 buffer
    const timeBuffer = new ArrayBuffer(8)
    const view = new DataView(timeBuffer)
    view.setBigUint64(0, BigInt(timestamp), false)

    // 生成 HMAC-SHA1
    let hmacArray: Uint8Array
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key as BufferSource,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      )
      const hmac = await crypto.subtle.sign('HMAC', cryptoKey, timeBuffer)
      hmacArray = new Uint8Array(hmac)
    } else {
      // 非安全上下文回退：纯 JS 实现（输出与 WebCrypto 一致）
      hmacArray = hmacSha1(key, new Uint8Array(timeBuffer))
    }

    // 动态截断
    const offset = hmacArray[19] & 0xf
    let code = ((hmacArray[offset] & 0x7f) << 24) |
                ((hmacArray[offset + 1] & 0xff) << 16) |
                ((hmacArray[offset + 2] & 0xff) << 8) |
                (hmacArray[offset + 3] & 0xff)

    if (type === 'steam') {
      const alphabet = '23456789BCDFGHJKMNPQRTVWXY'
      let result = ''
      for (let i = 0; i < 5; i++) {
        result += alphabet[code % alphabet.length]
        code = Math.floor(code / alphabet.length)
      }
      return result
    }
    // 生成 6 位验证码
    return (code % 1000000).toString().padStart(6, '0')
  }

  /**
   * 获取当前周期剩余秒数
   * @param interval - 时间间隔（秒），默认 30 秒
   * @returns 剩余秒数
   */
  static getRemainingSeconds(interval: number = 30): number {
    return interval - (Math.floor(Date.now() / 1000) % interval)
  }

  /**
   * 格式化验证码显示（3位数字分组）
   * @param code - 6位验证码
   * @returns 格式化后的验证码（如 "123 456"）
   */
  static formatCode(code: string): string {
    return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code
  }
}
