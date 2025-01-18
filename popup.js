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
  let accountItems = [];

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
            // 注入内容脚本分析页面
            const [result] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: async () => {
                // 收集页面信息
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

            const pageInfo = result[0].result;
            
            // 使用 AI 分析页面内容和账户列表
            const matchedAccount = await new Promise((resolve) => {
              // 模拟 AI 分析过程
              const scores = accounts.map(account => {
                let score = 0;
                const accountLower = account.name.toLowerCase();
                const domain = pageInfo.domain.toLowerCase();
                
                // 域名匹配
                if (domain.includes(accountLower) || accountLower.includes(domain)) {
                  score += 5;
                }

                // 标题匹配
                if (pageInfo.title.toLowerCase().includes(accountLower)) {
                  score += 3;
                }

                // 文本内容匹配
                pageInfo.texts.forEach(text => {
                  const textLower = text.toLowerCase();
                  if (textLower.includes(accountLower) || 
                      textLower.includes('login') || 
                      textLower.includes('sign in') ||
                      textLower.includes('2fa') ||
                      textLower.includes('verification')) {
                    score += 1;
                  }
                });

                // 标签匹配
                pageInfo.labels.forEach(label => {
                  const labelLower = label.toLowerCase();
                  if (labelLower.includes('code') ||
                      labelLower.includes('otp') ||
                      labelLower.includes('2fa') ||
                      labelLower.includes('verification')) {
                    score += 2;
                  }
                });

                return { account, score };
              });

              // 选择得分最高的账户
              const bestMatch = scores.reduce((best, current) => 
                current.score > best.score ? current : best
              , { score: -1 });

              resolve(bestMatch.score > 0 ? bestMatch.account : null);
            });

            if (matchedAccount) {
              // 如果找到匹配的账户，使用它的验证码
              if (matchedAccount.name !== account.name) {
                const matchedCode = await TOTP.generateTOTP(matchedAccount.secret);
                code = matchedCode;
                showToast(`已自动选择账户: ${matchedAccount.name}`);
              }
            }

            // 注入填充脚本
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (code) => {
                const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])');
                
                // 查找可能的 TOTP 输入框
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
                  return true;
                }
                return false;
              },
              args: [code]
            });
            showToast('验证码已自动填充');
          } catch (error) {
            // 如果注入失败，则复制到剪贴板
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

  // 初始化
  try {
    const [stateResult, accountsResult] = await Promise.all([
      chrome.storage.local.get('state'),
      chrome.storage.sync.get('accounts')
    ]);

    accounts = accountsResult.accounts || [];
    
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