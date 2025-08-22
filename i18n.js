// 国际化(i18n)系统
const I18n = {
  // 当前语言
  currentLanguage: 'zh-CN',
  
  // 语言包
  languages: {
    'zh-CN': {
      // 页面标题和按钮
      'title': 'TOTP 生成器',
      'addAccount': '添加账户',
      'app.title': 'TOTP 生成器',
      'button.settings': '设置',
      'button.add_account': '添加账户',
      'button.add': '保存',
      'button.cancel': '取消',
      'button.save': '保存',
      'button.close': '关闭',
      'button.export': '导出',
      'button.import': '导入',
      'button.confirm': '确认',
      'button.delete': '删除',
      
      // 表单标签
      'form.title': '添加账户',
      'form.add_account': '添加账户',
      'form.accountName': '账户名称',
      'form.secretKey': '密钥',
      'form.account_name': '账户名称',
      'form.secret_key': '密钥',
      'form.placeholder.account': '例如：GitHub',
      'form.placeholder.secret': '输入 Base32 格式的密钥',
      
      // 设置页面
      'settings.title': '设置',
      'settings.close_aria': '关闭设置页面',
      'settings.accountManagement': '账户管理',
      'settings.account_management': '账户管理',
      'settings.language': '语言设置',
      'settings.about': '关于应用',
      'settings.languageTitle': '界面语言',
      'settings.languageDesc': '选择应用程序的显示语言',
      'settings.languageAuto': '自动检测',
      'settings.languageChinese': '中文',
      'settings.languageEnglish': 'English',
      'settings.exportData': '导出账户数据',
      'settings.exportDesc': '将所有账户数据导出为JSON文件进行备份',
      'settings.importData': '导入账户数据',
      'settings.importDesc': '从JSON文件导入账户数据，支持数据合并',
      'settings.export': '导出',
      'settings.import': '导入',
      'settings.appName': 'TOTP 生成器',
      'settings.appVersion': '版本 1.0.0 - 安全的两步验证码生成工具',
      'settings.usage': '使用说明',
      'settings.usageDesc': '点击账户可复制验证码，长按可删除账户',
      
      // 语言设置
      'language.title': '界面语言',
      'language.desc': '选择应用程序的显示语言',
      'language.auto': '自动检测',
      'language.chinese': '中文',
      'language.english': 'English',
      
      // 导入导出
      'export.title': '导出账户数据',
      'export.desc': '将所有账户数据导出为JSON文件进行备份',
      'import.title': '导入账户数据',
      'import.desc': '从JSON文件导入账户数据，支持数据合并',
      
      // 应用信息
      'about.app_name': 'TOTP 生成器',
      'about.version': '版本 1.0.0 - 安全的两步验证码生成工具',
      'about.usage_title': '使用说明',
      'about.usage_desc': '点击账户可复制验证码，右键可删除账户',
      
      // 语言选项
      'language.chinese': '中文',
      'language.english': 'English',
      'language.auto': '跟随系统',
      'language.setting_title': '界面语言',
      'language.setting_desc': '选择应用程序的显示语言',
      
      // 提示信息
      'toast.no_accounts_to_export': '没有账户数据可导出',
      'toast.export_success': '账户数据导出成功',
      'toast.export_failed': '导出失败，请重试',
      'toast.invalid_file_format': '无效的文件格式',
      'toast.all_accounts_exist': '所有账户都已存在',
      'toast.no_valid_accounts': '没有有效的账户数据',
      'toast.import_failed': '导入失败，请重试',
      'toast.file_format_error': '文件格式错误，请选择有效的JSON文件',
      'toast.language_changed': '语言设置已更新',
      'toast.code_copied': '验证码已复制到剪贴板',
      'toast.code_filled': '验证码已自动填充',
      'toast.fill_failed': '自动填充失败',
      'toast.fill_all_fields': '请填写所有字段',
      'toast.invalid_secret': '无效的密钥格式',
      'toast.incomplete_account_info': '请填写完整的账户信息',
      'toast.account_exists': '账户名已存在',
      'toast.invalid_secret_format': '无效的密钥格式',
      'toast.import_success': '✅ 成功导入 {imported} 个账户',
      'toast.import_success_with_skip': '✅ 成功导入 {imported} 个账户，跳过 {skipped} 个重复账户',
      'toast.import_success_with_file': '✅ 从 "{filename}" 成功导入 {imported} 个账户',
      'toast.import_success_with_file_and_skip': '✅ 从 "{filename}" 成功导入 {imported} 个账户，跳过 {skipped} 个重复账户',
      'toast.import_all_duplicates': '⚠️ 所有账户都已存在，未导入任何新账户',
      'toast.import_no_valid': '❌ 文件中没有有效的账户数据',
      'toast.import_suggestion': '💡 您可以在账户列表中查看新导入的账户',
      
      // 确认对话框
      'dialog.export_title': '确认导出',
      'dialog.export_message': '即将导出 {count} 个账户的数据。导出的文件包含敏感信息，请妥善保管。',
      'dialog.import_title': '确认导入',
      'dialog.import_message': '即将导入 {count} 个账户。导入操作将添加新账户，重复的账户将被跳过。',
      'dialog.delete_title': '确认删除',
      'dialog.delete_message': '确定要删除账户 "{name}" 吗？',
      
      // 右键菜单
      'contextmenu.delete': '删除账户',
      
      // 空状态
      'empty.no_accounts': '暂无账户',
      'empty.add_account_tip': '点击右上角添加账户开始使用',
      
      // 错误信息
      'error.init_failed': '初始化失败，请刷新页面重试',
      
      // 导入结果
      'import.success_message': '✅ 成功导入 {count} 个账户',
      'import.success_with_skip': '✅ 成功导入 {count} 个账户，跳过 {skip} 个重复账户',
      'import.all_exist': '⚠️ 所有账户都已存在',
      'import.no_valid_data': '❌ 没有有效的账户数据',
      'import.partial_success': '⚠️ 部分导入成功：{imported} 个账户已添加，{invalid} 个账户格式无效'
    },
    
    'en-US': {
      // 页面标题和按钮
      'title': 'TOTP Generator',
      'addAccount': 'Add Account',
      'app.title': 'TOTP Generator',
      'button.settings': 'Settings',
      'button.add_account': 'Add Account',
      'button.add': 'Save',
      'button.cancel': 'Cancel',
      'button.save': 'Save',
      'button.close': 'Close',
      'button.export': 'Export',
      'button.import': 'Import',
      'button.confirm': 'Confirm',
      'button.delete': 'Delete',
      
      // 表单标签
      'form.title': 'Add Account',
      'form.add_account': 'Add Account',
      'form.accountName': 'Account Name',
      'form.secretKey': 'Secret Key',
      'form.account_name': 'Account Name',
      'form.secret_key': 'Secret Key',
      'form.placeholder.account': 'e.g., GitHub',
      'form.placeholder.secret': 'Enter Base32 format secret key',
      
      // 设置页面
      'settings.title': 'Settings',
      'settings.close_aria': 'Close settings page',
      'settings.accountManagement': 'Account Management',
      'settings.account_management': 'Account Management',
      'settings.language': 'Language Settings',
      'settings.about': 'About',
      'settings.languageTitle': 'Interface Language',
      'settings.languageDesc': 'Choose the display language for the application',
      'settings.languageAuto': 'Auto Detect',
      'settings.languageChinese': '中文',
      'settings.languageEnglish': 'English',
      'settings.exportData': 'Export Account Data',
      'settings.exportDesc': 'Export all account data as JSON file for backup',
      'settings.importData': 'Import Account Data',
      'settings.importDesc': 'Import account data from JSON file, supports data merging',
      'settings.export': 'Export',
      'settings.import': 'Import',
      'settings.appName': 'TOTP Generator',
      'settings.appVersion': 'Version 1.0.0 - Secure two-factor authentication tool',
      'settings.usage': 'Usage Instructions',
      'settings.usageDesc': 'Click account to copy code, right-click to delete account',
      
      // 导入导出
      'export.title': 'Export Account Data',
      'export.desc': 'Export all account data as JSON file for backup',
      'import.title': 'Import Account Data',
      'import.desc': 'Import account data from JSON file, supports data merging',
      
      // 应用信息
      'about.app_name': 'TOTP Generator',
      'about.version': 'Version 1.0.0 - Secure two-factor authentication tool',
      'about.usage_title': 'Usage Instructions',
      'about.usage_desc': 'Click account to copy code, right-click to delete account',
      
      // 语言选项
      'language.chinese': '中文',
      'language.english': 'English',
      'language.auto': 'Follow System',
      'language.setting_title': 'Interface Language',
      'language.setting_desc': 'Choose the display language for the application',
      
      // 提示信息
      'toast.no_accounts_to_export': 'No account data to export',
      'toast.export_success': 'Account data exported successfully',
      'toast.export_failed': 'Export failed, please try again',
      'toast.invalid_file_format': 'Invalid file format',
      'toast.all_accounts_exist': 'All accounts already exist',
      'toast.no_valid_accounts': 'No valid account data',
      'toast.import_failed': 'Import failed, please try again',
      'toast.file_format_error': 'File format error, please select a valid JSON file',
      'toast.language_changed': 'Language settings updated',
      'toast.code_copied': 'Verification code copied to clipboard',
      'toast.code_filled': 'Verification code auto-filled',
      'toast.fill_failed': 'Auto-fill failed',
      'toast.fill_all_fields': 'Please fill in all fields',
      'toast.invalid_secret': 'Invalid secret key format',
      'toast.incomplete_account_info': 'Please fill in complete account information',
      'toast.account_exists': 'Account name already exists',
      'toast.invalid_secret_format': 'Invalid secret key format',
      'toast.import_success': '✅ Successfully imported {imported} accounts',
      'toast.import_success_with_skip': '✅ Successfully imported {imported} accounts, skipped {skipped} duplicate accounts',
      'toast.import_success_with_file': '✅ Successfully imported {imported} accounts from "{filename}"',
      'toast.import_success_with_file_and_skip': '✅ Successfully imported {imported} accounts from "{filename}", skipped {skipped} duplicate accounts',
      'toast.import_all_duplicates': '⚠️ All accounts already exist, no new accounts imported',
      'toast.import_no_valid': '❌ No valid account data found in file',
      'toast.import_suggestion': '💡 You can view newly imported accounts in the account list',
      
      // 确认对话框
      'dialog.export_title': 'Confirm Export',
      'dialog.export_message': 'About to export {count} accounts data. The exported file contains sensitive information, please keep it safe.',
      'dialog.import_title': 'Confirm Import',
      'dialog.import_message': 'About to import {count} accounts. Import operation will add new accounts, duplicate accounts will be skipped.',
      'dialog.delete_title': 'Confirm Delete',
      'dialog.delete_message': 'Are you sure you want to delete account "{name}"?',
      
      // 右键菜单
      'contextmenu.delete': 'Delete Account',
      
      // 空状态
      'empty.no_accounts': 'No Accounts',
      'empty.add_account_tip': 'Click the top right corner to add an account to get started',
      
      // 错误信息
      'error.init_failed': 'Initialization failed, please refresh the page and try again',
      
      // Import results
      'import.success_message': '✅ Successfully imported {count} accounts',
      'import.success_with_skip': '✅ Successfully imported {count} accounts, skipped {skip} duplicate accounts',
      'import.all_exist': '⚠️ All accounts already exist',
      'import.no_valid_data': '❌ No valid account data',
      'import.partial_success': '⚠️ Partial import success: {imported} accounts added, {invalid} accounts have invalid format'
    }
  },
  
  // 初始化
  async init() {
    try {
      // 检查chrome.storage是否可用
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        // 从存储中获取用户语言偏好
        const result = await chrome.storage.local.get(['userLanguage']);
        if (result.userLanguage) {
          this.currentLanguage = result.userLanguage;
        } else {
          // 自动检测系统语言
          this.currentLanguage = this.detectSystemLanguage();
          // 保存检测到的语言
          await this.setLanguage(this.currentLanguage);
        }
      } else {
        // 在非扩展环境中使用localStorage作为fallback
        const storedLanguage = localStorage.getItem('userLanguage');
        if (storedLanguage) {
          this.currentLanguage = storedLanguage;
        } else {
          // 自动检测系统语言
          this.currentLanguage = this.detectSystemLanguage();
          // 保存检测到的语言
          localStorage.setItem('userLanguage', this.currentLanguage);
        }
      }
    } catch (error) {
      console.error('I18n initialization failed:', error);
      // 使用默认语言
      this.currentLanguage = 'zh-CN';
    }
  },
  
  // 检测系统语言
  detectSystemLanguage() {
    const systemLang = navigator.language || navigator.userLanguage || 'zh-CN';
    
    // 支持的语言映射
    const langMap = {
      'zh': 'zh-CN',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-CN',
      'zh-HK': 'zh-CN',
      'en': 'en-US',
      'en-US': 'en-US',
      'en-GB': 'en-US'
    };
    
    // 首先尝试完整匹配
    if (langMap[systemLang]) {
      return langMap[systemLang];
    }
    
    // 然后尝试语言代码匹配
    const langCode = systemLang.split('-')[0];
    if (langMap[langCode]) {
      return langMap[langCode];
    }
    
    // 默认返回中文
    return 'zh-CN';
  },
  
  // 设置语言
  async setLanguage(language) {
    try {
      // 保存语言偏好到存储
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ userLanguage: language });
      } else {
        // 在非扩展环境中使用localStorage作为fallback
        localStorage.setItem('userLanguage', language);
      }
    } catch (error) {
      console.error('Failed to save language preference:', error);
      // 即使保存失败也继续设置语言
    }
    
    let actualLanguage = language;
    if (language === 'auto') {
      actualLanguage = this.detectSystemLanguage();
    }
    
    if (this.languages[actualLanguage]) {
      this.currentLanguage = actualLanguage;
      await this.updateUI();
    }
  },
  
  // 获取翻译文本
  t(key, params = {}) {
    const langPack = this.languages[this.currentLanguage] || this.languages['zh-CN'];
    let text = langPack[key] || key;
    
    // 替换参数
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
    });
    
    return text;
  },
  
  // 更新界面文本
  updateUI() {
    // 更新所有带有data-i18n属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const text = this.t(key);
      if (text !== key) {
        element.textContent = text;
      }
    });

    // 更新所有带有data-i18n-placeholder属性的元素
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const text = this.t(key);
      if (text !== key) {
        element.placeholder = text;
      }
    });

    // 更新所有带有data-i18n-title属性的元素
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const text = this.t(key);
      if (text !== key) {
        element.title = text;
      }
    });

    // 更新页面标题
    document.title = this.t('title');
  },
  
  // 更新元素文本的辅助方法
  updateElement(selector, property, key) {
    const element = document.querySelector(selector);
    if (element) {
      element[property] = this.t(key);
    }
  },
  
  // 更新空状态
  updateEmptyState() {
    const emptyDiv = document.querySelector('.account-list div');
    if (emptyDiv && emptyDiv.textContent.includes('暂无账户')) {
      emptyDiv.innerHTML = `
        <div>${this.t('empty.no_accounts')}</div>
        <div style="margin-top: 8px; font-size: 12px; opacity: 0.7">${this.t('empty.add_account_tip')}</div>
      `;
    }
  },
  
  // 获取当前语言
    getCurrentLanguage() {
      return this.currentLanguage;
    },
    
    // 获取存储的语言偏好或自动检测
    async getStoredLanguage() {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const result = await chrome.storage.local.get(['userLanguage']);
          return result.userLanguage || 'auto';
        } else {
          // 在非扩展环境中使用localStorage作为fallback
          return localStorage.getItem('userLanguage') || 'auto';
        }
      } catch (error) {
        console.error('Failed to get stored language:', error);
        return 'auto';
      }
    },
  
  // 获取支持的语言列表
  getSupportedLanguages() {
    return [
      { code: 'auto', name: this.t('language.auto') },
      { code: 'zh-CN', name: this.t('language.chinese') },
      { code: 'en-US', name: this.t('language.english') }
    ];
  }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18n;
}