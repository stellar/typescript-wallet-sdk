# Release notes - Typescript Wallet SDK Key Manager - 5.0.0

### BREAKING CHANGES
* Upgraded `@stellar/stellar-sdk` from `16.2.0` to `17.0.1` — Protocol 28 support
* Minimum Node.js version raised from 22 to 22.12.0, as required by stellar-sdk v17
* **Minimum TypeScript 5.7** for consumers compiling against our type declarations — v17's typings use the generic `Uint8Array<ArrayBufferLike>` form
* Byte inputs across stellar-sdk-derived types widen from `Buffer` to `Uint8Array`. Source-compatible for existing callers, because `Buffer` is a `Uint8Array` — **but only on `@types/node` >= 20**. Against an older `@types/node`, `Buffer` is not assignable to `Uint8Array<ArrayBufferLike>` and unchanged call sites will fail to compile
* **`btoa`/`atob` are now a runtime requirement for base64.** stellar-sdk v17 performs base64 through the bare `btoa` identifier (`lib/cjs/base/util/base64.js`, with no fallback). `KeyManager.fetchAuthToken` and the Ledger and Trezor handlers all take that path. Hermes provides `btoa`/`atob` natively from React Native 0.74 onward (facebook/hermes#1255); React Native's own JS layer never has, so **React Native < 0.74 or a non-Hermes engine (JSC, V8) needs a polyfill** such as `base-64`. The encrypter path is unaffected — it base64s through `@stablelib/base64`, which is pure JS

### Changed
* The Ledger handler now applies signatures via `transaction.addSignature(publicKey, signature)` instead of constructing an `xdr.DecoratedSignature` and pushing it onto `transaction.signatures`. This fixes the cross-copy failure documented in `Handlers/plaintextKey.ts` (a wrapper class built by this package's bundled stellar-sdk was rejected by the consumer's copy on React Native), **and it adds validation the old path did not have**: `addSignature` validates the public key and verifies the signature against the transaction hash, so a mismatched `key.publicKey` now throws where it previously produced a silently invalid envelope. A net correctness improvement, but a behaviour change worth noting for anyone relying on the old permissive path
* `buffer` moved from `dependencies` to `devDependencies` — it is consumed only by webpack at build time and is already inlined into the shipped browser bundle

### Fixed
* `KeyManager.fetchAuthToken` posts correctly encoded challenge XDR (the old `Buffer`-era encoder returned comma-joined decimals under v17) and compares transaction hashes correctly (`Buffer#equals` does not exist on `Uint8Array`)
* The Trezor transform encodes `manageData` values, memo hashes and signer keys as hex, reads offer prices through the v17 property accessors, and classifies `preAuthTx`/`sha256Hash` signers correctly — the old `instanceof Buffer` check was always false under v17, so those signers were sent to Trezor as signer type `0` with the key dropped

**Consumer note:** existing key-manager consumers need **no code changes**. The `KeyManager`, `ScryptEncrypter`, `Key`, `EncryptedKey`, `Encrypter`, `KeyStore` and `KeyType` surface contains no `Buffer`/`Uint8Array`, and its encrypter path never touches stellar-sdk. Both Freighter apps consume only that surface, and neither calls `fetchAuthToken`, where this package's two real breaks lived. The extension should align its `stellar-sdk` alias from `17.0.0` to `17.0.1`.

# Release notes - Typescript Wallet SDK Key Manager - 4.0.1
* Version bump

# Release notes - Typescript Wallet SDK Key Manager - 4.0.0

### BREAKING CHANGES
* Upgraded `@stellar/stellar-sdk` from `15.0.1` to `16.2.0` (#243)
* Minimum Node.js version raised from 20 to 22, as required by stellar-sdk v16 (#243)

# Release notes - Typescript Wallet SDK Key Manager - 3.0.3

### Fixed
* Verify SEP-10 challenge body integrity after domain signing in key manager (#245)

### Added
* `DomainSigningModifiedError`, exported from the package root (#245)

# Release notes - Typescript Wallet SDK Key Manager - 3.0.2
* Version bump

# Release notes - Typescript Wallet SDK Key Manager - 3.0.1

### Fixed
* `KeyManager.removeKey`: the in-memory cache entry is now actually deleted when `shouldCache: true`, instead of being left stale by a no-op write (#238)

# Release notes - Typescript Wallet SDK Key Manager - 3.0.0

### BREAKING CHANGES
* Upgraded `@stellar/stellar-sdk` from `14.5.0` to `15.0.1` — Protocol 26 support
* Upgraded `@stellar/freighter-api` from `^2.0.0` to `^6.0.1`
* Freighter handler: `custom.network` replaced with `custom.networkPassphrase`
* `TransactionBase.networkPassphrase` setter now throws to enforce immutability (upstream change)

### Fixed
* Freighter handler now uses correct network passphrase for XDR deserialization instead of hardcoded `Networks.PUBLIC`

### Added
* Freighter handler test coverage

# Release notes - Typescript Wallet SDK Key Manager - 2.0.0

### BREAKING CHANGES
* Minimum Node.js version bumped from 18 to 20 (#233)
* Upgraded `@stellar/stellar-sdk` from `13.0.0-beta.1` to `14.5.0` (#233)

### Changed
* SEP-10 challenge validation errors now throw plain `Error` instead of `InvalidChallengeError` (upstream SDK change) (#233)

# Release notes - Typescript Wallet SDK Key Manager - 1.10.0
* Version bump

# Release notes - Typescript Wallet SDK Key Manager - 1.9.0
* Version bump

# Release notes - Typescript Wallet SDK Key Manager - 1.8.0

### Added
* Upgrades `@stellar/stellar-sdk` to `13.0.0-beta.1` which supports the `Protocol 22` XDR (#172)

# Release notes - Typescript Wallet SDK Key Manager - 1.7.0

### Added
* Support for `home_domain` on `GET /auth` request (#151)

### Fixed
* Replace `tweetnacl-util` with `@stablelib` packages (#149)
  * ^ this fixes the lib `crashing` on `React Native` environment

# Release notes - Typescript Wallet SDK Key Manager - 1.6.0

### Added
* Upgrade @stellar/stellar-sdk to 12.1.0 (#143)

# Release notes - Typescript Wallet SDK Key Manager - 1.5.0

### Added
* Challenge token to param to auth header

### Fixed
* Update BrowserStorageConfigParams method types

# Release notes - Typescript Wallet SDK Key Manager - 1.4.0

### Added
* Init to the project, added key manager functionality

