import { TOTP, findTOTPInput, fillTOTPCode } from './shared.js';

// 存储账户列表
let accounts = [];

// 初始化
async function init() {
  try {
    // 加载账户列表
    const result = await chrome.storage.sync.get('accounts');
    accounts = result.accounts || [];
    
    // 渲染账户列表
    renderAccounts();
    
    // 启动定时更新
    setInterval(updateCodes, 1000);
  } catch (error) {
    console.error('初始化失败:', error);
    showError('加载账户列表失败，请重试');
  }
}

// 渲染账户列表
function renderAccounts() {
  const container = document.querySelector('.account-list');
  container.innerHTML = '';
  
  if (accounts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>暂无账户</p>
        <button id="add-account">添加账户</button>
      </div>
    `;
    return;
  }
  
  accounts.forEach((account, index) => {
    const item = document.createElement('div');
    item.className = 'account-item';
    item.innerHTML = `
      <div class="account-info">
        <div class="account-name">${account.name}</div>
        <div class="code-container">
          <div class="code" data-index="${index}">------</div>
          <div class="progress-container">
            <div class="progress-bar"></div>
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="copy-btn" data-index="${index}">复制</button>
        <button class="fill-btn" data-index="${index}">填充</button>
        <button class="edit-btn" data-index="${index}">编辑</button>
        <button class="delete-btn" data-index="${index}">删除</button>
      </div>
    `;
    container.appendChild(item);
  });
}

// 更新验证码和进度条
async function updateCodes() {
  const remainingSeconds = TOTP.getRemainingSeconds();
  const progress = (remainingSeconds / 30) * 100;
  
  document.querySelectorAll('.progress-bar').forEach(bar => {
    bar.style.width = `${progress}%`;
  });
  
  if (remainingSeconds === 30) {
    const codeElements = document.querySelectorAll('.code');
    for (let i = 0; i < codeElements.length; i++) {
      const index = codeElements[i].dataset.index;
      const account = accounts[index];
      try {
        const code = await TOTP.generateTOTP(account.secret);
        codeElements[i].textContent = code;
      } catch (error) {
        console.error('生成验证码失败:', error);
        codeElements[i].textContent = '错误';
      }
    }
  }
}

// 复制验证码
async function copyCode(index) {
  try {
    const code = await TOTP.generateTOTP(accounts[index].secret);
    await navigator.clipboard.writeText(code);
    showToast('验证码已复制');
  } catch (error) {
    console.error('复制验证码失败:', error);
    showError('复制失败，请重试');
  }
}

// 填充验证码
async function fillCode(index) {
  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error('未找到当前标签页');
    
    // 生成验证码
    const code = await TOTP.generateTOTP(accounts[index].secret);
    
    // 注入并执行填充脚本
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (code, { findTOTPInput, fillTOTPCode }) => {
        const input = findTOTPInput();
        return fillTOTPCode(input, code);
      },
      args: [code, { findTOTPInput, fillTOTPCode }]
    });
    
    if (result.result) {
      showToast('验证码已填充');
    } else {
      showError('未找到验证码输入框');
    }
  } catch (error) {
    console.error('填充验证码失败:', error);
    showError('填充失败，请重试');
  }
}

// 显示错误信息
function showError(message) {
  const container = document.querySelector('.error-container');
  container.textContent = message;
  container.style.display = 'block';
  setTimeout(() => {
    container.style.display = 'none';
  }, 3000);
}

// 显示提示信息
function showToast(message) {
  const container = document.querySelector('.toast-container');
  container.textContent = message;
  container.style.display = 'block';
  setTimeout(() => {
    container.style.display = 'none';
  }, 2000);
}

// 绑定事件处理
document.addEventListener('DOMContentLoaded', () => {
  init();
  
  // 复制按钮点击事件
  document.addEventListener('click', (e) => {
    if (e.target.matches('.copy-btn')) {
      const index = parseInt(e.target.dataset.index);
      copyCode(index);
    }
  });
  
  // 填充按钮点击事件
  document.addEventListener('click', (e) => {
    if (e.target.matches('.fill-btn')) {
      const index = parseInt(e.target.dataset.index);
      fillCode(index);
    }
  });
  
  // 编辑按钮点击事件
  document.addEventListener('click', (e) => {
    if (e.target.matches('.edit-btn')) {
      const index = parseInt(e.target.dataset.index);
      // TODO: 实现编辑功能
    }
  });
  
  // 删除按钮点击事件
  document.addEventListener('click', (e) => {
    if (e.target.matches('.delete-btn')) {
      const index = parseInt(e.target.dataset.index);
      if (confirm('确定要删除这个账户吗？')) {
        accounts.splice(index, 1);
        chrome.storage.sync.set({ accounts });
        renderAccounts();
      }
    }
  });
  
  // 添加账户按钮点击事件
  document.addEventListener('click', (e) => {
    if (e.target.matches('#add-account')) {
      // TODO: 实现添加账户功能
    }
  });
}); 