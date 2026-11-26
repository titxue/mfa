# Legacy storage compatibility

## Format selection and supported writes

Pure legacy storage remains writable without forced V2 migration. Opening, reading, generating codes and unlocking do not rewrite, migrate or clean account records. Unlocking may update the trusted session key, not account storage.

- A raw `accounts` array stays an array for add, edit, delete, reorder and import. Enabling password protection wraps it in encrypted format-1 `accountVault`.
- Existing plain or encrypted V1 `accountVault` stays V1. Disabling protection produces plain V1, not a raw array.
- Writable account sets support the published 2.3.9 client's default SHA1/six-digit/30-second TOTP and Steam accounts. Steam retains its five-character code behavior; it is not stored as a custom `digits: 5` TOTP parameter.
- Nondefault algorithm, digits or period values fail with localized `legacyUnsupported` before a persistent write. They are not stripped, downgraded or implicitly migrated. All accounts in a target set must be compatible.
- A genuinely empty installation may create V2 on its first explicit save or protection setup. Existing V2 always uses the V2 protocol. Any V2 evidence prevents fallback into legacy mode; V2 plus a legacy recovery journal blocks writes.

Published-client compatibility covers normal sequential read/edit/write use, including V1 password operations. It is not a guarantee that old and new clients can edit concurrently without loss. V2 retains the separate namespace and causal conflict handling described in [OTP parameter compatibility](OTP-PARAMETER-COMPATIBILITY.md).

## Recovery checkpoints

The new client stores its independent `accountVaultLegacyRecovery` journal in device-local storage before overwriting synchronized legacy data. The journal retains observed account versions and the intended target. It is not synchronized to other devices or understood by the published client.

The journal has strictly validated `prepared` and `ready` phases, a checksum, target identity and full source/target fingerprints. A raw-array-to-V1 transition also records its intermediate state. Optimistic revisions include the complete observed storage and journal, so an observed same-revision content change is not treated as unchanged. The checksum detects inconsistent checkpoints; it is not an authentication mechanism against someone able to rewrite local storage.

Writes verify the prepared journal before modifying sync, then verify the resulting sync state and final ready journal. A failed write, failed readback or a storage operation that silently does nothing must not be reported as success. Preparation may already have persisted even when sync fails; reads leave that checkpoint intact and expose pending/conflict recovery rather than silently completing or discarding it.

For an exact matching prepared checkpoint, recovery candidates use the retained original semantic versions, including their rekeyed representations. This avoids reintroducing old ciphertext that was already safely rekeyed. The combined raw export still includes the physical sync source, which may remain under the old password or in plaintext after interruption. Unknown history is not silently removed.

Recovery selection chooses a baseline, not an automatic account merge. Other retained versions remain in the journal. An individual candidate export is an ordinary account/encrypted backup; the combined `mfa-recovery` export is a diagnostic/archive file, not a standard account import file. Keep necessary copies before resolving.

## Password operations and historical copies

Enabling protection, changing the password and disabling protection preflight **every retained version**, not just the live account set. They decrypt and validate the copies before writing and then encrypt them under the destination protection, or make them plain when disabling protection. Missing historical passwords, corrupt ciphertext or incompatible account parameters cause a zero-write failure during preflight.

A password interruption can leave a prepared local journal encrypted with the new password while live sync still uses the old password. Retain both passwords until recovery is complete. The recovery UI is not a general multi-password repair tool: when the supplied password cannot unlock all necessary retained copies, recovery is blocked rather than discarding those copies. A later password change may likewise be blocked by older history encrypted under another password.

If the published client enables protection while the new client's local history is still plaintext, the new client enters pending recovery rather than showing an apparently protected ready vault. Reads do not automatically erase or encrypt history. Explicitly selecting an encrypted candidate with the correct password validates and seals the retained copies before continuing. Unknown historical passwords still block this operation. Existing exports and copies on other devices are not remotely re-encrypted.

## Ambiguous data and migration

Malformed journals, unsupported storage and unexplained simultaneous legacy sources fail closed. In particular, unknown `sync.state`, `local.accounts` and `local.state` are preserved for raw recovery export and block ordinary writes. Reads do not delete them. Only an exact recorded wrapping checkpoint explains the temporary coexistence of a raw array and V1 record.

Explicit V2 migration remains a service operation for a valid legacy source **without** a legacy recovery journal. Once a legacy journal exists, migration rejects with `legacyHistoryMigration` to avoid abandoning or mixing its history. Exporting does not clear the journal or unlock migration. There is no popup migration shortcut, and migration cannot bypass unknown-data checks. Do not delete recovery history as a workaround.

## Limits and operational guidance

- Chrome Sync has no compare-and-swap. The final get/set and get/remove gaps remain, including during raw-array wrapping. An old client's unseen edit can be overwritten before the new client archives it. Old clients do not maintain this recovery journal.
- A readback confirms this device's storage result, not delivery to the cloud or every other device. Sequential edits are supported; wait for sync and avoid simultaneous editing. Legacy mode is not equivalently conflict-safe to V2.
- History retains observed versions without automatic pruning, so local storage use grows. Local quota or journal verification failures block the sync mutation. Sync quota and throttling can also leave a prepared checkpoint requiring recovery.
- Local history is device-only. Uninstalling the extension, clearing storage, losing the device or losing a required password may make recovery impossible. Preserve private exports before risky changes.
- Raw recovery files, plaintext mode and interrupted transitions can contain plaintext secrets. Password protection does not revoke already exported files or offline copies.

## Verification scope

`tests/vault-legacy-mode.test.ts` exercises raw/plain/encrypted legacy CRUD, passwords, nondefault-parameter rejection, stale revisions, journal integrity, storage failures, interrupted recovery, mixed V2 evidence and unknown legacy state. Published 2.3.9 fixtures exercise plain/encrypted TOTP and Steam round trips in both directions. Related V2 guarantees remain covered by the compatibility and sync-protocol suites.

These are simulated-storage and fixture checks, not live Chrome cloud-sync acceptance. This documentation update does not itself claim a test run. For verification, run the repository test and type-check commands and separately perform synthetic-account sequential and concurrent old/new-client tests on real Chrome devices.
