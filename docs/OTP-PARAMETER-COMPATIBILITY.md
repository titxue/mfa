# OTP parameters, sync migration and recovery

Version 2.4.0 supports SHA1/SHA256/SHA512, six/eight digits and integer periods from 15 to 120 seconds. Steam stays SHA1, five characters and 30 seconds. Missing fields retain the published client's defaults. Stored values are validated before saving and after decryption.

## Compatibility tradeoff

The published 2.3.9 client cannot safely interpret custom OTP parameters. It also reconstructs edited accounts without those parameters. The new client therefore uses a separate V2 sync namespace for **all** account writes, including accounts with default parameters. It never copies V2 accounts back into the old V1 key.

Reading V1 or legacy `accounts` does not automatically migrate or modify persistent storage. The popup asks the user to update their devices, export a recovery copy and explicitly migrate. Encrypted migration preserves the original ciphertext and password; it does not decrypt accounts into a plaintext replacement.

Migration writes and verifies a durable local recovery journal, publishes a candidate under a unique sync key, verifies that candidate, then replaces the old `accountVault` value with a format-2 migration marker. The published client rejects this marker rather than displaying custom accounts with default OTP parameters. The old record is retained in the local recovery journal. Cleanup only follows verified persistence. Failures retain the original and/or pending candidate and block ordinary saves.

A fresh installation also uses a unique candidate for its first explicit save or protection setup. Merely opening an empty or partially synced installation does not create an empty vault.

## Delayed sync and conflicts

Chrome `storage.sync` provides neither cross-device compare-and-swap nor a reliable signal that every key has arrived. A format number alone cannot protect an offline old client. The separate namespace ensures that such a client can only replace V1; it cannot replace the V2 account record.

A third device receiving old V1 before V2 does **not** automatically promote V1 into the canonical V2 key. An explicit migration creates a uniquely named candidate, so a later V2 arrival remains separately recoverable. Independently migrated candidates and concurrent new-client writes carry causal version counters. Divergent records stop normal writes and code display until the user resolves the conflict. A changed, late V1 record also causes a conflict; it is retained as a recovery source.

Each writer saves a local pending copy before publishing. A rejected/quota-limited write or interrupted migration exposes recovery and export actions. Resolution archives every observed candidate before publishing the selected account set. Unselected versions remain available from **Settings → Export all versions**, including after successful resolution. Export an individual version as an ordinary importable JSON backup; preserve the combined recovery file as a diagnostic/archive copy. The combined `mfa-recovery` file is not a standard account import file.

Selection deliberately does not guess how to combine conflicting renames, deletions or OTP parameter edits. Export both versions, choose a baseline and import/reconcile the remaining accounts. Same-name records require manual reconciliation; silently choosing an algorithm or key would produce incorrect codes. Choosing a plaintext recovery source while protection is active requires the current password and re-encrypts the result. An encrypted candidate requires its own password. Enabling protection also encrypts plaintext local recovery copies.

## Limits

This is not an atomic or lossless distributed database. Local readback verifies the local write, not its cloud delivery. Two disconnected new clients can still replace the same canonical sync key; their local journals permit conflict recovery when the other branch is delivered. A branch never delivered anywhere else may require the original device and its local recovery journal. Uninstalling that device, clearing storage or losing its password can make recovery impossible.

An old-client V1 edit racing the migration-marker write or legacy cleanup can be replaced before the new client observes it. The published old client has no recovery journal. Recovery of that unseen edit depends on an existing export or an old device that still retains the edit. Updating every device and exporting before migration reduces this window; a local read/check/write cannot eliminate it.

A completely empty sync view cannot be distinguished from a new installation. Explicit creation on such a device uses a unique candidate, but users should wait for sync and export their existing devices before migration. Old clients can continue showing their old cached V1 accounts until the marker arrives; this code cannot revoke an offline binary. V2 custom parameters are never placed in that old record.

Malformed or unsupported records block normal writes and remain in the raw recovery export. They may require manual repair; no empty replacement is created. Existing unencrypted branches, interrupted writes and raw recovery exports can contain plaintext keys. Store exports privately. Local recovery records are not synchronized and consume local quota. If local backup persistence fails, the cloud mutation is aborted. Chrome quota or write throttling may require exporting, waiting or reducing the account set.

## Import, export and parameter handling

- URI parameters explicitly present in embedded JSON URLs win, including SHA1/6/30. JSON supplies only parameters absent from the URI. Unsupported values are rejected.
- The edit selector offers every accepted period, 15–120 seconds. Inline menus refresh each account at its own period boundary, with stale asynchronous results ignored.
- Save-queue comparisons include normalized algorithm, digits and period; remote parameter edits cause a conflict rather than being mistaken for successful saves.
- Plain backups and QR codes carry the actual parameters. Encrypted backups with nondefault parameters use encrypted format 2; the new client reads formats 1 and 2. The published client rejects format 2. Encryption primitives and password derivation are unchanged.
- Existing Steam Base32/Base64 entry, numeric `Steam:` QR compatibility and old accounts remain covered by regressions.

## Verification and security scope

All fixtures use synthetic accounts and isolated browser profiles. Frozen 2.3.9 vault/crypto fixtures come from `8f6c307`, allowing the old reader and writer to run against simulated storage. Protocol tests simulate key arrival order and disconnected devices; they are **not** a live Chrome cloud-sync acceptance test.

`tests/vault-sync-protocol.test.ts` covers third-device V1-first arrival, delayed V2, concurrent migration/saves, offline old-client writes, local/cloud quota failures, migration interruption, malformed data, protected recovery and both candidate exports. `tests/vault-compatibility.test.ts` covers published-client rejection, encrypted/plain round trips, parameter validation and code preservation. Browser tests cover explicit migration, encrypted unlock, conflict/export/retry, mixed periods, imported period editing and valid SHA256 Google migration.

The full PR and fix introduce no permissions, dependency/lockfile changes or network requests. Recovery actions are restricted to the extension popup. Content scripts receive account summaries and requested codes, not secrets or recovery exports. This scoped review does not establish the absence of every possible security defect.

Run `bun run test`, `bun run type-check` and `bun run steam:link:check`. Build first in a fresh checkout to generate `src/version.ts`.
