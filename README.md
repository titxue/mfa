# TOTP Generator Chrome Extension

A Chrome extension for generating Time-based One-Time Passwords (TOTP) for two-factor authentication.

## Features

- Generate TOTP codes with 30-second intervals
- Visual countdown timer
- Save account information locally
- Secure implementation using Web Crypto API
- Support for Base32 encoded secrets

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Development

### Prerequisites

- Node.js and npm (for icon generation)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Generate icons:
```bash
node generate_icons.js
```

### Project Structure

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup UI
- `popup.js` - UI interaction logic
- `totp.js` - TOTP generation implementation
- `generate_icons.js` - Icon generation script
- `icons/` - Extension icons

## Usage

1. Click the extension icon in Chrome toolbar
2. Enter your account name and Base32 secret key
3. Click "Save" to store the information
4. The TOTP code will be generated automatically and update every 30 seconds
5. A progress bar shows the remaining time until the next code

## Security

- All sensitive data is stored in Chrome's secure storage
- TOTP generation uses the Web Crypto API for secure cryptographic operations
- No external network requests are made

## License

MIT License 