# Release notes - Typescript Wallet SDK - 5.1.0

### Fixed
* **SEP-30 enrolment no longer installs a collapsed recovery signer set.** `createRecoverableWallet` collected one signer key per recovery server, appended the device key, and built a single transaction that locks the account master key and writes the thresholds sized for that set — without ever checking the set. Stellar stores signers keyed by public key and `SetOptions` overwrites rather than accumulates, so if two servers returned the same key the account received one signer where two were intended, at the weight of one, against thresholds sized for both. With `{device: 10, recoveryServer: 5}` and thresholds `{10,10,10}` the account keeps working while the user holds the device and the loss only surfaces at device loss, when the maximum reachable weight is 5 against a high of 10 and no transaction can ever be authorised again; where `signerWeight.device < signerWeight.recoveryServer` the account is unusable the moment the transaction confirms, and `setOptions` being a high-threshold operation means it cannot be repaired. The signer set is now validated before the transaction is built (#68)

### Added
* `DuplicateRecoverySignerError`, thrown by `createRecoverableWallet` when two or more recovery servers return the same signer key. SEP-30 requires each server to generate a unique signing key for the account, so this is always an error — most often one endpoint listed under several keys in the recovery server map, otherwise a server returning a key it does not control. The message names every server that returned the key (#68)
* `RecoverySignerEqualsDeviceKeyError`, thrown by `createRecoverableWallet` when a recovery server returns the device key as its signer (#68)
* `DuplicateAccountSignerError` and `SignerKeyEqualsMasterKeyError`, thrown by `registerRecoveryServerSigners` when the given signer set repeats an address or contains the account's own key (#68)
* All four are exported via `Exceptions` (#68)

### Changed
* `registerRecoveryServerSigners` validates `accountSigners` before contacting Horizon. This is a new throw on a public method, but only for input that was already producing a broken account: it rejects a signer set that cannot be installed as written. Callers passing a set of distinct addresses, none of them the account itself, are unaffected (#68)
* Documented `SignerWeight`, which previously carried no JSDoc, including how the relative weights and `AccountThreshold` together determine whether recovery works without the device and whether a single server can act alone (#68)
* Documented that `RecoverableWallet.transaction` is unsigned and must be signed with the account master key and submitted by the integrator (#68)

### Known limitations
* Validation covers the cases the SDK can prove wrong before the master key is locked. It does not, and cannot, address the exposure inherent to SEP-30: a recovery server may return a freshly generated key whose secret it discards, or return a real key and withhold the signature at recovery time, and a single entity operating two servers with different keys is indistinguishable from two independent ones. A `total weight >= max(threshold)` check is also not implemented, because `registerRecoveryServerSigners` supports an account that may already carry signers and `builderExtra` runs after `setThreshold` and can add more, so the final reachable weight is not knowable at validation time

# Release notes - Typescript Wallet SDK - 5.0.0

### BREAKING CHANGES
* Upgraded `@stellar/stellar-sdk` from `16.2.0` to `17.0.1` — Protocol 28 support
* Minimum Node.js version raised from 22 to 22.12.0, as required by stellar-sdk v17
* **Minimum TypeScript 5.7** for consumers compiling against our type declarations — v17's typings use the generic `Uint8Array<ArrayBufferLike>` form, and `Uint8Array` only became generic in the TypeScript 5.7 lib
* Byte-valued public inputs widen from `Buffer` to `Uint8Array` (`AccountService.createKeypairFromRandom`, `CustomerBinaryInfoMap`, the `Customer.add`/`update` SEP-9 binary maps). Source-compatible for existing callers, because `Buffer` is a `Uint8Array` — **but only on `@types/node` >= 20**. Against an older `@types/node`, `Buffer` is not assignable to `Uint8Array<ArrayBufferLike>` and unchanged call sites will fail to compile, so `@types/node` >= 20 is a precondition for that compatibility promise
* **`btoa`/`atob` are now a runtime requirement for base64.** stellar-sdk v17 performs base64 through the bare `btoa` identifier (`lib/cjs/base/util/base64.js`, with no fallback), and this release removes the browser bundle's `Buffer` `ProvidePlugin` that previously serviced it — a posture change from v16, where the bundle self-served base64 from that polyfill. Hermes provides `btoa`/`atob` natively from React Native 0.74 onward (facebook/hermes#1255); React Native's own JS layer never has, so **React Native < 0.74 or a non-Hermes engine (JSC, V8) needs a polyfill** such as `base-64`. Verified: a built bundle in a Hermes-like context without `btoa` throws `ReferenceError: btoa is not defined` on any base64 operation, while hex and base32/StrKey keep working (they are pure JS)
* **`TextEncoder`/`TextDecoder` are a runtime prerequisite for loading this bundle.** `uint8array-extras` — a direct dependency of ours and a transitive dependency of stellar-sdk — constructs both at module initialization with no fallback (unlike `@exodus/bytes`, which only uses them when natively available and otherwise decodes in pure JS), so an environment missing either one fails at load, before any of our code runs. This is a prerequisite the consumer's environment must satisfy; React Native applications commonly polyfill `TextEncoder`/`TextDecoder` already. Verified: a built bundle in a context without them throws `TypeError: globalThis.TextDecoder is not a constructor` at load
* Removed the `base64url` dependency, replaced by `uint8array-extras`' `uint8ArrayToBase64(bytes, { urlSafe: true })`
* `pathPay()` now requires an explicit conversion bound and throws `PathPayBoundRequiredError` when it is missing — `destMin` for a strict-send payment, `sendMax` for a strict-receive one. It previously substituted defaults (one stroop for `destMin`, the int64 maximum for `sendMax`) which left the bound inert, so the conversion was effectively unbounded. Bounds supplied by the caller are now passed through verbatim. `PathPayParams` became a discriminated union, so omitting the bound — or passing both `sendAmount` and `destAmount` — is a compile-time error, and `swap()` takes `destMin` as a required fourth argument. This brings the Wallet SDK in line with `@stellar/stellar-sdk`, which already treats both fields as required (#252)

### Added
* `PathPayBoundRequiredError`, exported via `Exceptions` (#252)

### Changed
* Byte-derived values that used to be produced with `Buffer#toString(encoding)` are now produced with `xdr.encodeBytes(bytes, "hex" | "base64")`. `Uint8Array#toString()` ignores its encoding argument, so the old idiom silently returned comma-joined decimals under v17
* The core SDK and soroban `src` trees no longer reference the `Buffer` global at all, and the core SDK's browser bundle ships without a `buffer` polyfill. The key manager retains one sanctioned exception (`Handlers/ledger.ts`, where `@ledgerhq/hw-app-str` requires a real `Buffer`), so its browser bundle still inlines the polyfill for that one path. This boundary is enforced by ESLint (`no-restricted-globals` / `no-restricted-syntax` / `no-restricted-imports`) and by a React Native sandbox test that loads each package's built bundle with `Buffer`, `Event`, `EventTarget` and `process` absent

### Fixed
* SEP-7 signatures and transaction URIs are correctly base64-encoded. Under stellar-sdk v17 the previous `Buffer`-era code produced comma-joined decimals, which made a signed `Sep7Tx` URI unparseable
* The SEP-10 `client_domain` integrity check compares transaction hashes correctly again — it used `Buffer#equals`, which does not exist on `Uint8Array`
* `Watcher` treats `on_hold` as a transient status. `TransactionStatus.on_hold` documents itself as a temporary state — an anchor holding a transfer for review, after which "transaction should follow the regular flow" — but neither watcher recognised it as in progress. `watchOneTransaction` fell through to its terminal branch and invoked `onError` before stopping its poll, so a transfer merely awaiting a compliance check was reported to the caller as a failure and then abandoned; `watchAllTransactions` filed it in the ignored registry and omitted it from the first poll entirely. Both now treat it like `incomplete` and the `pending_*` statuses, so the transaction keeps being watched and surfaces through `onMessage` until it reaches a genuinely final status (#251)

### Known limitations
* SEP-12 binary upload (`Customer.add`/`update` with `sep9BinaryInfo`) is not usable on React Native. axios's `toFormData` takes a `Buffer.from(value)` path for typed-array values whenever `FormData` is not spec-compliant, which is the case on React Native. That path was already non-functional there — React Native's `FormData.append` cannot consume a `Buffer` part — so this is a change of failure mode, not of capability: with the polyfill removed it now raises `ReferenceError` instead of producing silent garbage. Browsers and Node.js are unaffected

# Release notes - Typescript Wallet SDK - 4.0.1

### Changed
* `Server.signChallengeTransaction`: validate the challenge with `WebAuth.readChallengeTx`, as `Sep10.sign` already does, and verify it was issued for `accountKp` before signing (#250)
* `Server.signChallengeTransaction`: validation failures now throw `ChallengeValidationFailedError` instead of `ChallengeTxnInvalidSignatureError` (#250)

### Added
* Optional `homeDomain` on `SignChallengeTxnParams`, accepting a string or an array of strings for anchors serving multiple home domains. Defaults to `anchorDomain` (#250)
* `ChallengeTxnClientAccountMismatchError`, exported via `Exceptions` (#250)

### Deprecated
* `ChallengeTxnInvalidSignatureError` is no longer thrown and will be removed in the next major release. Catch `ChallengeValidationFailedError` instead (#250)

# Release notes - Typescript Wallet SDK - 4.0.0

### BREAKING CHANGES
* Upgraded `@stellar/stellar-sdk` from `15.0.1` to `16.2.0` (#243)
* Minimum Node.js version raised from 20 to 22, as required by stellar-sdk v16 (#243)

### Changed
* `AccountService.getHistory` no longer sends an empty paging cursor. stellar-sdk v16 serializes query params via `URLSearchParams`, so an undefined cursor was sent as the literal `cursor=undefined` and Horizon returned a 400 (#243)
* Withdrawal transactions now map malformed anchor-supplied memos to `WithdrawalTxMemoError` for every memo type (not just `hash`), matching v16's stricter `Memo` validation on untrusted input (#243)
* Internal source-account typing now uses stellar-sdk v16's `TransactionSource` interface (#243)

# Release notes - Typescript Wallet SDK - 3.0.3

### Fixed
* Validate SEP-7 origin_domain as a fully qualified domain name (#244)

### Added
* `Types.isValidFullyQualifiedDomainName` and `Types.FULLY_QUALIFIED_DOMAIN_NAME_REGEX` (#244)

# Release notes - Typescript Wallet SDK - 3.0.2
* Version bump

# Release notes - Typescript Wallet SDK - 3.0.1

### Fixed
* SEP-10: verify the auth server returns the same challenge body after `client_domain` re-signing, instead of trusting a server-supplied transaction (#237)
* `submitWithFeeIncrease`: forward `maxFee` across recursive retries so the cap is enforced on every retry, not just the first (#238)
* `submitTransaction`: replace the unbounded recursive 504 retry with a bounded equal-jitter exponential backoff loop, avoiding stack overflow during sustained Horizon outages (#238)

# Release notes - Typescript Wallet SDK - 3.0.0

### BREAKING CHANGES
* Upgraded `@stellar/stellar-sdk` from `14.5.0` to `15.0.1` — Protocol 26 support
* `TransactionBase.networkPassphrase` setter now throws to enforce immutability (upstream change)
* XDR integer strict validation: i64/u64 `fromString()` throws on overflow/underflow, i32/u32 throws at XDR serialization (upstream change)

# Release notes - Typescript Wallet SDK - 2.0.0

### BREAKING CHANGES
* Minimum Node.js version bumped from 18 to 20 (#233)
* Upgraded `@stellar/stellar-sdk` from `13.0.0-beta.1` to `14.5.0` (#233)
* `serverSigningKey` is now required for SEP-10 authentication (#233)
* `RecoveryServer.signingKey` is now required in the type definition (#233)

### Added
* `MissingSigningKeyError` — thrown when anchor's `stellar.toml` does not contain a `SIGNING_KEY` (#233)
* `ChallengeValidationFailedError` and `NetworkPassphraseMismatchError` error classes for clearer SEP-10 error handling (#233)

### Removed
* Local `readChallengeTx` fallback function (#233)

# Release notes - Typescript Wallet SDK - 1.10.0

### Added
* Validate SEP-10 challenge transaction (#228)

### Fixed
* Fix broken JWT expiration check in SEP-10 authentication (#226)
* Fix TypeError crash in SEP-7 replace parameter parsing (#227)

# Release notes - Typescript Wallet SDK - 1.9.0

### Added
* Added SEP-43 types: (#186)

# Release notes - Typescript Wallet SDK - 1.8.0

### Added
* Upgrades `@stellar/stellar-sdk` to `13.0.0-beta.1` which supports the `Protocol 22` XDR (#172)
* Add `transaction_id` field to SEP-12 requests (#165)
* Make `withdraw_anchor_account` field optional (#164)
* Deprecate `getServicesInfo()` in favor of `Sep24.info()` (#166)

# Release notes - Typescript Wallet SDK - 1.7.0

### Fixed
* Replace `tweetnacl-util` with `@stablelib` packages (#149)
   * this fixes the lib `crashing` on `React Native` environment
* Export missing classes and aliases (#150)
  * with this change devs can now access the following classes:
    * `Sep6`
    * `Sep12`
    * `Sep38`
    * `StellarAssetId`
    * `DomainSigner`
  * and aliases:
    * `Transfer` (alias for `Sep6` class)
    * `Auth` (alias for `Sep10` class)
    * `Customer` (alias for `Sep12` class)
    * `Interactive` (alias for `Sep24` class)
    * `Quote` (alias for `Sep38` class)
    * `XLM` (alias for `NativeAssetId` class)

# Release notes - Typescript Wallet SDK - 1.6.0

### Added
* Support for Sep-7 (#141)(#144)
* Upgrade @stellar/stellar-sdk to 12.1.0 (#143)
* New on_hold status (#140)

### Fixed
* [BREAKING CHANGE] Fix response objects returned on Customer functions (#142)

# Release notes - Typescript Wallet SDK - 1.5.0

### Added
* AuthHeaderSigner to Authentication Flow
* End to end tests for testing browser build 
* Beta builds on merges to develop branch

# Release notes - Typescript Wallet SDK - 1.4.0

### Added
* SEP-10 sign challenge transaction helper
* Anchor platform integration tests
* Change project structure to monorepo
* Helper for parsing AnchorTransaction

### Fixed
* Fix stellar-sdk imports

# Release notes - Typescript Wallet SDK - 1.3.1

### Added
* Upgraded stellar-sdk to 11.1.0

# Release notes - Typescript Wallet SDK - 1.3.0

### Added
* Type aliases
* Account setup and recovery using SEP-30
* Customer / SEP-12 code
* SEP-6 deposit and withdrawal
* Exchange endpoints
* Recovery integration tests
* Watcher and polling for SEP-6
* AuthToken class
* Account merge and premade assets 
* SEP-38 info, price, and prices
* SEP-38 Quote

### Fixed
* Some small fixes to recovery code

# Release notes - Typescript Wallet SDK - 1.2.1

### Fixed
* Better handle axios errors

# Release notes - Typescript Wallet SDK - 1.2.0

### Added
* Sponosring transactions
* Account modification functions
* Default domain signer and default client_domain
* Path payment and swap
* Sep24 example code

### Fixed
* Add build for both node and browser

# Release notes - Typescript Wallet SDK - 1.1.3

### Fixed
* Check if withdraw memo is hash type 

### Added
* Upgrading stellar-sdk veresion for protocol 20


# Release notes - Typescript Wallet SDK - 1.1.2

### Fixed
* Fix watcher stopping
* Only emit txn if status changed


# Release notes - Typescript Wallet SDK - 1.1.0

### Added
* Submitting a transaction
* Manage non-XLM trustlines
* Importing and signing arbitrary transactions given an XDR
* Horizon getInfo and gitHistory functions
* Helper method for creating a keypair from random bytes
* Exporting classes
* Transfer withdrawal method
* Fee bump transaction
* Building function to submitWithFeeIncrease


