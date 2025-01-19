// 核心配置
const CONFIG = {
  API_ENDPOINT: 'https://api.deepseek.com/v1/chat/completions',
  TOTP_KEYWORDS: ['otp', '2fa', 'totp', 'authenticator', 'verification', 'security', 'code', 'security code', '安全码'],
  TOAST_DURATION: 2000,
  AI_MODEL: 'deepseek-chat'
};

// 存储管理模块
const StorageManager = {
  async getAccounts() {
    const { accounts } = await chrome.storage.sync.get('accounts');
    return accounts || [];
  },

  async saveAccounts(accounts) {
    await chrome.storage.sync.set({ accounts });
  },

  async getApiKey() {
    const { apiKey } = await chrome.storage.local.get('apiKey');
    return apiKey || '';
  },

  async saveApiKey(apiKey) {
    await chrome.storage.local.set({ apiKey });
  },

  async saveState(state) {
    await chrome.storage.local.set({ state });
  }
};

// UI 管理模块
const UIManager = {
  elements: {},

  init(elements) {
    this.elements = elements;
    this.setupEmptyState();
  },

  setupEmptyState() {
    this.elements.accountList.innerHTML = `
    <div class="empty-state">
      <svg class="empty-state-icon" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
      </svg>
      <div>暂无账户</div>
      <div style="margin-top: 8px; font-size: 12px; opacity: 0.7">点击右上角添加账户开始使用</div>
    </div>
  `;
  },

  setupAIButton() {
    const aiButton = document.createElement('button');
    aiButton.className = 'ai-analyze-button';
    aiButton.innerHTML = `
      <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 4px;">
        <path fill="currentColor" d="M12,16A3,3 0 0,1 9,13C9,11.88 9.61,10.9 10.5,10.39L20.21,4.77L14.68,14.35C14.18,15.33 13.17,16 12,16M12,3C13.81,3 15.5,3.5 16.97,4.32L14.87,5.53C14,5.19 13,5 12,5A8,8 0 0,0 4,13C4,17.42 7.58,21 12,21C16.42,21 20,17.42 20,13C20,12 19.81,11 19.47,10.13L20.68,8.03C21.5,9.5 22,11.18 22,13A10,10 0 0,1 12,23A10,10 0 0,1 2,13A10,10 0 0,1 12,3M14,8A2,2 0 0,1 16,10A2,2 0 0,1 14,12A2,2 0 0,1 12,10A2,2 0 0,1 14,8Z"/>
      </svg>
      AI 分析
    `;
    this.elements.container.insertBefore(aiButton, this.elements.accountList);
    return aiButton;
  },

  showToast(message, duration = CONFIG.TOAST_DURATION) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.elements.toastContainer.appendChild(toast);

    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        this.elements.toastContainer.removeChild(toast);
      }, 300);
    }, duration);
  },

  createProgressRing() {
    const progressRing = this.elements.progressTemplate.content.cloneNode(true);
    const circle = progressRing.querySelector('.progress');
    const text = progressRing.querySelector('.progress-text');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;

    return { container: progressRing, circle, text, circumference };
  },

  setProgress(circle, text, circumference, percent) {
    const offset = circumference - (percent / 100 * circumference);
    circle.style.strokeDashoffset = offset;
    text.textContent = Math.ceil(percent / (100/30));
  }
};

// 页面分析模块
const PageAnalyzer = {
  async findTOTPInput(tab) {
    return chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (keywords) => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
        return Array.from(inputs).some(input => {
          const attrs = input.getAttributeNames();
          return attrs.some(attr => {
            const value = input.getAttribute(attr).toLowerCase();
            return keywords.some(keyword => value.includes(keyword));
          });
        });
      },
      args: [CONFIG.TOTP_KEYWORDS]
    });
  },

  async collectPageInfo(tab) {
    return chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const pageInfo = {
          title: document.title,
          domain: window.location.hostname,
          texts: [],
          labels: []
        };

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

        document.querySelectorAll('label').forEach(label => {
          const text = label.textContent.trim();
          if (text) pageInfo.labels.push(text);
        });

        return pageInfo;
      }
    });
  },

  async fillCode(tab, code) {
    return chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (code, keywords) => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
        const totpInput = Array.from(inputs).find(input => {
          const attrs = input.getAttributeNames();
          return attrs.some(attr => {
            const value = input.getAttribute(attr).toLowerCase();
            return keywords.some(keyword => value.includes(keyword));
          });
        });

        if (totpInput) {
          const cleanCode = code.replace(/\s/g, '');
          totpInput.value = cleanCode;
          totpInput.dispatchEvent(new Event('input', { bubbles: true }));
          totpInput.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, value: cleanCode };
        }
        return { success: false };
      },
      args: [code, CONFIG.TOTP_KEYWORDS]
    });
  }
};

// AI 服务模块
const AIService = {
  async analyze(pageInfo, accounts, apiKey) {
    if (!apiKey) {
      throw new Error('请先设置 API Key');
    }

    const prompt = this.generatePrompt(pageInfo, accounts);
    const response = await fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: CONFIG.AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API 调用失败: ${error.error?.message || '未知错误'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  },

  generatePrompt(pageInfo, accounts) {
    return `
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
  }
};

// 主应用控制器
const App = {
  // 添加验证码管理器
  codeManager: {
    codes: new Map(), // 存储账户的当前验证码
    async updateCodes() {
      for (const account of App.accounts) {
        const code = await TOTP.generateTOTP(account.secret);
        this.codes.set(account.name, {
          code,
          formatted: code.match(/.{1,3}/g).join(' ')
        });
      }
    },
    getCode(accountName) {
      return this.codes.get(accountName);
    }
  },

  async init() {
    const elements = {
      accountInput: document.getElementById('account'),
      secretInput: document.getElementById('secret'),
      saveButton: document.getElementById('save'),
      cancelButton: document.getElementById('cancel'),
      addNewButton: document.getElementById('addNew'),
      formContainer: document.getElementById('formContainer'),
      accountList: document.getElementById('accountList'),
      container: document.querySelector('.container'),
      progressTemplate: document.getElementById('progressRingTemplate'),
      toastContainer: document.getElementById('toastContainer'),
      settingsButton: document.getElementById('settings'),
      settingsContainer: document.getElementById('settingsContainer'),
      settingsSaveButton: document.getElementById('settingsSave'),
      settingsCancelButton: document.getElementById('settingsCancel'),
      apiKeyInput: document.getElementById('apiKey')
    };

    UIManager.init(elements);
    
    try {
      const [stateResult, accountsResult, settingsResult] = await Promise.all([
        chrome.storage.local.get('state'),
        StorageManager.getAccounts(),
        StorageManager.getApiKey()
      ]);

      this.accounts = accountsResult;
      this.apiKey = settingsResult;
      
      // 初始生成所有验证码
      await this.codeManager.updateCodes();
      this.accountItems = await this.renderAccounts();

      if (stateResult.state) {
        const { state } = stateResult;
        if (state.formVisible) {
          elements.formContainer.classList.add('show');
        }
        elements.accountInput.value = state.accountValue || '';
        elements.secretInput.value = state.secretValue || '';
        if (state.scrollTop) {
          elements.container.scrollTop = state.scrollTop;
        }
      }

      this.setupEventListeners(elements);
      this.startUpdateTimer();

      // 自动触发 AI 分析
      if (this.apiKey && this.accounts.length > 0) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && tab.url.startsWith('http')) {
          const hasInput = await PageAnalyzer.findTOTPInput(tab);
          if (hasInput[0].result) {
            this.analyzeAndFill().catch(console.error);
          }
        }
      }
    } catch (error) {
      console.error('初始化失败:', error);
      elements.accountList.innerHTML = `
        <div class="empty-state" style="color: #d93025;">
          <span>加载失败，请重试</span>
        </div>
      `;
    }
  },

  startUpdateTimer() {
    // 使用 requestAnimationFrame 实现更丝滑的动画
    const animate = () => {
      if (this.accountItems.length > 0) {
        const now = Date.now() / 1000; // 转换为秒
        const period = 30; // TOTP 周期为 30 秒
        const remainingSeconds = period - (now % period);
        const percentage = (remainingSeconds / period) * 100;

        this.accountItems.forEach(item => {
          item.updateProgress(percentage);
          // 当剩余时间接近 30 秒时更新验证码
          if (remainingSeconds > 29.9) {
            this.codeManager.updateCodes().then(() => {
              item.updateCode();
            });
          }
        });
      }
      requestAnimationFrame(animate);
    };
    animate();
  },

  async analyzeAndFill() {
    if (!this.apiKey) {
      UIManager.showToast('请先在设置中配置 API Key');
      return;
    }

    if (this.accounts.length === 0) {
      UIManager.showToast('暂无可用账户');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url.startsWith('http')) {
        UIManager.showToast('请在网页中使用此功能');
        return;
      }

      const hasInput = await PageAnalyzer.findTOTPInput(tab);
      if (!hasInput[0].result) {
        UIManager.showToast('未找到验证码输入框');
        return;
      }

      const pageResult = await PageAnalyzer.collectPageInfo(tab);
      if (!pageResult[0].result) {
        UIManager.showToast('无法获取页面信息');
        return;
      }

      UIManager.showToast('正在分析页面...');
      const matchedAccountName = await AIService.analyze(pageResult[0].result, this.accounts, this.apiKey);

      if (!matchedAccountName) {
        UIManager.showToast('未找到匹配的账户');
        return;
      }

      const matchedAccount = this.accounts.find(a => a.name === matchedAccountName);
      if (!matchedAccount) {
        UIManager.showToast('未找到匹配的账户');
        return;
      }

      const codeData = this.codeManager.getCode(matchedAccount.name);
      const fillResult = await PageAnalyzer.fillCode(tab, codeData.code);

      if (fillResult[0].result?.success) {
        UIManager.showToast(`已自动填充 ${matchedAccount.name} 的验证码`);
      } else {
        UIManager.showToast('自动填充失败，已复制到剪贴板');
        await navigator.clipboard.writeText(codeData.code);
      }
    } catch (error) {
      console.error('AI 分析失败:', error);
      UIManager.showToast(error.message || 'AI 分析失败');
    }
  },

  setupEventListeners(elements) {
    const aiButton = UIManager.setupAIButton();
    aiButton.addEventListener('click', () => this.analyzeAndFill());

    elements.settingsSaveButton.addEventListener('click', async () => {
      await StorageManager.saveApiKey(elements.apiKeyInput.value);
      this.apiKey = elements.apiKeyInput.value;
      elements.settingsContainer.classList.remove('show');
    });

    elements.addNewButton.addEventListener('click', () => {
      elements.formContainer.classList.add('show');
      StorageManager.saveState({
        formVisible: true,
        accountValue: elements.accountInput.value,
        secretValue: elements.secretInput.value,
        scrollTop: elements.container.scrollTop
      });
    });

    elements.saveButton.addEventListener('click', async () => {
      const name = elements.accountInput.value.trim();
      const secret = elements.secretInput.value.trim().replace(/\s/g, '');

      if (!name || !secret) {
        alert('请填写所有字段');
        return;
      }

      try {
        await TOTP.generateTOTP(secret);
        this.accounts.push({ name, secret });
        await StorageManager.saveAccounts(this.accounts);
        await this.codeManager.updateCodes();
        this.accountItems = await this.renderAccounts();
        elements.formContainer.classList.remove('show');
        elements.accountInput.value = '';
        elements.secretInput.value = '';
        StorageManager.saveState({
          formVisible: false,
          accountValue: '',
          secretValue: '',
          scrollTop: elements.container.scrollTop
        });
      } catch (error) {
        alert('无效的密钥格式');
      }
    });

    elements.cancelButton.addEventListener('click', () => {
      elements.formContainer.classList.remove('show');
      elements.accountInput.value = '';
      elements.secretInput.value = '';
      StorageManager.saveState({
        formVisible: false,
        accountValue: '',
        secretValue: '',
        scrollTop: elements.container.scrollTop
      });
    });

    elements.accountInput.addEventListener('input', () => StorageManager.saveState({
      formVisible: elements.formContainer.classList.contains('show'),
      accountValue: elements.accountInput.value,
      secretValue: elements.secretInput.value,
      scrollTop: elements.container.scrollTop
    }));

    elements.secretInput.addEventListener('input', () => StorageManager.saveState({
      formVisible: elements.formContainer.classList.contains('show'),
      accountValue: elements.accountInput.value,
      secretValue: elements.secretInput.value,
      scrollTop: elements.container.scrollTop
    }));

    elements.container.addEventListener('scroll', () => StorageManager.saveState({
      formVisible: elements.formContainer.classList.contains('show'),
      accountValue: elements.accountInput.value,
      secretValue: elements.secretInput.value,
      scrollTop: elements.container.scrollTop
    }));

    elements.settingsButton.addEventListener('click', () => {
      elements.settingsContainer.classList.add('show');
      elements.apiKeyInput.value = this.apiKey;
    });

    elements.settingsCancelButton.addEventListener('click', () => {
      elements.settingsContainer.classList.remove('show');
      elements.apiKeyInput.value = this.apiKey;
    });
  },

  async renderAccounts() {
    if (this.accounts.length === 0) {
      UIManager.setupEmptyState();
      return [];
    }

    const fragment = document.createDocumentFragment();
    const accountItems = await Promise.all(this.accounts.map(this.createAccountItem.bind(this)));
    accountItems.forEach(item => fragment.appendChild(item.element));

    UIManager.elements.accountList.innerHTML = '';
    UIManager.elements.accountList.appendChild(fragment);

    return accountItems;
  },

  async createAccountItem(account) {
    const codeData = this.codeManager.getCode(account.name);
    
    const accountItem = document.createElement('div');
    accountItem.className = 'account-item';
    accountItem.dataset.account = account.name;
    accountItem.dataset.secret = account.secret;
    accountItem.style.backgroundColor = 'white';

    const accountInfo = document.createElement('div');
    accountInfo.className = 'account-info';
    accountInfo.innerHTML = `
      <div class="account-name">${account.name}</div>
      <div class="account-code">${codeData.formatted}</div>
    `;

    const progress = UIManager.createProgressRing();
    const remainingSeconds = TOTP.getRemainingSeconds();
    const percentage = (remainingSeconds / 30) * 100;
    UIManager.setProgress(progress.circle, progress.text, progress.circumference, percentage);

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
          this.accounts = this.accounts.filter(a => a.name !== account.name);
          StorageManager.saveAccounts(this.accounts);
          this.renderAccounts();
        }
        accountItem.style.backgroundColor = 'white';
      }, 800);
    };

    const handleRelease = async () => {
      clearTimeout(pressTimer);
      if (!isLongPress) {
        const codeData = this.codeManager.getCode(account.name);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          try {
            const fillResult = await PageAnalyzer.fillCode(tab, codeData.code);
            if (fillResult[0].result?.success) {
              UIManager.showToast('验证码已自动填充');
            } else {
              await navigator.clipboard.writeText(codeData.code);
              UIManager.showToast('验证码已复制到剪贴板');
            }
          } catch (error) {
            console.error('自动填充失败:', error);
            await navigator.clipboard.writeText(codeData.code);
            UIManager.showToast('验证码已复制到剪贴板');
          }
        } else {
          await navigator.clipboard.writeText(codeData.code);
          UIManager.showToast('验证码已复制到剪贴板');
        }
      }
      isLongPress = false;
    };

    const handleCancel = () => {
      clearTimeout(pressTimer);
      accountItem.style.backgroundColor = 'white';
      isLongPress = false;
    };

    accountItem.addEventListener('mousedown', handlePress);
    accountItem.addEventListener('mouseup', handleRelease);
    accountItem.addEventListener('mouseleave', handleCancel);

    accountItem.addEventListener('touchstart', handlePress);
    accountItem.addEventListener('touchend', handleRelease);
    accountItem.addEventListener('touchcancel', handleCancel);

    return {
      element: accountItem,
      updateCode: () => {
        const codeData = this.codeManager.getCode(account.name);
        accountInfo.querySelector('.account-code').textContent = codeData.formatted;
      },
      updateProgress: (percentage) => {
        UIManager.setProgress(progress.circle, progress.text, progress.circumference, percentage);
      }
    };
  }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => App.init()); 