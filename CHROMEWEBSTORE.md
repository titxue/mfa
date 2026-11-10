# Chrome Web Store — MFA

Last updated: 2026-11-10 (Asia/Shanghai).

## Original listing

- Item: `dhipejmoajhjflafhbibojfoeogbmjgf`.
- Publisher: xuejy, `37364da7-e04a-4807-a6a1-e63da317b0a7`.
- URL: https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf
- Name: TOTP Authenticator - 2FA OTP Code Generator.
- Short description: Secure and fast TOTP authenticator for 2FA login. Generate OTP codes offline and manage multiple accounts easily.
- Primary language: English; 12 extension languages.
- Category, distribution, publisher identity and contact: retain the existing listing settings; do not create another item.
- Public version observed on 2026-11-10: 2.4.0. Update 2.4.1 is prepared for the same listing; submission is not yet confirmed.

## Updated detailed description

Generate two-factor authentication codes, manage accounts, and fill codes into websites from your browser.

Add accounts by uploading, pasting or dropping a QR image, or by pasting an otpauth link. Generate standard TOTP and Steam Guard codes, reorder accounts, and keep optional website addresses for easier filling.

Everyday setup stays simple. Expand Advanced settings only when your provider requires SHA-256 or SHA-512, eight digits, or a different refresh interval. Standard accounts keep the usual six-digit, 30-second defaults.

Back up and restore accounts with JSON, including password-encrypted backups. Import compatible authenticator exports and export account QR codes. Optional password protection locks access to your account vault.

Code generation works offline. Accounts and settings use browser storage and may synchronize through your Chrome account. Optional Steam linking contacts Valve's official services only when you use that feature. Filling sends the selected code to the website you choose. There is no developer-operated account server, advertising or analytics.

Existing compatible accounts stay usable after updating, without a forced account-vault migration. Older account stores retain standard six-digit, 30-second TOTP and Steam support. Custom parameters are rejected when the existing storage format cannot preserve them. Protected accounts continue to require their original password.

Changing your vault password also re-encrypts the recovery copies observed on this device. If a retained copy cannot be unlocked, MFA asks you to resolve it before changing protection. If synchronization is incomplete or conflicting, the extension keeps recovery data and asks you to resolve it. Export any versions you need before choosing a conflict resolution. Update your devices to the same extension version, wait for synchronization and avoid editing accounts on several devices at once.

Plain backups and recovery exports may contain account secrets. Keep them private. Password changes cannot update previously exported backups or copies on offline devices. Browser synchronization cannot guarantee atomic updates across devices, so keep a safe backup of important accounts.

Support: https://github.com/titxue/mfa/issues

## Permissions justification

| Permission | Reason |
| --- | --- |
| storage | Store accounts, optional encrypted vaults, settings and recoverable synchronization versions in the browser. Chrome Sync may transmit synchronized records to Google. |
| activeTab | Access the currently selected website when the user chooses to fill an authentication code. |
| scripting | Inject the bundled code-filling script into an authorized website. |
| contextMenus | Offer site access and code-filling actions from the browser context menu. |
| Optional `https://*/*`, `http://*/*` | Let the user grant individual websites persistent code-filling access. Optional Steam linking requests access to Valve's official API. No blanket website grant is required for ordinary code generation. |

The 2.4.1 permission set, dependencies and network endpoints are unchanged from 2.4.0.

## Privacy and data use

The developer does not collect or receive user account data. The extension processes user-provided account names, authentication secrets, optional website addresses and preferences in the browser. These stay in browser storage and may leave the device via Chrome Sync. Successful password operations update the active vault and the retained recovery copies included in that operation. Interrupted operations, previously exported backups and copies on other devices may retain their previous protection state. Explicit exports are downloaded to the user's device.

Optional Steam linking sends the login information and authentication requests needed for that operation directly to Valve. Selected authentication codes are delivered to the website the user fills. No developer-operated collection endpoint, advertising or analytics is included.

Data is not sold, used for unrelated purposes or used for lending/credit decisions. Do not describe the extension as making no network requests: Chrome Sync and optional Steam linking are disclosed above. The store data-collection declaration is no developer collection. Browser-managed synchronization alone is not treated as developer receipt of the data; local processing, synchronization and optional Steam requests remain disclosed in the privacy policy. The three limited-use certifications remain checked.

Privacy policy URL: https://github.com/titxue/mfa/blob/master/docs/PRIVACY.md

## Assets

The production package contains valid 16, 48 and 128 pixel icons. The submitted global listing uses one fresh 1280×800 account-list screenshot with synthetic accounts; the previous screenshot was replaced. Default add-form and advanced-settings screenshots remain available in the release evidence directory.

## Release history

| Version | Date | Changes | Status |
| --- | --- | --- | --- |
| 2.4.1 | 2026-11-10 | Re-encrypt observed recovery copies during password changes; preserve legacy account reads and writes without forced migration; retain unknown data and block unsafe writes. | Prepared; submission not yet confirmed |
| 2.4.0 | 2026-11-06 | Configurable TOTP parameters; protected vault migration/recovery; simpler advanced settings; website field beneath name; clearer recovery status. | Published; observed 2026-11-10 |
| 2.3.9 | Observed 2026-11-06 | Previous published version. | Published |

## 2.4.1 validation

- Application source: `5a6dd36` (PR #7), with the package version updated to 2.4.1.
- 369 unit/component, 31 Steam helper and 50 isolated-browser tests passed, 450 in total. Production build and both type checks passed.
- Packaging, upgrade verification and submission results: [Release 2.4.1](docs/RELEASE-2.4.1.md).

## Previous release evidence (2.4.0)

- Source commit: `9129bdbb2acc4a4a952818bb30a952e620222228`.
- Archive: `mfa-2.4.0-release.zip`, 24 files, 591,582 bytes.
- SHA-256: `04d1ab616435ebeec49e25fcf6f4b6ec3302433c3524a63c614f177a173fda39`.
- Archive entries exactly match the production `dist` directory, with manifest at ZIP root and no fixed test identity, source, credentials or profile data.
- 256 unit/component, 31 Steam helper and 49 isolated-browser tests passed; production build and both type checks passed.
- GitHub CI: https://github.com/titxue/mfa/actions/runs/42148056116 (success).
- Same-identity upgrades from rebuilt 2.3.9 release source passed for plain V1, encrypted V1 and legacy accounts (six synthetic accounts each). The original old ZIP was unavailable; only temporary Service Worker cache was cleared to reload the updated worker. This does not establish real cross-device Chrome Sync behavior or guarantee no data loss. See `docs/RELEASE-2.4.0.md`.

Submission was confirmed in the original console with “已将您的扩展程序提交送审”. Nine collection categories are unchecked; the three limited-use certifications are checked. Remote code is No. The developer does not receive account data; browser-managed synchronization and optional Steam operations are described separately in the live privacy policy. Pending review is not public availability.
