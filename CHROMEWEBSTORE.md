# Chrome Web Store — MFA

Last updated: 2026-11-06 (Asia/Shanghai).

## Original listing

- Item: `dhipejmoajhjflafhbibojfoeogbmjgf`.
- Publisher: `37364da7-e04a-4807-a6a1-e63da317b0a7`.
- URL: https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf
- Name: TOTP Authenticator - 2FA OTP Code Generator.
- Short description: Secure and fast TOTP authenticator for 2FA login. Generate OTP codes offline and manage multiple accounts easily.
- Primary language: English; 12 extension languages.
- Category, distribution, publisher identity and contact: retain the existing listing settings; do not create another item.
- Public version observed on 2026-11-06: 2.3.9. Prepared update: 2.4.0.

## Updated detailed description

Generate two-factor authentication codes, manage accounts, and fill codes into websites from your browser.

Add accounts by uploading, pasting or dropping a QR image, or by pasting an otpauth link. Generate standard TOTP and Steam Guard codes, reorder accounts, and keep optional website addresses for easier filling.

Everyday setup stays simple. Expand Advanced settings only when your provider requires SHA-256 or SHA-512, eight digits, or a different refresh interval. Standard accounts keep the usual six-digit, 30-second defaults.

Back up and restore accounts with JSON, including password-encrypted backups. Import compatible authenticator exports and export account QR codes. Optional password protection locks access to your account vault.

Code generation works offline. Accounts and settings use browser storage and may synchronize through your Chrome account. Optional Steam linking contacts Valve's official services only when you use that feature. Filling sends the selected code to the website you choose. There is no developer-operated account server, advertising or analytics.

Update your devices to the same extension version. Version 2.4.0 asks you to confirm the existing account-vault upgrade; protected accounts continue to require their original password. If synchronization is incomplete or conflicting, the extension keeps recovery data and asks you to resolve it. Export any versions you need before choosing a conflict resolution. Browser synchronization cannot guarantee atomic updates across offline devices, so keep a safe backup of important accounts.

Plain backups and recovery exports may contain account secrets. Keep them private. Password protection does not retroactively encrypt every historical copy or an offline device's older copy.

Support: https://github.com/titxue/mfa/issues

## Permissions justification

| Permission | Reason |
| --- | --- |
| storage | Store accounts, optional encrypted vaults, settings and recoverable synchronization versions in the browser. Chrome Sync may transmit synchronized records to Google. |
| activeTab | Access the currently selected website when the user chooses to fill an authentication code. |
| scripting | Inject the bundled code-filling script into an authorized website. |
| contextMenus | Offer site access and code-filling actions from the browser context menu. |
| Optional `https://*/*`, `http://*/*` | Let the user grant individual websites persistent code-filling access. Optional Steam linking requests access to Valve's official API. No blanket website grant is required for ordinary code generation. |

The 2.4.0 permission set is unchanged from the 2.3.9 release source. No dependency or network endpoint was added by this update.

## Privacy and data use

The extension processes user-provided account names, authentication secrets, optional website addresses and preferences. These stay in browser storage and may leave the device via Chrome Sync. Password protection encrypts the active vault; historical recovery data may retain its previous protection state. Explicit exports are downloaded to the user's device.

Optional Steam linking sends the login information and authentication requests needed for that operation directly to Valve. Selected authentication codes are delivered to the website the user fills. No developer-operated collection endpoint, advertising or analytics is included.

Data is not sold, used for unrelated purposes or used for lending/credit decisions. Do not describe the extension as making no network requests: Chrome Sync and optional Steam linking are disclosed above. Retain and verify existing store disclosure settings against these behaviors before submission.

Privacy policy URL (after the documentation commit is pushed): https://github.com/titxue/mfa/blob/master/docs/PRIVACY.md

## Assets

The production package contains valid 16, 48 and 128 pixel icons. Fresh 1280×800 screenshots of the account list, default add form and advanced settings are prepared in the release evidence directory. They use synthetic accounts only.

## Release history

| Version | Date | Changes | Status |
| --- | --- | --- | --- |
| 2.4.0 | 2026-11-06 | Configurable TOTP parameters; protected vault migration/recovery; simpler advanced settings; website field beneath name; clearer recovery status. | Prepared; not yet uploaded or submitted |
| 2.3.9 | Observed 2026-11-06 | Previous published version. | Published |

## Release evidence

- Source commit: `9129bdbb2acc4a4a952818bb30a952e620222228`.
- Archive: `mfa-2.4.0-release.zip`, 24 files, 591,582 bytes.
- SHA-256: `04d1ab616435ebeec49e25fcf6f4b6ec3302433c3524a63c614f177a173fda39`.
- Archive entries exactly match the production `dist` directory, with manifest at ZIP root and no fixed test identity, source, credentials or profile data.
- 256 unit/component, 31 Steam helper and 49 isolated-browser tests passed; production build and both type checks passed.
- GitHub CI: https://github.com/titxue/mfa/actions/runs/42148056116 (success).
- Same-identity upgrades from rebuilt 2.3.9 release source passed for plain V1, encrypted V1 and legacy accounts (six synthetic accounts each). The original old ZIP was unavailable; only temporary Service Worker cache was cleared to reload the updated worker. This does not establish real cross-device Chrome Sync behavior or guarantee no data loss. See `docs/RELEASE-2.4.0.md`.
