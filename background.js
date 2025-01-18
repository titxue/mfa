import { TOTP, callDeepSeekAPI, findTOTPInput, fillTOTPCode, collectPageInfo } from './shared.js';

// 存储当前活跃的自动填充信息
let activeAutoFill = null;

// 自动更新验证码
async function updateCode() {
  if (!activeAutoFill) return;

  try {
    const { tabId, account } = activeAutoFill;
    
    // 检查标签页是否还存在
    try {
      await chrome.tabs.get(tabId);
    } catch (error) {
      console.log('标签页已关闭，停止自动更新');
      activeAutoFill = null;
      return;
    }

    // 生成新的验证码
    const code = await TOTP.generateTOTP(account.secret);

    // 填充新的验证码
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (code, { findTOTPInput, fillTOTPCode }) => {
        const input = findTOTPInput();
        fillTOTPCode(input, code);
      },
      args: [code, { findTOTPInput, fillTOTPCode }]
    });

    console.log('验证码已更新');
  } catch (error) {
    console.error('更新验证码失败:', error);
    activeAutoFill = null;
  }
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
      func: collectPageInfo
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
      func: findTOTPInput
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
    const code = await TOTP.generateTOTP(matchedAccount.secret);

    // 填充验证码
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (code, { findTOTPInput, fillTOTPCode }) => {
        const input = findTOTPInput();
        return fillTOTPCode(input, code);
      },
      args: [code, { findTOTPInput, fillTOTPCode }]
    });

    // 设置当前活跃的自动填充信息
    activeAutoFill = {
      tabId: tab.id,
      account: matchedAccount
    };

    console.log('自动填充完成');
  } catch (error) {
    console.error('自动填充失败:', error);
    activeAutoFill = null;
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

// 监听标签页关闭事件
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeAutoFill?.tabId === tabId) {
    console.log('标签页已关闭，停止自动更新');
    activeAutoFill = null;
  }
});

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (activeAutoFill?.tabId === tabId && changeInfo.url) {
    console.log('页面已更新，停止自动更新');
    activeAutoFill = null;
  }
});

// 启动定时更新
setInterval(updateCode, 1000); 