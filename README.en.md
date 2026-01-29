# TOTP Generator Chrome Extension

<div align="center">

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dhipejmoajhjflafhbibojfoeogbmjgf?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)
[![GitHub release](https://img.shields.io/github/v/release/titxue/mfa?label=GitHub)](https://github.com/titxue/mfa/releases)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/dhipejmoajhjflafhbibojfoeogbmjgf)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)
[![GitHub stars](https://img.shields.io/github/stars/titxue/mfa?style=social)](https://github.com/titxue/mfa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Modern Two-Factor Authentication (2FA) Solution**

Time-based One-Time Password (TOTP) generator built with React 19 + TypeScript + Bun.
QR code scanning, auto-fill, fully offline, local data storage, **12 languages**.

[Install](#installation) • [Features](#features) • [Usage](#usage) • [Development](#development) • [i18n](#internationalization)

[中文文档](README.md)

</div>

---

## ✨ Features

- 🔐 **TOTP Code Generation** - 30s interval, RFC 6238 standard, real-time countdown progress ring
- 📷 **QR Code Scanning** - Image upload recognition, paste/drag upload, auto-fill, offline processing
- 📤 **QR Code Export** - Double-click account card to generate QR code, download PNG images, easy cross-device migration
- 🎯 **Smart Auto-Fill** - One-click fill to web pages, auto-copy to clipboard on failure
- 🎨 **Drag & Drop Sorting** - Freely adjust account order, smooth animation effects
- 💾 **Data Management** - Local/sync storage (Chrome account, fallback to local), JSON import/export, duplicate detection
- 🌍 **12 Languages** - Simplified/Traditional Chinese, English, Spanish, French, Portuguese, German, Russian, Arabic, Japanese, Korean, Hindi
- 🎨 **Modern UI** - shadcn/ui design system, smooth animations, responsive layout
- 🔒 **Privacy & Security** - No third-party network requests, no data collection; if Chrome sync enabled, can enable "sync encryption passphrase" in browser settings

---

## 🚀 Installation

### Chrome Web Store (Recommended)

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dhipejmoajhjflafhbibojfoeogbmjgf?label=Install&style=for-the-badge&logo=googlechrome)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)

### Developer Mode

```bash
git clone https://github.com/titxue/mfa.git
cd mfa
bun install
bun run build
# Chrome → chrome://extensions/ → Developer mode → Load unpacked → Select dist directory
```

---

## 📖 Usage

### Add Account

**QR Code Scanning (Recommended)**
1. Click "+" button
2. Click "Scan QR Code"
3. Upload image containing TOTP QR code
4. Auto-recognize and save

**Manual Input**
1. Click "+" button
2. Enter account name and Base32 secret key
3. Click "Save"

### Use Verification Code

- **Auto-Fill**: Left-click account card
- **Manual Copy**: Auto-copy to clipboard on fill failure
- **Delete Account**: Right-click account card

### Data Management

- **Export**: Settings → Export (JSON format)
- **Import**: Settings → Import (auto-skip duplicates)
- **Language**: Settings → Select from 12 languages (auto-detect browser language)

---

## 💡 Why Choose This

| Feature | This Extension | Description |
|---------|----------------|-------------|
| 🎨 UI Design | shadcn/ui + Radix UI | Modern component library |
| 🌍 Languages | 12 languages | Multilingual support |
| 📷 QR Code | Upload/Paste/Drag | Multiple methods |
| 🚀 Build Speed | < 400ms | Super fast with Bun |
| 📦 Tech Stack | React 19 + TypeScript | Latest technology |
| 📝 Type Safety | 100% TypeScript | Compile-time checks |
| 🔧 Extensibility | Automated architecture | Easy to add languages |

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **UI Library**: shadcn/ui (based on Radix UI)
- **Build Tool**: Bun (< 400ms)
- **Core Libraries**: jsQR, lucide-react, sonner
- **Standard**: Chrome Extension Manifest V3

---

## 🌍 Internationalization

### Supported Languages (12)

<div align="center">

| Region | Language | Code |
|--------|----------|------|
| 🇨🇳 | 中文（简体） | zh-CN |
| 🇹🇼 | 中文（繁體） | zh-TW |
| 🇺🇸 | English | en-US |
| 🇪🇸 | Español | es-ES |
| 🇫🇷 | Français | fr-FR |
| 🇧🇷 | Português | pt-BR |
| 🇩🇪 | Deutsch | de-DE |
| 🇷🇺 | Русский | ru-RU |
| 🇸🇦 | العربية | ar-SA |
| 🇯🇵 | 日本語 | ja-JP |
| 🇰🇷 | 한국어 | ko-KR |
| 🇮🇳 | हिन्दी | hi-IN |

</div>

### Features

- ✅ **Auto-Detection** - Automatically switch based on browser language
- ✅ **Manual Switch** - Choose any language in settings
- ✅ **Complete Translation** - 100% UI text translated
- ✅ **Type Safety** - TypeScript compile-time checks

### Add New Language

We use an automated language registration mechanism. Adding a new language requires only 2 steps:

1. **Create translation file** `src/locales/xx-XX.ts`
2. **Register language** Add configuration in `src/locales/index.ts`

See: [Add New Language Guide](docs/ADD_NEW_LANGUAGE.md)

**Architecture Benefits**:
- Single configuration file
- Auto-generated types
- Auto-updated UI
- Zero code duplication

---

## 🔧 Development

### Requirements
- Bun 1.2+
- Chrome 88+

### Commands

```bash
bun install              # Install dependencies
bun run dev              # Development mode
bun run build            # Production build
bun run type-check       # Type checking
bun run generate-icons   # Generate icons
```

### Project Structure

```
src/
├── components/          # React components
├── contexts/           # React Context (I18n)
├── hooks/              # Custom Hooks
├── locales/            # Translation files
│   ├── index.ts       # Language registry (add new languages here)
│   ├── zh-CN.ts       # Simplified Chinese
│   ├── en-US.ts       # English
│   └── ...            # Other languages
├── utils/              # Utility functions
└── types/              # TypeScript types
```

### Add New Language

Detailed guide: [docs/ADD_NEW_LANGUAGE.md](docs/ADD_NEW_LANGUAGE.md)

**Quick Steps**:
1. Create `src/locales/xx-XX.ts` translation file
2. Register in `src/locales/index.ts` (7 lines of config)
3. Run `bun run build`

No need to modify other files, types and UI auto-update!

### Permissions
- `storage` - Local/sync storage
- `activeTab` - Auto-fill
- `scripting` - Page operations

---

## ❓ FAQ

<details>
<summary><strong>How to backup data?</strong></summary>

Settings → Export, download JSON file. ⚠️ File contains unencrypted keys, keep safe.
</details>

<details>
<summary><strong>Verification code inaccurate?</strong></summary>

Check if system time is accurate (TOTP is time-based).
</details>

<details>
<summary><strong>Auto-fill failed?</strong></summary>

Some websites use special input fields. Code will auto-copy to clipboard on fill failure.
</details>

<details>
<summary><strong>Does data sync with Google account?</strong></summary>

Yes, uses chrome.storage.sync by default, syncs across devices with same Google account and sync enabled; falls back to local storage if not logged in or sync disabled.
Note:
- Store version and "developer mode loaded" unpacked version have different extension IDs, data won't sync
- Can enable "encryption passphrase" in Chrome sync settings for end-to-end encryption
- Sync has quotas (max ~8KB per key, ~10MB total), initial sync may have delays
</details>

---

## 🤝 Contributing

Issues and Pull Requests welcome!

**Development Guidelines**
- Use TypeScript for type safety
- Follow React Hooks best practices
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
- Don't commit console.log

**Contribution Types**

1. **Translation** - Help add new languages or improve existing translations
   - See [Add New Language Guide](docs/ADD_NEW_LANGUAGE.md)
   - Just create translation file and add config, very simple!

2. **Feature Development** - Add new features or improve existing ones
   - Create Issue for discussion first
   - Ensure TypeScript type checks and builds pass

3. **Bug Fixes** - [Report Bug](https://github.com/titxue/mfa/issues/new)
   - Provide description, reproduction steps, browser version

4. **Documentation** - Improve docs, fix errors, add examples

---

## 📋 Changelog

### v2.1.0 (2026-01-29)
- ✨ **Major i18n Update** - Expanded from 2 to 12 languages
  - Added: Traditional Chinese, Spanish, French, Portuguese, German, Russian, Arabic, Japanese, Korean, Hindi
  - Auto-detect browser language and switch
  - Support regional variants (e.g., es-MX, fr-CA, pt-PT)
- 🏗️ **Language Architecture Optimization** - Automated language registration
  - Adding new language reduced from 5 files to 2 files
  - Auto-generated types, auto-updated UI
  - Single source of truth, eliminated code duplication
  - See [Architecture Docs](docs/LANGUAGE_ARCHITECTURE.md)

### v2.0.5 (2026-01-07)
- ✨ Added QR code export - Double-click account card to generate/download QR code
- ✨ Improved paste/drag upload - Support paste images and otpauth:// URI text
- 🐛 Fixed drag-sort breaking click-copy
- ⚡️ Optimized drag activation threshold (5px movement) to avoid accidental triggers

### v2.0.1 (2025-12-21)
- 🐛 Fixed QR code parsing errors
- ✨ Unified version management
- ✨ Added icon generation system
- 🎨 Improved settings page UI
- 🧹 Cleaned Git repo and log statements
- 📝 Enhanced documentation

### v2.0.0 (2025-12)
- ✨ New architecture: React 19 + TypeScript + Bun
- ✨ QR code scanning
- ✨ shadcn/ui design system
- ✨ Manifest V3 standard
- ⚡️ Build speed < 400ms

---

## 📄 License

MIT License

---

<div align="center">

**⭐ If this project helps you, please give it a Star!**

[Report Bug](https://github.com/titxue/mfa/issues) • [Feature Request](https://github.com/titxue/mfa/issues) • [Contribute](https://github.com/titxue/mfa/pulls)

Made with ❤️ by [titxue](https://github.com/titxue)

</div>
