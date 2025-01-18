document.addEventListener('DOMContentLoaded', async () => {
  const accountInput = document.getElementById('account');
  const secretInput = document.getElementById('secret');
  const saveButton = document.getElementById('save');
  const cancelButton = document.getElementById('cancel');
  const addNewButton = document.getElementById('addNew');
  const formContainer = document.getElementById('formContainer');
  const accountList = document.getElementById('accountList');
  const container = document.querySelector('.container');
  const progressTemplate = document.getElementById('progressRingTemplate');
  const toastContainer = document.getElementById('toastContainer');
  const settingsButton = document.getElementById('settings');
  const settingsContainer = document.getElementById('settingsContainer');
  const settingsSaveButton = document.getElementById('settingsSave');
  const settingsCancelButton = document.getElementById('settingsCancel');
  const apiKeyInput = document.getElementById('apiKey');

  let accounts = [];
  let accountItems = [];
  let apiKey = '';

  // 初始化空状态界面
  accountList.innerHTML = `
    <div class="empty-state">
      <svg class="empty-state-icon" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
      </svg>
      <div>暂无账户</div>
      <div style="margin-top: 8px; font-size: 12px; opacity: 0.7">点击右上角添加账户开始使用</div>
    </div>
  `;

  // 保存设置
  function saveSettings() {
    chrome.storage.local.set({ apiKey: apiKeyInput.value });
    apiKey = apiKeyInput.value;
    settingsContainer.classList.remove('show');
    // 通知 background 更新
    chrome.runtime.sendMessage({ type: 'settingsUpdated' });
  }

  // 调用 DeepSeek API
  async function callDeepSeekAPI(prompt) {
    if (!apiKey) {
      throw new Error('请先设置 API Key');
    }

    showToast('正在分析页面...', 1000);
    console.log('发送到 AI 的提示词:', prompt);

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
    console.log('AI 响应:', data);
    return data.choices[0].message.content.trim();
  }

  // 保存表单状态和滚动位置
  function saveState() {
    const state = {
      formVisible: formContainer.classList.contains('show'),
      accountValue: accountInput.value,
      secretValue: secretInput.value,
      scrollTop: container.scrollTop
    };
    chrome.storage.local.set({ state });
  }

  // 创建圆形进度条
  function createProgressRing() {
    const progressRing = progressTemplate.content.cloneNode(true);
    const circle = progressRing.querySelector('.progress');
    const text = progressRing.querySelector('.progress-text');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;

    return {
      container: progressRing,
      circle,
      text,
      circumference
    };
  }

  // 更新进度条
  function setProgress(circle, text, circumference, percent) {
    const offset = circumference - (percent / 100 * circumference);
    circle.style.strokeDashoffset = offset;
    text.textContent = Math.ceil(percent / (100/30));
  }

  // 保存账户
  async function saveAccounts() {
    await chrome.storage.sync.set({ accounts });
    accountItems = await renderAccounts();
    // 通知 background 更新
    chrome.runtime.sendMessage({ type: 'accountsUpdated' });
  }

  // 显示 Toast 消息
  function showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toastContainer.removeChild(toast);
      }, 300);
    }, duration);
  }

  // 创建账户项
  async function createAccountItem(account) {
    const code = await TOTP.generateTOTP(account.secret);
    const formattedCode = code.match(/.{1,3}/g).join(' ');
    
    const accountItem = document.createElement('div');
    accountItem.className = 'account-item';
    accountItem.dataset.account = account.name;
    accountItem.dataset.secret = account.secret;
    accountItem.style.backgroundColor = 'white';

    const accountInfo = document.createElement('div');
    accountInfo.className = 'account-info';
    accountInfo.innerHTML = `
      <div class="account-name">${account.name}</div>
      <div class="account-code">${formattedCode}</div>
    `;

    const progress = createProgressRing();
    const remainingSeconds = TOTP.getRemainingSeconds();
    const percentage = (remainingSeconds / 30) * 100;
    setProgress(progress.circle, progress.text, progress.circumference, percentage);

    accountItem.appendChild(accountInfo);
    accountItem.appendChild(progress.container);

    let pressTimer;
    let isLongPress = false;

    const handlePress = () => {
      pressTimer = setTimeout(() => {
        isLongPress = true;
        accountItem.style.backgroundColor = '#ffebee';
        const confirmDelete = confirm(`确定要删除账户 "${account.name}" 吗？`);
        if (confirmDelete) {
          accounts = accounts.filter(a => a.name !== account.name);
          saveAccounts();
        }
        accountItem.style.backgroundColor = 'white';
      }, 800);
    };

    const handleRelease = async () => {
      clearTimeout(pressTimer);
      if (!isLongPress) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          try {
            // 注入填充脚本
            const fillResult = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (code) => {
                const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
                console.log('找到的输入框:', inputs.length);
                
                // 查找可能的 TOTP 输入框
                const totpInput = Array.from(inputs).find(input => {
                  const attrs = input.getAttributeNames();
                  const matched = attrs.some(attr => {
                    const value = input.getAttribute(attr).toLowerCase();
                    return value.includes('otp') || 
                           value.includes('2fa') || 
                           value.includes('totp') || 
                           value.includes('authenticator') ||
                           value.includes('verification') ||
                           value.includes('security') ||
                           value.includes('code');
                  });
                  if (matched) {
                    console.log('找到匹配的输入框:', input);
                  }
                  return matched;
                });

                if (totpInput) {
                  totpInput.value = code.replace(/\s/g, '');
                  totpInput.dispatchEvent(new Event('input', { bubbles: true }));
                  totpInput.dispatchEvent(new Event('change', { bubbles: true }));
                  return true;
                }
                return false;
              },
              args: [code]
            });
            console.log('填充结果:', fillResult);
            
            if (fillResult[0].result) {
              showToast('验证码已自动填充');
            } else {
              await navigator.clipboard.writeText(code);
              showToast('验证码已复制到剪贴板');
            }
          } catch (error) {
            console.error('自动填充失败:', error);
            // 如果自动填充失败，则复制到剪贴板
            await navigator.clipboard.writeText(code);
            showToast('验证码已复制到剪贴板');
          }
        } else {
          await navigator.clipboard.writeText(code);
          showToast('验证码已复制到剪贴板');
        }
      }
      isLongPress = false;
    };

    const handleCancel = () => {
      clearTimeout(pressTimer);
      accountItem.style.backgroundColor = 'white';
      isLongPress = false;
    };

    // 鼠标事件
    accountItem.addEventListener('mousedown', handlePress);
    accountItem.addEventListener('mouseup', handleRelease);
    accountItem.addEventListener('mouseleave', handleCancel);

    // 触摸事件
    accountItem.addEventListener('touchstart', handlePress);
    accountItem.addEventListener('touchend', handleRelease);
    accountItem.addEventListener('touchcancel', handleCancel);

    return {
      element: accountItem,
      updateCode: async () => {
        const newCode = await TOTP.generateTOTP(account.secret);
        const formattedNewCode = newCode.match(/.{1,3}/g).join(' ');
        accountInfo.querySelector('.account-code').textContent = formattedNewCode;
      },
      updateProgress: () => {
        const remainingSeconds = TOTP.getRemainingSeconds();
        const percentage = (remainingSeconds / 30) * 100;
        setProgress(progress.circle, progress.text, progress.circumference, percentage);
      }
    };
  }

  // 渲染账户列表
  async function renderAccounts() {
    if (accounts.length === 0) {
      accountList.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
          </svg>
          <div>暂无账户</div>
          <div style="margin-top: 8px; font-size: 12px; opacity: 0.7">点击右上角添加账户开始使用</div>
        </div>
      `;
      return [];
    }

    const fragment = document.createDocumentFragment();
    const accountItems = await Promise.all(accounts.map(createAccountItem));
    accountItems.forEach(item => fragment.appendChild(item.element));

    accountList.innerHTML = '';
    accountList.appendChild(fragment);

    return accountItems;
  }

  // 更新所有账户
  function updateAll() {
    if (accountItems.length > 0) {
      const remainingSeconds = TOTP.getRemainingSeconds();
      accountItems.forEach(item => {
        item.updateProgress();
        if (remainingSeconds === 30) {
          item.updateCode();
        }
      });
    }
  }

  // 事件监听
  addNewButton.addEventListener('click', () => {
    formContainer.classList.add('show');
    saveState();
  });

  saveButton.addEventListener('click', async () => {
    const name = accountInput.value.trim();
    const secret = secretInput.value.trim();

    if (!name || !secret) {
      alert('请填写所有字段');
      return;
    }

    try {
      await TOTP.generateTOTP(secret);
      accounts.push({ name, secret });
      await saveAccounts();
      formContainer.classList.remove('show');
      accountInput.value = '';
      secretInput.value = '';
      saveState();
    } catch (error) {
      alert('无效的密钥格式');
    }
  });

  cancelButton.addEventListener('click', () => {
    formContainer.classList.remove('show');
    accountInput.value = '';
    secretInput.value = '';
    saveState();
  });

  accountInput.addEventListener('input', saveState);
  secretInput.addEventListener('input', saveState);
  container.addEventListener('scroll', saveState);

  // 设置相关事件监听
  settingsButton.addEventListener('click', () => {
    settingsContainer.classList.add('show');
    apiKeyInput.value = apiKey;
  });

  settingsSaveButton.addEventListener('click', saveSettings);

  settingsCancelButton.addEventListener('click', () => {
    settingsContainer.classList.remove('show');
    apiKeyInput.value = apiKey;
  });

  // 初始化
  try {
    const [stateResult, accountsResult, settingsResult] = await Promise.all([
      chrome.storage.local.get('state'),
      chrome.storage.sync.get('accounts'),
      chrome.storage.local.get('apiKey')
    ]);

    accounts = accountsResult.accounts || [];
    apiKey = settingsResult.apiKey || '';
    
    if (accounts.length > 0) {
      accountItems = await renderAccounts();
    }

    if (stateResult.state) {
      const { state } = stateResult;
      if (state.formVisible) {
        formContainer.classList.add('show');
      }
      accountInput.value = state.accountValue || '';
      secretInput.value = state.secretValue || '';
      if (state.scrollTop) {
        container.scrollTop = state.scrollTop;
      }
    }
    
    setInterval(updateAll, 1000);
  } catch (error) {
    console.error('初始化失败:', error);
    accountList.innerHTML = `
      <div class="empty-state" style="color: #d93025;">
        <span>加载失败，请重试</span>
      </div>
    `;
  }
}); 