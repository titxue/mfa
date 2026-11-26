MFA interactive walkthrough

Self-contained public demo, served at /demo/ on the official website.
Use ?lang=zh or ?lang=en for the initial language. Add &embed=1 for the
compact homepage layout. The demo reports its height, panel position, and
loading status to the homepage. The homepage can ask it to start manual mode.
Accounts, secrets, codes, and backups stay inside the demo.

The extension popup is a frozen MFA 2.4.1 runtime from source commit 817eacb.
The guide is based on reviewed source 38a8402, with first-party embed support.
Only the popup assets are included; background, content scripts, and Steam
sign-in pages are not deployed as part of this demonstration.

bridge.js seeds fixed public examples and replaces Chrome storage/tabs with
in-memory adapters. Refreshing the demo resets account data. It cannot read
or change an installed extension's accounts or Chrome Sync storage.

All sample secrets, QR images, and demonstration passwords are public test
data. The original code-generation and encryption algorithms run locally.
Visitors must use the installed extension for their real account secrets.

Edit website/demo/index.html for the guide page and website/public/demo/ for
its scripts, styles, and media. Vite serves the page at /demo/.
No dependency on ChatGPT Sites or the original development directory exists.

Original extension: https://github.com/titxue/mfa (MIT)
Font: Inter by Rasmus Andersson (SIL Open Font License)
