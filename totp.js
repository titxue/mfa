class TOTP {
  static base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  static base32Decode(base32) {
    let bits = '';
    const base32Upper = base32.toUpperCase().replace(/\s/g, '');

    for (let i = 0; i < base32Upper.length; i++) {
      const val = this.base32Chars.indexOf(base32Upper[i]);
      if (val === -1) throw new Error('Invalid base32 character');
      bits += val.toString(2).padStart(5, '0');
    }

    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
    }

    return bytes;
  }

  static async generateTOTP(secret, interval = 30) {
    // Base32 decode
    const key = this.base32Decode(secret);
    
    // Calculate current time step
    const timestamp = Math.floor(Date.now() / 1000 / interval);
    
    // Convert timestamp to buffer
    const timeBuffer = new ArrayBuffer(8);
    const view = new DataView(timeBuffer);
    view.setBigUint64(0, BigInt(timestamp), false);

    // Generate HMAC-SHA1
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const hmac = await crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
    const hmacArray = new Uint8Array(hmac);
    
    // Dynamic truncation
    const offset = hmacArray[19] & 0xf;
    const code = ((hmacArray[offset] & 0x7f) << 24) |
                ((hmacArray[offset + 1] & 0xff) << 16) |
                ((hmacArray[offset + 2] & 0xff) << 8) |
                (hmacArray[offset + 3] & 0xff);
    
    // Generate 6-digit code
    return (code % 1000000).toString().padStart(6, '0');
  }

  static getRemainingSeconds(interval = 30) {
    return interval - (Math.floor(Date.now() / 1000) % interval);
  }
} 