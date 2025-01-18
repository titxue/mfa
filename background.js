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

// 分析页面并自动填充
async function analyzeAndFill(tab) {
  try {
    // 获取 API key
    const { apiKey } = await chrome.storage.local.get('apiKey');
    if (!apiKey) {
      console.log('未设置 API Key，跳过自动填充');
      return;
    }

    // 获取账户列表
    const { accounts } = await chrome.storage.sync.get('accounts');
    if (!accounts || accounts.length === 0) {
      console.log('无可用账户，跳过自动填充');
      return;
    }

    // 收集页面信息
    const [pageResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
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
    });

    if (!pageResult?.result) {
      console.log('无法获取页面信息，跳过自动填充');
      return;
    }

    const pageInfo = pageResult.result;
    console.log('收集到的页面信息:', pageInfo);

    // 检查是否有可能的 TOTP 输入框
    const [hasInput] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
        return Array.from(inputs).some(input => {
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
    });

    if (!hasInput?.result) {
      console.log('未找到验证码输入框，跳过自动填充');
      return;
    }

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

    // 生成验证码
    const { default: TOTP } = await import(chrome.runtime.getURL('totp.js'));
    const code = await TOTP.generateTOTP(matchedAccount.secret);

    // 填充验证码
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (code) => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
        const totpInput = Array.from(inputs).find(input => {
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

        if (totpInput) {
          totpInput.value = code.replace(/\s/g, '');
          totpInput.dispatchEvent(new Event('input', { bubbles: true }));
          totpInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      args: [code]
    });

    console.log('自动填充完成');
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