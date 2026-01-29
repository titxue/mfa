/**
 * TOTP (Time-based One-Time Password) 算法实现
 * 符合 RFC 6238 标准
 */

export class TOTP {
  private static readonly BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

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
   * @param secret - Base32 编码的密钥
   * @param interval - 时间间隔（秒），默认 30 秒
   * @returns 6 位 TOTP 验证码
   */
  static async generateTOTP(secret: string, interval: number = 30): Promise<string> {
    // Base32 解码
    const key = this.base32Decode(secret)

    // 计算当前时间步
    const timestamp = Math.floor(Date.now() / 1000 / interval)

    // 将时间戳转换为 buffer
    const timeBuffer = new ArrayBuffer(8)
    const view = new DataView(timeBuffer)
    view.setBigUint64(0, BigInt(timestamp), false)

    // 生成 HMAC-SHA1
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key as BufferSource,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    )

    const hmac = await crypto.subtle.sign('HMAC', cryptoKey, timeBuffer)
    const hmacArray = new Uint8Array(hmac)

    // 动态截断
    const offset = hmacArray[19] & 0xf
    const code = ((hmacArray[offset] & 0x7f) << 24) |
                ((hmacArray[offset + 1] & 0xff) << 16) |
                ((hmacArray[offset + 2] & 0xff) << 8) |
                (hmacArray[offset + 3] & 0xff)

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
    return `${code.slice(0, 3)} ${code.slice(3)}`
  }
}
