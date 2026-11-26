/**
 * 纯 JS SHA-256 / SHA-512 / HMAC 实现
 * SHA-256 遵循 RFC 6234，SHA-512 遵循 FIPS 180-4（用 BigInt 实现 64 位运算）
 * HMAC 遵循 RFC 2104。用于 crypto.subtle 不可用的环境（如 http 非安全上下文页面中的内容脚本），
 * 输出与 WebCrypto 对应算法完全一致。
 */

/** 循环左移 */
function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

/** 循环右移（SHA-256 的 Σ/σ 函数使用 ROTR 而非 ROTL） */
function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0
}

/** 64 位循环右移（BigInt） */
function rotr64(x: bigint, n: number): bigint {
  return (x >> BigInt(n)) | (x << BigInt(64 - n))
}

function hmac(key: Uint8Array, message: Uint8Array, blockSize: number, hash: (m: Uint8Array) => Uint8Array): Uint8Array {
  let k = key
  if (k.length > blockSize) {
    k = hash(k)
  }
  const ipad = new Uint8Array(blockSize).fill(0x36)
  const opad = new Uint8Array(blockSize).fill(0x5c)
  for (let i = 0; i < k.length; i++) {
    ipad[i] ^= k[i]
    opad[i] ^= k[i]
  }
  const inner = new Uint8Array(blockSize + message.length)
  inner.set(ipad)
  inner.set(message, blockSize)
  const innerHash = hash(inner)
  const outer = new Uint8Array(blockSize + innerHash.length)
  outer.set(opad)
  outer.set(innerHash, blockSize)
  return hash(outer)
}

/** 通用消息填充（64/128 字节分组，追加 0x80、填充 0、追加大端位长度） */
function pad(message: Uint8Array, blockSize: number): { bytes: Uint8Array; view: DataView } {
  const ml = message.length
  const lenBytes = blockSize === 64 ? 8 : 16
  // (ml + 1 + p) ≡ blockSize - lenBytes (mod blockSize)，保证总长恰为分组整数倍
  const p = (blockSize - lenBytes - ((ml + 1) % blockSize) + blockSize) % blockSize
  const total = ml + 1 + p + lenBytes
  const bytes = new Uint8Array(total)
  bytes.set(message)
  bytes[ml] = 0x80
  const view = new DataView(bytes.buffer)
  // 消息长度以位计，64 位大端；lenBytes 为 16 时高 8 字节恒为 0（消息 < 2^120 字节）
  const bitLength = BigInt(ml) * 8n
  for (let i = 0; i < 8; i++) {
    view.setUint8(total - 8 + i, Number((bitLength >> BigInt(8 * (7 - i))) & 0xffn))
  }
  return { bytes, view }
}

/** SHA-1（RFC 3174）——保持与原有 hmac-sha1.ts 一致的实现供统一入口使用 */
export function sha1(message: Uint8Array): Uint8Array {
  const { bytes, view } = pad(message, 64)
  const total = bytes.length

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

/** SHA-256 摘要（32 字节） */
export function sha256(message: Uint8Array): Uint8Array {
  const K = SHA256_K
  const H = new Uint32Array(SHA256_H)
  const { bytes, view } = pad(message, 64)

  const w = new Uint32Array(64)
  for (let i = 0; i < bytes.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false)
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3)
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10)
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7]
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K[j] + w[j]) | 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) | 0
      h = g; g = f; f = e; e = (d + temp1) | 0
      d = c; c = b; b = a; a = (temp1 + temp2) | 0
    }
    H[0] = (H[0] + a) | 0
    H[1] = (H[1] + b) | 0
    H[2] = (H[2] + c) | 0
    H[3] = (H[3] + d) | 0
    H[4] = (H[4] + e) | 0
    H[5] = (H[5] + f) | 0
    H[6] = (H[6] + g) | 0
    H[7] = (H[7] + h) | 0
  }

  const out = new Uint8Array(32)
  const ov = new DataView(out.buffer)
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, H[i], false)
  return out
}

/** HMAC-SHA-256（32 字节 MAC） */
export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  return hmac(key, message, 64, sha256)
}

// SHA-256 初始哈希值与轮常量（FIPS 180-4）
const SHA256_H = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]

/** SHA-512 摘要（64 字节，内部用 BigInt 实现 64 位运算） */
export function sha512(message: Uint8Array): Uint8Array {
  const K = SHA512_K
  const H = [...SHA512_H]
  const { bytes } = pad(message, 128)
  const view = new DataView(bytes.buffer)

  const w = new Array<bigint>(80)
  for (let i = 0; i < bytes.length; i += 128) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getBigUint64(i + j * 8, false)
    }
    for (let j = 16; j < 80; j++) {
      const s0 = rotr64(w[j - 15], 1) ^ rotr64(w[j - 15], 8) ^ (w[j - 15] >> 7n)
      const s1 = rotr64(w[j - 2], 19) ^ rotr64(w[j - 2], 61) ^ (w[j - 2] >> 6n)
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) & 0xffffffffffffffffn
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7]
    for (let j = 0; j < 80; j++) {
      const S1 = rotr64(e, 14) ^ rotr64(e, 18) ^ rotr64(e, 41)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K[j] + w[j]) & 0xffffffffffffffffn
      const S0 = rotr64(a, 28) ^ rotr64(a, 34) ^ rotr64(a, 39)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) & 0xffffffffffffffffn
      h = g; g = f; f = e; e = (d + temp1) & 0xffffffffffffffffn
      d = c; c = b; b = a; a = (temp1 + temp2) & 0xffffffffffffffffn
    }
    H[0] = (H[0] + a) & 0xffffffffffffffffn
    H[1] = (H[1] + b) & 0xffffffffffffffffn
    H[2] = (H[2] + c) & 0xffffffffffffffffn
    H[3] = (H[3] + d) & 0xffffffffffffffffn
    H[4] = (H[4] + e) & 0xffffffffffffffffn
    H[5] = (H[5] + f) & 0xffffffffffffffffn
    H[6] = (H[6] + g) & 0xffffffffffffffffn
    H[7] = (H[7] + h) & 0xffffffffffffffffn
  }

  const out = new Uint8Array(64)
  const ov = new DataView(out.buffer)
  for (let i = 0; i < 8; i++) ov.setBigUint64(i * 8, H[i], false)
  return out
}

/** HMAC-SHA-512（64 字节 MAC） */
export function hmacSha512(key: Uint8Array, message: Uint8Array): Uint8Array {
  return hmac(key, message, 128, sha512)
}

const SHA512_H = [
  0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n
]
const SHA512_K = [
  0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
  0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
  0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
  0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
  0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
  0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
  0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
  0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
  0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
  0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
  0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
  0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n,
  0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
  0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn,
  0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n
]
