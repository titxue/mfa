// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fillCode') {
    const code = message.code;
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
               value.includes('security');
      });
    });

    if (totpInput) {
      // 填充验证码
      totpInput.value = code.replace(/\s/g, '');
      totpInput.dispatchEvent(new Event('input', { bubbles: true }));
      totpInput.dispatchEvent(new Event('change', { bubbles: true }));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No suitable input field found' });
    }
  }
  return true;
}); 