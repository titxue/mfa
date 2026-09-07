/**
 * 纯 JS SHA-1 / HMAC-SHA1 实现（RFC 3174 / RFC 2104）
 * 用于 crypto.subtle 不可用的环境（如 http 非安全上下文页面中的内容脚本）
 */

/** 循环左移 */
function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

/**
 * SHA-1 摘要
 * @param message - 输入字节
 * @returns 20 字节摘要
 */
export function sha1(message: Uint8Array): Uint8Array {
  const ml = message.length
  // 预处理：追加 0x80、填充 0、追加 64 位大端长度（消息 < 2^32 字节，高 32 位为 0）
  const total = ml + 1 + ((56 - ((ml + 1) % 64) + 64) % 64) + 8
  const bytes = new Uint8Array(total)
  bytes.set(message)
  bytes[ml] = 0x80
  const view = new DataView(bytes.buffer)
  view.setUint32(total - 8, 0, false)
  view.setUint32(total - 4, ml * 8, false)

  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0

  const w = new Uint32Array(80)
  for (let i = 0; i < total; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false)
    }
    for (let j = 16; j < 80; j++) {
      w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1)
    }
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    for (let j = 0; j < 80; j++) {
      let f: number
      let k: number
      if (j < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (j < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }
      const temp = (rotl(a, 5) + f + e + k + w[j]) | 0
      e = d
      d = c
      c = rotl(b, 30)
      b = a
      a = temp
    }
    h0 = (h0 + a) | 0
    h1 = (h1 + b) | 0
    h2 = (h2 + c) | 0
    h3 = (h3 + d) | 0
    h4 = (h4 + e) | 0
  }

  const out = new Uint8Array(20)
  const ov = new DataView(out.buffer)
  ov.setUint32(0, h0, false)
  ov.setUint32(4, h1, false)
  ov.setUint32(8, h2, false)
  ov.setUint32(12, h3, false)
  ov.setUint32(16, h4, false)
  return out
}

/**
 * HMAC-SHA1（RFC 2104）
 * @param key - 密钥
 * @param message - 消息
 * @returns 20 字节 MAC
 */
export function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  let k = key
  if (k.length > 64) {
    k = sha1(k)
  }
  const ipad = new Uint8Array(64).fill(0x36)
  const opad = new Uint8Array(64).fill(0x5c)
  for (let i = 0; i < k.length; i++) {
    ipad[i] ^= k[i]
    opad[i] ^= k[i]
  }
  const inner = new Uint8Array(ipad.length + message.length)
  inner.set(ipad)
  inner.set(message, ipad.length)
  const innerHash = sha1(inner)
  const outer = new Uint8Array(opad.length + innerHash.length)
  outer.set(opad)
  outer.set(innerHash, opad.length)
  return sha1(outer)
}
