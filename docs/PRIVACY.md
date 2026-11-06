# MFA privacy policy

Effective date: November 6, 2026.

MFA (TOTP Authenticator - 2FA OTP Code Generator) generates authentication codes and helps you manage and fill them. This policy applies to Chrome Web Store item `dhipejmoajhjflafhbibojfoeogbmjgf`.

## Accounts and browser storage

You provide account names, authentication secrets and optional website addresses. MFA stores these, your preferences and synchronization recovery records in browser storage. Code generation runs on your device. MFA does not send your account vault to a developer-operated server and includes no advertising or analytics service.

When Chrome Sync is enabled, synchronized account records and preferences can be transmitted to and stored by Google through Chrome's synchronization service. Google's policies and your Chrome synchronization settings apply. This is off-device transmission, even though MFA has no account server of its own.

Optional password protection encrypts the active account vault. Unlock keys and sessions stay local. Existing historical recovery records and older copies on offline devices may retain their previous protection state; enabling protection does not retroactively encrypt every historical copy. Browser synchronization cannot provide atomic writes across all devices.

## Website access and filling

MFA accesses an authorized webpage to locate authentication fields and fill a code when you use the filling features. You can grant or revoke access to individual websites. The selected code is provided to the website you fill. Page content and browsing history are not uploaded to a developer-operated service.

## Optional Steam linking

If you use Steam linking, MFA communicates directly with Valve's official Steam services to authenticate and link the authenticator. These requests can include your account name, encrypted login password, verification responses, session tokens, Steam account identifier and device information required by Steam. Valve's privacy policy applies to its services. Ordinary TOTP generation does not require Steam linking or these requests.

## Imports, exports and recovery

Imported files are processed in your browser. Exports are downloaded to your device. Standard plaintext backups and some raw recovery exports contain authentication secrets; keep them private. Password-encrypted backups are available for ordinary account export. Retain a secure backup before resolving synchronization conflicts or replacing devices.

## Retention, deletion and sharing

Records remain in browser storage until you remove them or the applicable browser data. Historical recovery records can persist after changes to the active account list. Removing an account from the active list does not necessarily remove every backup, recovery record or offline-device copy. Uninstalling can remove local extension data, and is not a safe way to upgrade.

MFA does not sell personal data, use it for advertising or credit decisions, or send it for purposes unrelated to generating, storing, synchronizing or filling authentication codes. Third-party handling described above is limited to Google Chrome Sync, websites you fill and optional Valve Steam services.

## Contact and changes

For privacy questions, contact the maintainer through https://github.com/titxue/mfa/issues. Do not include account secrets, passwords or private backups in an issue. Material policy changes will update the effective date in this document.
