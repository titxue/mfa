// Frozen compatibility oracle from a9be25f:src/utils/qr-parser.ts (store 2.3.8).
// Only the unrelated image/FileReader decoder is omitted. Keep the parser unchanged:
// updating this fixture with the current parser would hide old-store incompatibilities.

export class UnsupportedTOTPParametersError extends Error {
  constructor() { super('Only SHA1 with a 30-second period, standard 6-digit TOTP or Steam Guard is supported') }
}

export interface ParsedQRData {
  name: string
  secret: string
  issuer?: string
  type?: 'steam'
}

export function parseOtpauthURI(uri: string): ParsedQRData {
  // 验证 URI 格式
  if (!uri.startsWith('otpauth://totp/')) {
    throw new Error('Invalid otpauth URI format')
  }

  try {
    const url = new URL(uri)

    if (url.searchParams.getAll('encoder').some(value => value.toLowerCase() !== 'steam')) {
      throw new UnsupportedTOTPParametersError()
    }
    const steam = url.searchParams.get('encoder')?.toLowerCase() === 'steam' ||
      url.searchParams.get('issuer')?.toLowerCase() === 'steam' ||
      decodeURIComponent(url.pathname).toLowerCase().startsWith('/steam:')
    const supported = { algorithm: 'SHA1', digits: steam ? '5' : '6', period: '30' }
    for (const [parameter, expected] of Object.entries(supported)) {
      if (url.searchParams.getAll(parameter).some(value => value.toUpperCase() !== expected && !(steam && parameter === 'digits' && value === '6'))) {
        throw new UnsupportedTOTPParametersError()
      }
    }

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
      ...(steam ? { type: 'steam' as const } : {}),
      name: name.trim(),
      secret: secret.trim().toUpperCase().replace(/\s/g, ''),
      issuer: issuer?.trim()
    }
  } catch (error) {
    if (error instanceof UnsupportedTOTPParametersError) throw error
    throw new Error('Failed to parse otpauth URI')
  }
}
