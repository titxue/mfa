# TOTP Generator Chrome Extension

<div align="center">

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/dhipejmoajhjflafhbibojfoeogbmjgf?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)
[![GitHub release](https://img.shields.io/github/v/release/titxue/mfa?label=GitHub)](https://github.com/titxue/mfa/releases)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/dhipejmoajhjflafhbibojfoeogbmjgf)](https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf)
[![GitHub stars](https://img.shields.io/github/stars/titxue/mfa?style=social)](https://github.com/titxue/mfa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Modern Two-Factor Authentication (2FA) Solution**

Time-based One-Time Password (TOTP) generator built with React 19 + TypeScript + Bun.
Offline code generation, website filling, master password protection, encrypted backups, and **12 languages**. Accounts can sync through Chrome.

[Official website](https://mfa.xuejy.com/)

[Install](#installation) • [Features](#features) • [Usage](#usage) • [Development](#development) • [i18n](#internationalization)

[中文文档](README.md)

</div>

---

## ✨ Features

- 🔐 **TOTP Code Generation** - 30s interval, RFC 6238 standard, real-time countdown progress ring
- 📷 **QR Code Scanning** - Image upload recognition, paste/drag upload, auto-fill, offline processing
- 📤 **QR Code Export** - Double-click account card to generate QR code, download PNG images, easy cross-device migration
- 🎯 **Smart Auto-Fill** - Fill web pages with optional clipboard fallback; grant site access to use the inline account menu
- 🎨 **Drag & Drop Sorting** - Freely adjust account order, smooth animation effects
- 💾 **Data Management** - Chrome account sync, plain/encrypted JSON backups, import count preview, duplicate detection
- 🌍 **12 Languages** - Simplified/Traditional Chinese, English, Spanish, French, Portuguese, German, Russian, Arabic, Japanese, Korean, Hindi
- 🎨 **Modern UI** - shadcn/ui design system, smooth animations, responsive layout
- 🔒 **Privacy & Security** - Codes and QR images are processed locally; enable password protection to encrypt accounts before Chrome sync

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
4. Review the recognized account details and click “Save”

You can also paste/drag QR images or paste an `otpauth://totp/` URI. Only **SHA1, 6 digits, and a 30-second period** are supported; unsupported parameters are rejected.

**Manual Input**
1. Click "+" button
2. Enter account name and Base32 secret key
3. Click "Save"

### Use Verification Code

- **Auto-Fill**: Left-click account card
- **Clipboard fallback**: When enabled in settings, copy the code if filling fails
- **Delete Account**: Right-click account card

### Data Management

- **Plain backup import**: Select JSON → preview the file account count → confirm. Duplicate accounts are skipped.
- **Encrypted backup import**: Select JSON → enter the backup password → “Decrypt and preview” → check the count → confirm. Wrong passwords or damaged files prevent import.
- **Export**: Protected accounts export encrypted backups by default. Plain export requires the current password.
- **Language**: Choose from 12 languages in settings.

### Password Protection and Sync

Enable password protection in settings with a master password of at least 8 characters. Account names, secrets, and websites are encrypted together. Unlock state stays in the local browser session: closing the popup does not lock it, restarting the browser does, and you can lock manually.

Another device needs the same password after receiving encrypted records. Offline or unsynced devices may retain old plaintext copies; enabling protection cannot immediately lock those copies remotely. Concurrent cross-device edits are not guaranteed to be conflict-free, so avoid editing on multiple devices at once.

Changing the password or disabling protection requires the current password. Disabling protection restores plaintext sync. Forgotten passwords cannot be recovered, and old backups still require their export password. See [password protection and sync](docs/PASSWORD_PROTECTION.md) and [site access](docs/SITE_ACCESS.md) (Chinese).

---

## 💡 Why Choose This

| Feature | This Extension | Description |
|---------|----------------|-------------|
| 🎨 UI Design | shadcn/ui + Radix UI | Modern component library |
| 🌍 Languages | 12 languages | Multilingual support |
| 📷 QR Code | Upload/Paste/Drag | Multiple methods |
| 🚀 Development | Bun + file watching | Rebuild on changes |
| 📦 Tech Stack | React 19 + TypeScript | Latest technology |
| 📝 Type Safety | 100% TypeScript | Compile-time checks |
| 🔧 Extensibility | Automated architecture | Easy to add languages |

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **UI Library**: shadcn/ui (based on Radix UI)
- **Build Tool**: Bun + Tailwind CSS
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

Main UI languages are loaded through a registry:

1. **Create translation file** `src/locales/xx-XX.ts`
2. **Register language** Add configuration in `src/locales/index.ts`

See: [Add New Language Guide](docs/ADD_NEW_LANGUAGE.md)

The language picker is generated from the registry. Security strings, inline-menu copy, and store metadata still need separate updates.

---

## 🔧 Development

### Requirements
- Bun 1.2+
- Chrome 102+

### Commands

```bash
bun install              # Install dependencies
bun run dev              # Watch source, public assets, and build configuration
bun run build            # Production build
bun run type-check       # Type checking
bun run test             # Automated tests
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

Also update `src/locales/security.ts`, inline-menu strings, and store name/description mappings in `build.ts`.

`bun run dev` batches file changes and rebuilds serially, continuing after build failures. Generated `src/version.ts` and `dist/` do not cause rebuild loops. Reload the extension in Chrome after rebuilding.

The background `VaultService` owns account operations. The popup communicates through messages; authorized content scripts receive account summaries and codes, not secrets.

The official site lives in `website/`: run `npm install`, then `npm run build`. Use `npm run deploy` from an authenticated Cloudflare environment to publish. Its version is synced from the root `package.json`.

### Permissions
- `storage` - Local/sync storage
- `activeTab` - Auto-fill
- `scripting` - Page script injection
- `contextMenus` - Site access context menu
- Optional `http://*/*` / `https://*/*` host permissions - User-granted access per site for inline filling

---

## ❓ FAQ

<details>
<summary><strong>How to backup data?</strong></summary>

With password protection enabled, JSON exports are encrypted by default; plain export requires the current password. Without protection, exports contain plaintext secrets. Encrypted backups require the password used when exported.
</details>

<details>
<summary><strong>Verification code inaccurate?</strong></summary>

Check if system time is accurate (TOTP is time-based).
</details>

<details>
<summary><strong>Auto-fill failed?</strong></summary>

Some websites use unusual input fields. Enable clipboard fallback to copy when filling fails. The inline menu requires site access permission.
</details>

<details>
<summary><strong>Does data sync with Google account?</strong></summary>

The extension uses `chrome.storage.sync`. Both devices need the same extension ID and Chrome account, with extension data sync enabled. Data stays local while offline or sync is disabled, and resumes syncing when connected with sync enabled.

- Different extension IDs have separate data. Use the same manifest public key to keep a consistent development ID across different loading paths.
- Without extension password protection, account records are not encrypted by the extension.
- All accounts share one record, limited to about 8 KB; total sync capacity is about 100 KB. Oversized writes report an error rather than truncating accounts.
- Sync can be delayed. A successful local save does not confirm delivery to other devices.
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
   - Include security strings, inline-menu copy, and store metadata.

2. **Feature Development** - Add new features or improve existing ones
   - Create Issue for discussion first
   - Ensure TypeScript type checks and builds pass

3. **Bug Fixes** - [Report Bug](https://github.com/titxue/mfa/issues/new)
   - Provide description, reproduction steps, browser version

4. **Documentation** - Improve docs, fix errors, add examples

---

## 📋 Changelog

### v2.2.0

- Master password protection, encrypted account storage, manual locking, and encrypted backups.
- Per-site access and inline verification-code menus.
- Account count previews for plain backups; decrypt and preview encrypted backups before confirming import.
- Unsupported TOTP parameters are rejected instead of silently generating incorrect codes.
- Failed settings writes restore prior values and show errors; development mode now watches files.
- Updated the bilingual website and setup guides.

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
