import type { Translations } from './zh-CN'

export const enUS: Translations = {
  // Page title and buttons
  'title': 'TOTP Generator',
  'addAccount': 'Add Account',
  'button.add': 'Save',
  'button.cancel': 'Cancel',
  'button.close': 'Close',
  'button.export': 'Export',
  'button.import': 'Import',
  'button.delete': 'Delete',

  // Form
  'form.title': 'Add Account',
  'form.accountName': 'Account Name',
  'form.secretKey': 'Secret Key',
  'form.accountInfo': 'Account Information',
  'form.accountNameDesc': 'Set an easily recognizable name for this account',
  'form.secretKeyDesc': 'Enter the TOTP secret key obtained from the service provider',
  'form.saveAccount': 'Save Account',
  'form.saveAccountDesc': 'Confirm the information is correct and save this account',
  'form.accountNamePlaceholder': 'e.g., GitHub',
  'form.secretKeyPlaceholder': 'Enter Base32 format secret key',

  // Settings
  'settings.title': 'Settings',
  'settings.accountManagement': 'Account Management',
  'settings.language': 'Language Settings',
  'settings.about': 'About',
  'settings.languageTitle': 'Interface Language',
  'settings.languageDesc': 'Choose the display language for the application',
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

  // Toast messages
  'toast.no_accounts_to_export': 'No account data to export',
  'toast.export_success': 'Account data exported successfully',
  'toast.export_failed': 'Export failed, please try again',
  'toast.invalid_file_format': 'Invalid file format',
  'toast.import_failed': 'Import failed, please try again',
  'toast.language_changed': 'Language settings updated',
  'toast.code_copied': 'Verification code copied to clipboard',
  'toast.code_filled': 'Verification code auto-filled',
  'toast.fill_failed': 'Auto-fill failed',
  'toast.fill_all_fields': 'Please fill in all fields',
  'toast.invalid_secret': 'Invalid secret key format',
  'toast.account_exists': 'Account name already exists',
  'toast.import_success': '✅ Successfully imported {imported} accounts',
  'toast.import_success_with_skip': '✅ Successfully imported {imported} accounts, skipped {skipped} duplicate accounts',
  'toast.import_all_duplicates': '⚠️ All accounts already exist, no new accounts imported',
  'toast.import_no_valid': '❌ No valid account data found in file',

  // Confirmation dialogs
  'dialog.export_title': 'Confirm Export',
  'dialog.export_message': 'About to export {count} accounts data. The exported file contains sensitive information, please keep it safe.',
  'dialog.import_title': 'Confirm Import',
  'dialog.import_message': 'About to import {count} accounts. Import operation will add new accounts, duplicate accounts will be skipped.',
  'dialog.delete_title': 'Confirm Delete',
  'dialog.delete_message': 'Are you sure you want to delete account "{name}"? This action cannot be undone.',

  // Empty state
  'empty.no_accounts': 'No Accounts',
  'empty.add_account_tip': 'Click the top right corner to add an account to get started',

  // Error messages
  'error.init_failed': 'Initialization failed, please refresh the page and try again',
}
