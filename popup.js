// 核心配置
const CONFIG = {
  TOTP_KEYWORDS: ['otp', '2fa', 'totp', 'authenticator', 'verification', 'security', 'code', 'security code', '安全码'],
  TOAST_DURATION: 3000
};

// 工具函数模块
const Utils = {
  // DOM操作工具
  dom: {
    // 安全获取DOM元素
    getElementById(id) {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`Element with id '${id}' not found`);
      }
      return element;
    },

    // 批量添加事件监听器
    addEventListeners(element, events) {
      if (!element) return;
      events.forEach(({ type, handler, options }) => {
        element.addEventListener(type, handler, options);
      });
    },

    // 设置元素属性
    setAttributes(element, attributes) {
      if (!element) return;
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
  },

  // 键盘事件工具
  keyboard: {
    // 创建ESC键处理器
    createEscapeHandler(callback) {
      const handler = (e) => {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', handler);
          callback();
        }
      };
      document.addEventListener('keydown', handler);
      return handler;
    }
  },

  // Chrome API工具
  chrome: {
    // 检查Chrome扩展API是否可用
    isExtensionApiAvailable() {
      return typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query;
    },

    // 获取当前活动标签页
    async getCurrentTab() {
      if (!this.isExtensionApiAvailable()) return null;
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
      } catch (error) {
        console.error('Chrome tabs API error:', error);
        return null;
      }
    }
  },

  // 数据验证工具
  validation: {
    // 验证账户数据格式
    isValidAccount(account) {
      return account && 
             typeof account.name === 'string' && 
             typeof account.secret === 'string' && 
             account.name.trim() && 
             account.secret.trim();
    },

    // 验证导入数据格式
    isValidImportData(data) {
      if (!data || typeof data !== 'object') return false;
      if (!Array.isArray(data.accounts)) return false;
      return data.accounts.every(this.isValidAccount);
    }
  },

  // 异步工具
  async: {
    // 安全的异步操作包装器
    async safeAsync(asyncFn, fallback = null) {
      try {
        return await asyncFn();
      } catch (error) {
        console.error('Async operation failed:', error);
        return fallback;
      }
    }
  }
};

// 存储管理模块
const StorageManager = {
  // 通用存储访问方法
  async _getFromStorage(key, storageType = 'sync') {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage[storageType]) {
        const result = await chrome.storage[storageType].get(key);
        return result[key];
      } else {
        // 在非扩展环境中使用localStorage作为fallback
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : undefined;
      }
    } catch (error) {
      console.error(`Failed to get ${key}:`, error);
      return undefined;
    }
  },

  async _saveToStorage(key, value, storageType = 'sync') {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage[storageType]) {
        await chrome.storage[storageType].set({ [key]: value });
      } else {
        // 在非扩展环境中使用localStorage作为fallback
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  },

  async getAccounts() {
    const accounts = await this._getFromStorage('accounts');
    return accounts || [];
  },

  async saveAccounts(accounts) {
    await this._saveToStorage('accounts', accounts);
  },

  async saveState(state) {
    await this._saveToStorage('state', state);
  },

  // 统一的状态保存函数
  async saveCurrentState(elements) {
    const state = {
      formVisible: elements.formContainer.classList.contains('show'),
      accountValue: elements.accountInput.value,
      secretValue: elements.secretInput.value,
      scrollTop: elements.container.scrollTop
    };
    await this.saveState(state);
  }
};

// 导入导出管理模块
const ImportExportManager = {
  // 导出账户数据
  async exportAccounts() {
    try {
      const accounts = await StorageManager.getAccounts();
      if (accounts.length === 0) {
        UIManager.showToast(I18n.t('toast.no_accounts_to_export'), 'warning');
        return;
      }

      // 显示确认对话框
      const confirmed = await UIManager.showConfirmDialog(
        I18n.t('dialog.export_title'),
        I18n.t('dialog.export_message', { count: accounts.length }),
        I18n.t('button.export'),
        I18n.t('button.cancel')
      );
      
      if (!confirmed) {
        return;
      }

      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        accounts: accounts.map(account => ({
          name: account.name,
          secret: account.secret
        }))
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `totp-accounts-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      UIManager.showToast(I18n.t('toast.export_success'), 'success');
    } catch (error) {
      console.error('Export failed:', error);
      UIManager.showToast(I18n.t('toast.export_failed'), 'error');
    }
  },

  // 导入账户数据
  async importAccounts(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      const fileName = file.name;

      // 验证数据格式
      if (!this.validateImportData(importData)) {
        UIManager.showToast(I18n.t('toast.invalid_file_format'), 'error');
        return;
      }

      // 显示确认对话框
      const confirmed = await UIManager.showConfirmDialog(
        I18n.t('dialog.import_title'),
        I18n.t('dialog.import_message', { count: importData.accounts.length }),
        I18n.t('button.import'),
        I18n.t('button.cancel')
      );
      
      if (!confirmed) {
        return;
      }

      const currentAccounts = await StorageManager.getAccounts();
      const newAccounts = [];
      let duplicateCount = 0;
      let invalidCount = 0;

      // 检查重复账户并合并
      for (const account of importData.accounts) {
        const exists = currentAccounts.find(existing => existing.name === account.name);
        if (exists) {
          duplicateCount++;
        } else {
          // 验证密钥格式
          try {
            await TOTP.generateTOTP(account.secret);
            newAccounts.push(account);
          } catch (error) {
            console.warn(`Skipping account with invalid key: ${account.name}`);
            invalidCount++;
          }
        }
      }

      // 根据不同情况显示相应的提示信息
      if (newAccounts.length === 0) {
        if (duplicateCount > 0 && invalidCount === 0) {
          // 全部重复
          UIManager.showToast(I18n.t('toast.import_all_duplicates'), 'warning', 4000);
        } else if (invalidCount > 0 && duplicateCount === 0) {
          // 全部无效
          UIManager.showToast(I18n.t('toast.import_no_valid'), 'error', 4000);
        } else {
          // 混合情况：既有重复又有无效
          UIManager.showToast(I18n.t('import.no_valid_data'), 'error', 4000);
        }
        return;
      }

      // 保存新账户
      const allAccounts = [...currentAccounts, ...newAccounts];
      await StorageManager.saveAccounts(allAccounts);
      
      // 更新UI
      App.accounts = allAccounts;
      await App.codeManager.updateCodes();
      App.accountItems = await App.renderAccounts();

      // 显示成功提示信息
      let successMessage;
      if (fileName && fileName !== 'blob') {
        // 有文件名的情况
        if (duplicateCount > 0) {
          successMessage = I18n.t('toast.import_success_with_file_and_skip', { 
            filename: fileName, 
            imported: newAccounts.length, 
            skipped: duplicateCount 
          });
        } else {
          successMessage = I18n.t('toast.import_success_with_file', { 
            filename: fileName, 
            imported: newAccounts.length 
          });
        }
      } else {
        // 没有文件名的情况
        if (duplicateCount > 0) {
          successMessage = I18n.t('toast.import_success_with_skip', { 
            imported: newAccounts.length, 
            skipped: duplicateCount 
          });
        } else {
          successMessage = I18n.t('toast.import_success', { 
            imported: newAccounts.length 
          });
        }
      }
      
      // 成功导入时显示时间稍长，并添加操作建议
      UIManager.showToast(successMessage, 'success', 5000);
      
      // 延迟显示操作建议
      setTimeout(() => {
        UIManager.showToast(I18n.t('toast.import_suggestion'), 'info', 3000);
      }, 1500);
      
    } catch (error) {
      console.error('Import failed:', error);
      if (error instanceof SyntaxError) {
        UIManager.showToast(I18n.t('toast.invalid_file_format'), 'error', 4000);
      } else {
        UIManager.showToast(I18n.t('toast.import_failed'), 'error', 4000);
      }
    }
  },

  // 验证导入数据格式
  validateImportData(data) {
    return Utils.validation.isValidImportData(data);
  }
};

// UI 管理模块
const UIManager = {
  elements: {},

  init(elements) {
    this.elements = elements;
    this.setupEmptyState();
    // 确保toast容器在初始化时就准备好
    this.ensureToastContainer();
  },

  // 统一的toast容器管理方法
  ensureToastContainer() {
    if (!this.elements.toastContainer) {
      // 移除HTML中可能存在的toast容器（它在设置页面内部，会受到限制）
      const existingContainer = document.getElementById('toastContainer');
      if (existingContainer) {
        existingContainer.remove();
      }
      
      // 创建新的toast容器，直接添加到body中
      const toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'toast-container';
      
      // 设置内联样式确保正确定位，不受其他元素影响
      toastContainer.style.cssText = `
        position: fixed !important;
        bottom: 20px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 99999 !important;
        pointer-events: none !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 8px !important;
        width: auto !important;
        max-width: calc(100vw - 40px) !important;
      `;
      
      document.body.appendChild(toastContainer);
      this.elements.toastContainer = toastContainer;
    }
  },

  setupEmptyState() {
    this.elements.accountList.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
        </svg>
        <div data-i18n="empty.no_accounts">暂无账户</div>
        <div style="margin-top: 8px; font-size: 12px; opacity: 0.7" data-i18n="empty.add_account_tip">点击右上角添加账户开始使用</div>
      </div>
    `;
  },

  showToast(message, type = 'info', duration = 3000) {
    // 确保toast容器存在
    this.ensureToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 确保toast元素本身可以接收pointer事件
    toast.style.pointerEvents = 'auto';
    
    this.elements.toastContainer.appendChild(toast);

    // 强制重绘以确保动画正常工作
    requestAnimationFrame(() => {
      toast.classList.add('show');
       
       setTimeout(() => {
         toast.classList.remove('show');
         
         setTimeout(() => {
           if (toast.parentNode) {
             toast.parentNode.removeChild(toast);
           }
         }, 300);
       }, duration);
     });
  },

  // 创建确认对话框样式
  _createDialogStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .confirm-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .confirm-dialog-content {
        background: white;
        border-radius: 16px;
        padding: 24px;
        max-width: 320px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }
      .confirm-dialog-title {
        margin: 0 0 12px 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
      }
      .confirm-dialog-message {
        margin: 0 0 20px 0;
        font-size: 14px;
        line-height: 1.5;
        color: #666;
      }
      .confirm-dialog-buttons {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      .confirm-dialog-cancel,
      .confirm-dialog-confirm {
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .confirm-dialog-cancel {
        background: #f5f5f5;
        color: #666;
      }
      .confirm-dialog-cancel:hover {
        background: #e5e5e5;
      }
      .confirm-dialog-confirm {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .confirm-dialog-confirm:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
    `;
    return style;
  },

  showConfirmDialog(title, message, confirmText = I18n.t('button.confirm'), cancelText = I18n.t('button.cancel')) {
    return new Promise((resolve) => {
      // 创建确认对话框元素
      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      dialog.innerHTML = `
        <div class="confirm-dialog-content">
          <h3 class="confirm-dialog-title">${title}</h3>
          <p class="confirm-dialog-message">${message}</p>
          <div class="confirm-dialog-buttons">
            <button class="confirm-dialog-cancel">${cancelText}</button>
            <button class="confirm-dialog-confirm">${confirmText}</button>
          </div>
        </div>
      `;
      
      // 添加样式
      const style = this._createDialogStyles();
      document.head.appendChild(style);
      document.body.appendChild(dialog);
      
      // 事件处理
      const handleConfirm = () => {
        document.body.removeChild(dialog);
        document.head.removeChild(style);
        resolve(true);
      };
      
      const handleCancel = () => {
        document.body.removeChild(dialog);
        document.head.removeChild(style);
        resolve(false);
      };
      
      dialog.querySelector('.confirm-dialog-confirm').addEventListener('click', handleConfirm);
      dialog.querySelector('.confirm-dialog-cancel').addEventListener('click', handleCancel);
      
      // ESC键取消
      Utils.keyboard.createEscapeHandler(handleCancel);
      
      // 点击背景取消
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          handleCancel();
        }
      });
      
      // 聚焦到确认按钮
      setTimeout(() => {
        dialog.querySelector('.confirm-dialog-confirm').focus();
      }, 100);
    });
  },

  // 统一的进度环管理器
  createProgressManager() {
    const progressRing = this.elements.progressTemplate.content.cloneNode(true);
    const circle = progressRing.querySelector('.progress');
    const text = progressRing.querySelector('.progress-text');
    const circumference = 2 * Math.PI * 16; // 固定半径16
    
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference;

    return {
      container: progressRing,
      update: (percent) => {
        const offset = circumference - (percent / 100 * circumference);
        circle.style.strokeDashoffset = offset;
        text.textContent = Math.ceil(30 * percent / 100);
      }
    };
  },

  showSettings() {
    const settingsContainer = document.getElementById('settingsContainer');
    settingsContainer.classList.add('show');
    settingsContainer.setAttribute('aria-hidden', 'false');
    // 聚焦到关闭按钮以便键盘导航
    setTimeout(() => {
      document.getElementById('settingsClose').focus();
    }, 100);
  },
  
  hideSettings() {
    const settingsContainer = document.getElementById('settingsContainer');
    settingsContainer.classList.remove('show');
    settingsContainer.setAttribute('aria-hidden', 'true');
    // 返回焦点到设置按钮
    document.getElementById('settingsBtn').focus();
  },

  initKeyboardNavigation() {
    // 添加键盘导航支持
    document.addEventListener('keydown', (e) => {
      const settingsContainer = document.getElementById('settingsContainer');
      if (settingsContainer.classList.contains('show')) {
        if (e.key === 'Escape') {
          this.hideSettings();
        }
      }
    });
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
    const elements = this.getUIElements();
    await this.initializeData();
    await this.restoreState(elements);
    this.setupEventListeners(elements);
    this.startUpdateTimer();
    this.initLanguageSelector();
  },

  // 初始化语言选择器
    async initLanguageSelector() {
      const languageSelector = document.getElementById('languageSelector');
      if (languageSelector) {
        const storedLanguage = await I18n.getStoredLanguage();
        languageSelector.value = storedLanguage;
      }
    },

  getUIElements() {
    return {
      accountInput: document.getElementById('account'),
      secretInput: document.getElementById('secret'),
      saveButton: document.getElementById('save'),
      cancelButton: document.getElementById('cancel'),
      addNewButton: document.getElementById('addNew'),
      formContainer: document.getElementById('formContainer'),
      accountList: document.getElementById('accountList'),
      container: document.querySelector('.container'),
      progressTemplate: document.getElementById('progressRingTemplate'),
      toastContainer: document.getElementById('toastContainer')
    };
  },

  async initializeData() {
    try {
      UIManager.init(this.getUIElements());
      this.accounts = await StorageManager.getAccounts();
      // codeManager is already defined as a property of App
      await this.codeManager.updateCodes();
      this.accountItems = await this.renderAccounts();
    } catch (error) {
      this.handleInitError(error);
    }
  },

  handleInitError(error) {
    console.error('Initialization failed:', error);
    const elements = this.getUIElements();
    elements.accountList.innerHTML = `
      <div class="empty-state" style="color: #d93025;">
        <p data-i18n="error.init_failed">初始化失败，请刷新页面重试</p>
      </div>
    `;
   },

   async restoreState(elements) {
    try {
      const state = await StorageManager._getFromStorage('state', 'local');
      
      if (state) {
        if (state.formVisible) {
          elements.formContainer.classList.add('show');
        }
        elements.accountInput.value = state.accountValue || '';
        elements.secretInput.value = state.secretValue || '';
        if (state.scrollTop) {
          elements.container.scrollTop = state.scrollTop;
        }
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  },

  startUpdateTimer() {
    // 使用 requestAnimationFrame 实现更丝滑的动画
    const animate = () => {
      if (this.accountItems.length > 0) {
        const now = Date.now() / 1000; // 转换为秒
        const period = 30; // TOTP period is 30 seconds
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

  hideForm(elements) {
    elements.formContainer.classList.remove('show');
    elements.accountInput.value = '';
    elements.secretInput.value = '';
    StorageManager.saveCurrentState(elements);
  },

  setupEventListeners(elements) {
    elements.addNewButton.addEventListener('click', () => {
      elements.formContainer.classList.add('show');
      StorageManager.saveCurrentState(elements);
    });

    elements.saveButton.addEventListener('click', async () => {
      const name = elements.accountInput.value.trim();
      const secret = elements.secretInput.value.trim().replace(/\s/g, '');

      if (!name || !secret) {
        UIManager.showToast(I18n.t('toast.incomplete_account_info'), 'warning');
        return;
      }

      // 检查账户名是否已存在
      if (this.accounts.some(account => account.name === name)) {
        UIManager.showToast(I18n.t('toast.account_exists'), 'warning');
        return;
      }

      try {
        await TOTP.generateTOTP(secret);
        this.accounts.push({ name, secret });
        await StorageManager.saveAccounts(this.accounts);
        await this.codeManager.updateCodes();
        this.accountItems = await this.renderAccounts();
        this.hideForm(elements);
      } catch (error) {
        UIManager.showToast(I18n.t('toast.invalid_secret_format'), 'error');
      }
    });

    elements.cancelButton.addEventListener('click', () => {
      this.hideForm(elements);
    });



    // 为需要保存状态的元素添加事件监听器
    const saveStateElements = [
      { element: elements.accountInput, event: 'input' },
      { element: elements.secretInput, event: 'input' },
      { element: elements.container, event: 'scroll' }
    ];
    
    saveStateElements.forEach(({ element, event }) => {
      element.addEventListener(event, () => StorageManager.saveCurrentState(elements));
    });
    
    // 设置页面相关的事件监听器
    this.setupSettingsListeners(elements);
    
    // 初始化键盘导航
    UIManager.initKeyboardNavigation();




  },

  setupSettingsListeners(elements) {
    // 设置页面功能
    elements.settingsBtn = document.getElementById('settingsBtn');
    elements.settingsClose = document.getElementById('settingsClose');
    
    elements.settingsBtn.addEventListener('click', () => UIManager.showSettings());
    elements.settingsClose.addEventListener('click', () => UIManager.hideSettings());
    
    // 设置页面中的导入导出功能
    elements.importAccountsBtn = document.getElementById('importAccountsBtn');
    elements.exportAccountsBtn = document.getElementById('exportAccountsBtn');
    elements.importFile = document.getElementById('importFile');
    
    elements.exportAccountsBtn.addEventListener('click', () => ImportExportManager.exportAccounts());
    elements.importAccountsBtn.addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        ImportExportManager.importAccounts(file);
        e.target.value = ''; // 清空文件选择，允许重复选择同一文件
      }
    });
    
    // 语言选择器事件监听
    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) {
      languageSelector.addEventListener('change', async (e) => {
        const selectedLanguage = e.target.value;
        await I18n.setLanguage(selectedLanguage);
        UIManager.showToast(I18n.t('toast.language_changed'), 'success');
      });
    }
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

    const progress = UIManager.createProgressManager();
    const remainingSeconds = TOTP.getRemainingSeconds();
    const percentage = (remainingSeconds / 30) * 100;
    progress.update(percentage);

    accountItem.appendChild(accountInfo);
    accountItem.appendChild(progress.container);

    // 设置账户项的交互行为
    this.setupAccountItemInteraction(accountItem, account);

    return {
      element: accountItem,
      updateCode: () => {
        const codeData = this.codeManager.getCode(account.name);
        accountInfo.querySelector('.account-code').textContent = codeData.formatted;
      },
      updateProgress: (percentage) => {
        progress.update(percentage);
      }
    };
  },

  setupAccountItemInteraction(accountItem, account) {
    // Left click to copy/fill code
    accountItem.addEventListener('click', async (e) => {
      if (e.button === 0) { // Left click
        await this.handleCodeAction(account.name);
      }
    });

    // Right click to delete
    accountItem.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      const confirmed = await UIManager.showConfirmDialog(
        I18n.t('dialog.delete_title'),
        I18n.t('dialog.delete_message', { name: account.name })
      );
      if (confirmed) {
        this.accounts = this.accounts.filter(acc => acc.name !== account.name);
        await StorageManager.saveAccounts(this.accounts);
        await this.codeManager.updateCodes();
        this.accountItems = await this.renderAccounts();
      }
    });
  },



  async handleCodeAction(accountName) {
    const codeData = this.codeManager.getCode(accountName);
    
    // 检查Chrome扩展API是否可用
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          try {
            const fillResult = await PageAnalyzer.fillCode(tab, codeData.code);
            if (fillResult[0].result?.success) {
              UIManager.showToast(I18n.t('toast.code_filled'));
              return;
            }
          } catch (error) {
            console.error('Auto-fill failed:', error);
          }
        }
      } catch (error) {
        console.error('Chrome tabs API error:', error);
      }
    }
    
    // 回退到复制到剪贴板
    await navigator.clipboard.writeText(codeData.code);
    UIManager.showToast(I18n.t('toast.code_copied'));
  }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
  // 预先创建toast容器，确保它在页面加载时就立即可用
  UIManager.ensureToastContainer();
  
  // 初始化国际化系统
  await I18n.init();
  // 更新UI文本
  I18n.updateUI();
  // 初始化应用
  await App.init();
  // 初始化语言选择器
  await App.initLanguageSelector();
});