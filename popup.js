document.addEventListener('DOMContentLoaded', async () => {
  const accountInput = document.getElementById('account');
  const secretInput = document.getElementById('secret');
  const saveButton = document.getElementById('save');
  const cancelButton = document.getElementById('cancel');
  const addNewButton = document.getElementById('addNew');
  const formContainer = document.getElementById('formContainer');
  const accountList = document.getElementById('accountList');
  const timerBar = document.getElementById('timer-bar');

  let accounts = [];
  let editingIndex = -1;

  // 加载保存的账户
  async function loadAccounts() {
    const result = await chrome.storage.sync.get('accounts');
    accounts = result.accounts || [];
    renderAccounts();
  }

  // 保存账户
  async function saveAccounts() {
    await chrome.storage.sync.set({ accounts });
    renderAccounts();
  }

  // 渲染账户列表
  async function renderAccounts() {
    accountList.innerHTML = '';
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const code = await TOTP.generateTOTP(account.secret);
      
      const accountItem = document.createElement('div');
      accountItem.className = 'account-item';
      accountItem.innerHTML = `
        <div class="account-info">
          <div class="account-name">${account.name}</div>
          <div class="account-code">${code}</div>
        </div>
        <div class="button-group">
          <button class="edit">编辑</button>
          <button class="delete">删除</button>
        </div>
      `;

      // 编辑按钮
      accountItem.querySelector('.edit').addEventListener('click', () => {
        editingIndex = i;
        accountInput.value = account.name;
        secretInput.value = account.secret;
        formContainer.classList.add('show');
        addNewButton.style.display = 'none';
      });

      // 删除按钮
      accountItem.querySelector('.delete').addEventListener('click', async () => {
        if (confirm('确定要删除这个账户吗？')) {
          accounts.splice(i, 1);
          await saveAccounts();
        }
      });

      accountList.appendChild(accountItem);
    }
  }

  // 更新所有 TOTP 码
  async function updateAllTOTP() {
    if (accounts.length > 0) {
      renderAccounts();
    }
  }

  // 更新计时器
  function updateTimer() {
    const remainingSeconds = TOTP.getRemainingSeconds();
    const percentage = (remainingSeconds / 30) * 100;
    timerBar.style.width = `${percentage}%`;
    
    if (remainingSeconds === 30) {
      updateAllTOTP();
    }
  }

  // 添加新账户按钮
  addNewButton.addEventListener('click', () => {
    editingIndex = -1;
    accountInput.value = '';
    secretInput.value = '';
    formContainer.classList.add('show');
    addNewButton.style.display = 'none';
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

      if (editingIndex === -1) {
        // 添加新账户
        accounts.push({ name, secret });
      } else {
        // 更新现有账户
        accounts[editingIndex] = { name, secret };
      }

      await saveAccounts();
      formContainer.classList.remove('show');
      addNewButton.style.display = 'block';
      accountInput.value = '';
      secretInput.value = '';
    } catch (error) {
      alert('无效的密钥格式');
    }
  });

  // 取消按钮
  cancelButton.addEventListener('click', () => {
    formContainer.classList.remove('show');
    addNewButton.style.display = 'block';
    accountInput.value = '';
    secretInput.value = '';
  });

  // 初始化
  await loadAccounts();
  updateTimer();
  setInterval(updateTimer, 1000);
}); 