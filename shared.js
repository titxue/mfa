// TOTP 实现
export const TOTP = {
  dec2hex: (s) => (s < 15.5 ? '0' : '') + Math.round(s).toString(16),
  hex2dec: (s) => parseInt(s, 16),
  base32tohex: (base32) => {
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let hex = '';
    for (let i = 0; i < base32.length; i++) {
      const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
      bits += val.toString(2).padStart(5, '0');
    }
    for (let i = 0; i + 4 <= bits.length; i += 4) {
      const chunk = bits.substr(i, 4);
      hex = hex + parseInt(chunk, 2).toString(16);
    }
    return hex;
  },
  getRemainingSeconds: () => {
    return 30 - Math.floor(Date.now() / 1000) % 30;
  },
  generateOTP: async (secret) => {
    const key = TOTP.base32tohex(secret);
    const epoch = Math.round(Date.now() / 1000.0);
    const time = Math.floor(epoch / 30);
    const timeHex = time.toString(16).padStart(16, '0');
    
    const shaObj = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(key.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16))),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const hmac = await crypto.subtle.sign(
      'HMAC',
      shaObj,
      new Uint8Array(timeHex.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)))
    );
    
    const hmacResult = Array.from(new Uint8Array(hmac))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const offset = TOTP.hex2dec(hmacResult.substring(hmacResult.length - 1));
    let otp = (TOTP.hex2dec(hmacResult.substr(offset * 2, 8)) & TOTP.hex2dec('7fffffff')) + '';
    otp = otp.substring(otp.length - 6, otp.length);
    return otp;
  },
  generateTOTP: async (secret) => {
    try {
      return await TOTP.generateOTP(secret.replace(/\s/g, ''));
    } catch (error) {
      console.error('生成 TOTP 失败:', error);
      throw error;
    }
  }
};

// 调用 DeepSeek API
export async function callDeepSeekAPI(prompt, apiKey) {
  if (!apiKey) {
    throw new Error('请先设置 API Key');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 100
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('API 错误:', error);
    throw new Error(`API 调用失败: ${error.error?.message || '未知错误'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// 查找 TOTP 输入框
export function findTOTPInput() {
  const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
  return Array.from(inputs).find(input => {
    const attrs = input.getAttributeNames();
    return attrs.some(attr => {
      const value = input.getAttribute(attr).toLowerCase();
      return value.includes('otp') || 
             value.includes('2fa') || 
             value.includes('totp') || 
             value.includes('authenticator') ||
             value.includes('verification') ||
             value.includes('security') ||
             value.includes('code');
    });
  });
}

// 填充 TOTP 验证码
export function fillTOTPCode(input, code) {
  if (input) {
    input.value = code.replace(/\s/g, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

// 收集页面信息
export function collectPageInfo() {
  const pageInfo = {
    title: document.title,
    domain: window.location.hostname,
    texts: [],
    labels: []
  };

  // 收集所有可见文本
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const style = window.getComputedStyle(node.parentElement);
        return style.display !== 'none' && style.visibility !== 'hidden' && node.textContent.trim() ? 
               NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.trim();
    if (text) pageInfo.texts.push(text);
  }

  // 收集所有表单标签
  document.querySelectorAll('label').forEach(label => {
    const text = label.textContent.trim();
    if (text) pageInfo.labels.push(text);
  });

  return pageInfo;
} 