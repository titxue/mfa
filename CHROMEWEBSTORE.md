# Chrome Web Store — MFA

Last updated: 2026-11-26 (Asia/Shanghai).

## Original listing

- Item: `dhipejmoajhjflafhbibojfoeogbmjgf`.
- Publisher: xuejy, `37364da7-e04a-4807-a6a1-e63da317b0a7`.
- URL: https://chromewebstore.google.com/detail/totp-authenticator-2fa-ot/dhipejmoajhjflafhbibojfoeogbmjgf
- Name: TOTP Authenticator - 2FA OTP Code Generator.
- Short description: Secure and fast TOTP authenticator for 2FA login. Generate OTP codes offline and manage multiple accounts easily.
- Primary language: English; 12 extension languages.
- Category, distribution, publisher identity and contact: retain the existing listing settings; do not create another item.
- Public version observed on 2026-11-25: 2.4.1. The store lists November 11 as the update date. The November 25 listing-only submission was rejected. See the November 26 correction below.

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

Privacy policy URL: https://raw.githubusercontent.com/titxue/mfa/master/docs/PRIVACY.md

## Assets

The production package contains valid 16, 48 and 128 pixel icons. The submitted global listing uses one fresh 1280×800 account-list screenshot with synthetic accounts; the previous screenshot was replaced. Default add-form and advanced-settings screenshots remain available in the release evidence directory.

### November 25 listing update

The English listing has a new first screenshot in its localized media slot. It shows the extension with demonstration accounts and the public tutorial QR. The 1280×800 RGB PNG was checked with the extension's QR decoder against the tutorial image. [English screenshot](docs/assets/store/en-qr-to-code.png)

The Simplified Chinese, Japanese and Korean long descriptions now explain how to paste a setup QR, generate codes offline and fill a selected website. They cover the 12 main-interface languages, Chrome Sync, optional Steam linking to Valve and the handling of backups. Each description was checked after saving and switching back to the locale in the dashboard.

A second English screenshot demonstrates selecting the GitHub sample account and filling the matching six-digit code in the sample sign-in form. It is reserved for a later experiment. [Select-and-fill screenshot](docs/assets/store/en-select-and-fill.png)

The dashboard confirmed submission and showed 待审核 on November 25. Measure the screenshot experiment from its first verified public appearance.

### November 26 listing correction

The review cited keyword stuffing in the Russian detailed description (Yellow Argon). Eight locales shared an old English description that listed unrelated service names. The following replacements were saved in the original item's dashboard. After reloading the page, all eight descriptions matched the new text. The existing English, Simplified Chinese, Japanese and Korean drafts were also checked for the cited list.

The dashboard warned that Arabic, German, French and Russian metadata differed from the default English listing and might receive additional review. On November 26 it confirmed “已将您的扩展程序提交送审” and then showed “待审核”. Automatic publication after approval was enabled for this listing-only submission.

Later on November 26, the listing-only submission was returned to draft so the eight corrected descriptions could ship with version 2.4.2. The package page showed 2.4.2 as the draft and 2.4.1 as published. The dashboard repeated the warning for the same four locales and confirmed “已将您的扩展程序提交送审” for the combined submission. The item then showed “待审核” with automatic publication enabled.

#### Russian (ru)

Генерируйте одноразовые коды для двухфакторной аутентификации прямо в браузере. Чтобы добавить аккаунт, вставьте изображение QR-кода из настроек безопасности сервиса или ссылку otpauth. При входе скопируйте текущий код или воспользуйтесь автозаполнением на странице входа.

Коды генерируются без подключения к интернету. Данные аккаунтов хранятся в браузере и могут синхронизироваться между устройствами, если включена синхронизация Chrome. Резервную копию можно защитить паролем. Храните её в надёжном месте.

#### Arabic (ar)

أنشئ رموزًا تُستخدم مرة واحدة للتحقق بخطوتين من داخل المتصفح. لإضافة حساب، الصق صورة رمز الاستجابة السريعة من إعدادات الأمان في الخدمة أو الصق رابط otpauth. عند تسجيل الدخول، انسخ الرمز الحالي أو استخدم التعبئة التلقائية لإدخاله في صفحة الموقع.

يمكنك توليد الرموز دون اتصال بالإنترنت. تُحفَظ بيانات الحسابات في المتصفح، ويمكن مزامنتها بين أجهزتك عند تفعيل المزامنة في Chrome. يمكنك حماية النسخة الاحتياطية بكلمة مرور. احتفظ بالملف في مكان آمن.

#### German (de)

Erzeugen Sie Einmalcodes für die Zwei-Faktor-Authentifizierung direkt im Browser. Um ein Konto hinzuzufügen, fügen Sie das Bild des QR-Codes aus den Sicherheitseinstellungen des Dienstes oder einen otpauth-Link ein. Bei der Anmeldung können Sie den aktuellen Code kopieren oder ihn vom Browser in das Anmeldeformular eintragen lassen.

Die Codes werden offline erzeugt. Ihre Kontodaten werden im Browser gespeichert und können bei aktivierter Chrome-Synchronisierung zwischen Geräten abgeglichen werden. Sie können Ihre Sicherungskopie mit einem Passwort schützen. Bewahren Sie die Datei sicher auf.

#### French (fr)

Générez des codes à usage unique pour la double authentification depuis votre navigateur. Pour ajouter un compte, collez l’image du QR code fourni par le service ou un lien otpauth. Au moment de vous connecter, copiez le code en cours ou utilisez le remplissage automatique sur la page de connexion.

Les codes sont générés hors ligne. Les données de vos comptes sont stockées dans le navigateur et peuvent être synchronisées entre vos appareils si la synchronisation Chrome est activée. Vous pouvez protéger votre sauvegarde par un mot de passe. Conservez le fichier en lieu sûr.

#### Spanish (es)

Genera códigos de un solo uso para la autenticación en dos pasos desde el navegador. Para añadir una cuenta, pega la imagen del código QR que te proporciona el servicio o un enlace otpauth. Al iniciar sesión, copia el código actual o usa la función de autocompletar en el formulario de acceso.

Los códigos se generan sin conexión. Los datos de tus cuentas se guardan en el navegador y pueden sincronizarse entre dispositivos si activas la sincronización de Chrome. Puedes proteger la copia de seguridad con una contraseña. Guarda el archivo en un lugar seguro.

#### Brazilian Portuguese (pt-BR)

Gere códigos de uso único para a autenticação em duas etapas no navegador. Para adicionar uma conta, cole a imagem do QR code fornecido pelo serviço ou um link otpauth. Ao entrar na conta, copie o código atual ou use o preenchimento automático na página de login.

Os códigos são gerados mesmo sem conexão com a internet. Os dados das contas ficam no navegador e podem ser sincronizados entre dispositivos se a sincronização do Chrome estiver ativada. Você pode proteger a cópia de segurança com uma senha. Guarde o arquivo em um local seguro.

#### Hindi (hi)

ब्राउज़र में दो चरणों वाले प्रमाणीकरण के लिए वन-टाइम कोड बनाएँ। खाता जोड़ने के लिए सेवा की सुरक्षा सेटिंग से मिले क्यूआर कोड की तस्वीर या otpauth लिंक पेस्ट करें। साइन इन करते समय मौजूदा कोड कॉपी करें या ऑटोफ़िल से उसे लॉगिन फ़ॉर्म में भरें।

कोड बनाने के लिए इंटरनेट कनेक्शन की ज़रूरत नहीं है। खातों का डेटा ब्राउज़र में सहेजा जाता है। अगर Chrome में सिंक चालू है, तो यह डेटा आपके दूसरे डिवाइस पर भी सिंक हो सकता है। आप बैकअप फ़ाइल को पासवर्ड से सुरक्षित कर सकते हैं। इसे सुरक्षित जगह पर रखें।

#### Traditional Chinese (zh-TW)

在瀏覽器中為使用兩步驟驗證的帳戶產生一次性驗證碼。新增帳戶時，貼上服務提供的 QR 碼圖片或 otpauth 連結。登入時，可複製目前的驗證碼，也可以使用自動填入功能，將驗證碼填入登入表單。

即使離線也能產生驗證碼。帳戶資料儲存在瀏覽器中，啟用 Chrome 同步功能後，資料可能會同步到其他裝置。匯出備份時可設定密碼保護檔案，請妥善保管備份。

## Release history

| Version | Date | Changes | Status |
| --- | --- | --- | --- |
| 2.4.2 | 2026-11-26 | Settings → About links to the Chrome Web Store review form and lets users mark their own review status on this device. Includes the eight localized description corrections. | Pending review. Automatic publication after approval is enabled. |
| 2.4.1 listing | 2026-11-26 | Replaced the keyword-heavy description in eight locales after the Yellow Argon rejection. | Corrections included in the 2.4.2 submission. |
| 2.4.1 | 2026-11-10 | Re-encrypt observed recovery copies during password changes; preserve legacy account reads and writes without forced migration; retain unknown data and block unsafe writes. | Published; verified 2026-11-25 |
| 2.4.0 | 2026-11-06 | Configurable TOTP parameters; protected vault migration/recovery; simpler advanced settings; website field beneath name; clearer recovery status. | Published; observed 2026-11-10 |
| 2.3.9 | Observed 2026-11-06 | Previous published version. | Published |

## 2.4.1 validation

- Release commit: `31c768a3cb747eb5a7968f8aa914db8068861a6e`; application source: `5a6dd36` (PR #7), with the package version updated to 2.4.1.
- 369 unit/component, 31 Steam helper and 50 isolated-browser tests passed, 450 in total. Production build and both type checks passed.
- Packaging, upgrade verification and submission results: [Release 2.4.1](docs/RELEASE-2.4.1.md).
- Console confirmation: “已将您的扩展程序提交送审”, followed by item status “待审核”. Automatic publication remains enabled. The privacy-policy URL now directly serves the same public document because the GitHub page repeatedly timed out during submission.

## Previous release evidence (2.4.0)

- Source commit: `9129bdbb2acc4a4a952818bb30a952e620222228`.
- Archive: `mfa-2.4.0-release.zip`, 24 files, 591,582 bytes.
- SHA-256: `04d1ab616435ebeec49e25fcf6f4b6ec3302433c3524a63c614f177a173fda39`.
- Archive entries exactly match the production `dist` directory, with manifest at ZIP root and no fixed test identity, source, credentials or profile data.
- 256 unit/component, 31 Steam helper and 49 isolated-browser tests passed; production build and both type checks passed.
- GitHub CI: https://github.com/titxue/mfa/actions/runs/42148056116 (success).
- Same-identity upgrades from rebuilt 2.3.9 release source passed for plain V1, encrypted V1 and legacy accounts (six synthetic accounts each). The original old ZIP was unavailable; only temporary Service Worker cache was cleared to reload the updated worker. This does not establish real cross-device Chrome Sync behavior or guarantee no data loss. See `docs/RELEASE-2.4.0.md`.

Submission was confirmed in the original console with “已将您的扩展程序提交送审”. Nine collection categories are unchecked; the three limited-use certifications are checked. Remote code is No. The developer does not receive account data; browser-managed synchronization and optional Steam operations are described separately in the live privacy policy. Pending review is not public availability.
