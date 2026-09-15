# Browser regression checks

Run from the repository root:

```sh
bun run build
bun tests/browser/serve.ts
```

Open http://127.0.0.1:4179 in Chrome. The page runs seven checks against the actual
React components and DOM code. A successful run changes the title to
`PASS MFA regression` and displays seven `PASS` lines. Results are also available
in `window.regressionResults` for browser automation.

The checks use synthetic accounts and mocked Chrome storage/messages. They cover
pending and failed writes, disabled account actions, settings rollback, segmented
field detection, menu refresh frequency and QR access without autofill. They do
not test real Chrome Sync or Steam network requests. Build output goes to the
ignored `output/playwright/regression` directory. Stop the server with Ctrl+C.
