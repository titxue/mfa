// TOTP 实现
const TOTP = {
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

// 公共函数
const Utils = {
  // 检查输入框是否是 TOTP 输入框
  isTOTPInput: (input) => {
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
  },

  // 收集页面信息
  collectPageInfo: () => {
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
  },

  // 填充验证码
  fillTOTPCode: (code) => {
    const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
    const totpInput = Array.from(inputs).find(Utils.isTOTPInput);

    if (totpInput) {
      totpInput.value = code.replace(/\s/g, '');
      totpInput.dispatchEvent(new Event('input', { bubbles: true }));
      totpInput.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }
};

// 调用 DeepSeek API
async function callDeepSeekAPI(prompt, apiKey) {
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
      messages: [{ role: 'user', content: prompt }],
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

// 分析页面并自动填充
async function analyzeAndFill(tab) {
  try {
    // 获取 API key 和账户列表
    const [{ apiKey }, { accounts }] = await Promise.all([
      chrome.storage.local.get('apiKey'),
      chrome.storage.sync.get('accounts')
    ]);

    if (!apiKey) {
      console.log('未设置 API Key，跳过自动填充');
      return;
    }

    if (!accounts?.length) {
      console.log('无可用账户，跳过自动填充');
      return;
    }

    // 检查是否有 TOTP 输入框
    const [hasInput] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        function isTOTPInput(input) {
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
        }

        const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
        console.log('找到的输入框数量:', inputs.length);
        const hasTotp = Array.from(inputs).some(input => {
          const isTotp = isTOTPInput(input);
          if (isTotp) {
            console.log('找到 TOTP 输入框:', input);
          }
          return isTotp;
        });
        console.log('是否有 TOTP 输入框:', hasTotp);
        return hasTotp;
      }
    });

    if (!hasInput?.result) {
      console.log('未找到验证码输入框，跳过自动填充');
      return;
    }

    // 收集页面信息
    const [pageResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: Utils.collectPageInfo
    });

    if (!pageResult?.result) {
      console.log('无法获取页面信息，跳过自动填充');
      return;
    }

    const pageInfo = pageResult.result;
    console.log('收集到的页面信息:', pageInfo);

    // 使用 AI 分析页面内容和账户列表
    const prompt = `
      我正在浏览一个网页，需要你帮我从以下账户列表中选择最合适的账户来填写验证码。
      
      页面信息：
      - 标题: ${pageInfo.title}
      - 域名: ${pageInfo.domain}
      - 页面文本: ${pageInfo.texts.join(' ')}
      - 表单标签: ${pageInfo.labels.join(' ')}
      
      账户列表：
      ${accounts.map(a => `- ${a.name}`).join('\n')}
      
      请分析页面内容和账户列表，选择最合适的账户。只需要返回账户名称，不需要其他解释。
      如果没有合适的账户，返回空字符串。
    `;

    const matchedAccountName = await callDeepSeekAPI(prompt, apiKey);
    console.log('AI 选择的账户:', matchedAccountName);

    if (!matchedAccountName) {
      console.log('未找到匹配的账户，跳过自动填充');
      return;
    }

    const matchedAccount = accounts.find(a => a.name === matchedAccountName);
    if (!matchedAccount) {
      console.log('未找到匹配的账户，跳过自动填充');
      return;
    }

    // 生成并填充验证码
    const code = await TOTP.generateTOTP(matchedAccount.secret);
    const [fillResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (code) => {
        function isTOTPInput(input) {
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
        }

        const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
        console.log('准备填充验证码，找到的输入框数量:', inputs.length);
        
        const totpInput = Array.from(inputs).find(input => {
          const isTotp = isTOTPInput(input);
          if (isTotp) {
            console.log('找到要填充的 TOTP 输入框:', input);
          }
          return isTotp;
        });

        if (totpInput) {
          const cleanCode = code.replace(/\s/g, '');
          console.log('填充验证码:', cleanCode);
          totpInput.value = cleanCode;
          totpInput.dispatchEvent(new Event('input', { bubbles: true }));
          totpInput.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, value: cleanCode };
        }
        return { success: false };
      },
      args: [code]
    });

    if (fillResult?.result?.success) {
      console.log('自动填充成功，验证码:', fillResult.result.value);
    } else {
      console.log('自动填充失败');
    }
  } catch (error) {
    console.error('自动填充失败:', error);
  }
}

// 监听页面加载完成事件
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0) { // 只处理主框架
    const tab = await chrome.tabs.get(details.tabId);
    if (tab.url.startsWith('http')) { // 只处理 http/https 页面
      await analyzeAndFill(tab);
    }
  }
}); 