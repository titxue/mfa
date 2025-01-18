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
    accountList.innerHTML = '';
    const accountItems = await Promise.all(accounts.map(createAccountItem));
    accountItems.forEach(item => accountList.appendChild(item.element));
    return accountItems;
  }

  let accountItems = [];

  // 更新所有 TOTP 码和进度条
  async function updateAll() {
    if (accounts.length > 0) {
      const remainingSeconds = TOTP.getRemainingSeconds();
      // 只在需要更新验证码时更新
      if (remainingSeconds === 30) {
        await Promise.all(accountItems.map(item => item.updateCode()));
      }
      // 更新所有进度条
      accountItems.forEach(item => item.updateProgress());
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
  await loadAccounts();
  accountItems = await renderAccounts();
  await restoreState();
  setInterval(updateAll, 1000);
}); 