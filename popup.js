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

  let accounts = [];

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

  // 恢复表单状态和滚动位置
  async function restoreState() {
    const { state } = await chrome.storage.local.get('state');
    if (state) {
      if (state.formVisible) {
        formContainer.classList.add('show');
      }
      accountInput.value = state.accountValue || '';
      secretInput.value = state.secretValue || '';
      if (state.scrollTop) {
        container.scrollTop = state.scrollTop;
      }
    }
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

  // 加载保存的账户
  async function loadAccounts() {
    const result = await chrome.storage.sync.get('accounts');
    accounts = result.accounts || [];
    await renderAccounts();
  }

  // 保存账户
  async function saveAccounts() {
    await chrome.storage.sync.set({ accounts });
    await renderAccounts();
  }

  // 显示 Toast 消息
  function showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // 强制重绘以触发动画
    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toastContainer.removeChild(toast);
      }, 300); // 等待淡出动画完成
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

    // 创建账户信息区域
    const accountInfo = document.createElement('div');
    accountInfo.className = 'account-info';
    accountInfo.innerHTML = `
      <div class="account-name">${account.name}</div>
      <div class="account-code">${formattedCode}</div>
    `;

    // 添加圆形进度条
    const progress = createProgressRing();
    const remainingSeconds = TOTP.getRemainingSeconds();
    const percentage = (remainingSeconds / 30) * 100;
    setProgress(progress.circle, progress.text, progress.circumference, percentage);

    // 组装界面
    accountItem.appendChild(accountInfo);
    accountItem.appendChild(progress.container);

    // 长按删除功能
    let pressTimer;
    let isLongPress = false;
    const originalBackground = accountItem.style.background;

    accountItem.addEventListener('mousedown', () => {
      pressTimer = setTimeout(() => {
        isLongPress = true;
        accountItem.style.background = '#ffebee';
        const confirmDelete = confirm(`确定要删除账户 "${account.name}" 吗？`);
        if (confirmDelete) {
          accounts = accounts.filter(a => a.name !== account.name);
          saveAccounts();
        }
        accountItem.style.background = originalBackground;
      }, 800);
    });

    accountItem.addEventListener('mouseup', () => {
      clearTimeout(pressTimer);
      if (!isLongPress) {
        // 点击复制验证码
        navigator.clipboard.writeText(code).then(() => {
          showToast('验证码已复制到剪贴板');
        });
      }
      isLongPress = false;
    });

    accountItem.addEventListener('mouseleave', () => {
      clearTimeout(pressTimer);
      accountItem.style.background = originalBackground;
      isLongPress = false;
    });

    // 添加触摸支持
    accountItem.addEventListener('touchstart', (e) => {
      pressTimer = setTimeout(() => {
        isLongPress = true;
        accountItem.style.background = '#ffebee';
        const confirmDelete = confirm(`确定要删除账户 "${account.name}" 吗？`);
        if (confirmDelete) {
          accounts = accounts.filter(a => a.name !== account.name);
          saveAccounts();
        }
        accountItem.style.background = originalBackground;
      }, 800);
    });

    accountItem.addEventListener('touchend', (e) => {
      clearTimeout(pressTimer);
      if (!isLongPress) {
        // 点击复制验证码
        navigator.clipboard.writeText(code).then(() => {
          showToast('验证码已复制到剪贴板');
        });
      }
      isLongPress = false;
    });

    accountItem.addEventListener('touchcancel', () => {
      clearTimeout(pressTimer);
      accountItem.style.background = originalBackground;
      isLongPress = false;
    });

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
    // 先清空列表并显示加载动画
    accountList.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    `;

    // 使用 requestAnimationFrame 延迟渲染
    await new Promise(resolve => requestAnimationFrame(resolve));

    // 创建所有账户项
    const accountItems = await Promise.all(accounts.map(createAccountItem));
    
    // 清除加载动画
    accountList.innerHTML = '';

    // 分批添加账户项以避免长时间阻塞
    const batchSize = 3;
    for (let i = 0; i < accountItems.length; i += batchSize) {
      const batch = accountItems.slice(i, i + batchSize);
      batch.forEach(item => accountList.appendChild(item.element));
      // 等待下一帧再继续
      if (i + batchSize < accountItems.length) {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }

    return accountItems;
  }

  let accountItems = [];

  // 优化更新逻辑
  async function updateAll() {
    if (accounts.length > 0) {
      const remainingSeconds = TOTP.getRemainingSeconds();
      
      // 使用 requestAnimationFrame 进行更新
      requestAnimationFrame(() => {
        // 更新所有进度条
        accountItems.forEach(item => item.updateProgress());
        
        // 只在需要时更新验证码
        if (remainingSeconds === 30) {
          Promise.all(accountItems.map(item => item.updateCode()));
        }
      });
    }
  }

  // 添加新账户按钮
  addNewButton.addEventListener('click', () => {
    formContainer.classList.add('show');
    saveState();
  });

  // 保存按钮
  saveButton.addEventListener('click', async () => {
    const name = accountInput.value.trim();
    const secret = secretInput.value.trim();

    if (!name || !secret) {
      alert('请填写所有字段');
      return;
    }

    try {
      // 验证密钥是否有效
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

  // 取消按钮
  cancelButton.addEventListener('click', () => {
    formContainer.classList.remove('show');
    accountInput.value = '';
    secretInput.value = '';
    saveState();
  });

  // 监听输入变化
  accountInput.addEventListener('input', saveState);
  secretInput.addEventListener('input', saveState);

  // 监听滚动
  container.addEventListener('scroll', saveState);

  // 初始化
  try {
    // 先恢复状态，这样可以立即显示表单（如果之前是打开的）
    await restoreState();
    
    // 然后加载账户数据
    await loadAccounts();
    
    // 获取账户项引用
    accountItems = await renderAccounts();
    
    // 开始定时更新
    setInterval(updateAll, 1000);
  } catch (error) {
    console.error('初始化失败:', error);
    // 显示错误信息
    accountList.innerHTML = `
      <div class="loading" style="color: #d93025;">
        <span>加载失败，请重试</span>
      </div>
    `;
  }
}); 