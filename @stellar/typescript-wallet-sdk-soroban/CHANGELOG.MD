# Release notes - Typescript Wallet SDK Soroban - 5.0.0

### BREAKING CHANGES
* Upgraded `@stellar/stellar-sdk` from `16.2.0` to `17.0.1` — Protocol 28 support
* Minimum Node.js version raised from 22 to 22.12.0, as required by stellar-sdk v17
* **Minimum TypeScript 5.7** for consumers compiling against our type declarations — v17's typings use the generic `Uint8Array<ArrayBufferLike>` form
* Byte inputs across stellar-sdk-derived types widen from `Buffer` to `Uint8Array`. Source-compatible for existing callers, because `Buffer` is a `Uint8Array` — **but only on `@types/node` >= 20**. Against an older `@types/node`, `Buffer` is not assignable to `Uint8Array<ArrayBufferLike>` and unchanged call sites will fail to compile
* `InvocationArgs` gains a `FnArgsCreateExternalRef` member — exhaustive switches over this union need a new branch
* `InvocationArgs` gains an `FnArgsUnknown` member — exhaustive switches over this union need another new branch. An invocation arm that cannot be decoded (an unrecognised executable or authorized-function type, or a contract-id preimage that does not match its executable) is now surfaced as this variant instead of being silently dropped, so a caller — such as a wallet's transaction-review screen — can choose to fail closed rather than display a list that looks complete but omits an action awaiting approval
* `getInvocationArgs` returns an `FnArgsUnknown` entry — not `undefined` — for an unrecognised executable or authorized-function type instead of throwing, and `getInvocationDetails` keeps that entry in its returned list instead of omitting it
* `scValByType` return values changed. The emitted return type is `any`, so **the compiler will not flag any of these** — check call sites by hand:
  * `scvBytes` returns a hex string (was a stringified array of numbers, e.g. `"[0,1]"`)
  * `scvContractInstance` returns a real hex wasm hash (was a UTF-8 interpretation of the raw 32 hash bytes, i.e. mojibake), and now returns `null` for Stellar-Asset and CAP-85 external-ref executables where v16 threw
  * `scvLedgerKeyContractInstance` returns `null` (was `undefined`)
  * `scvString` and `scvSymbol` return a hex string for non-UTF-8 payloads (the old branch that was meant to handle this compared a constructor to a string and was therefore dead code)

### Added
* CAP-85 external contract executables are decoded, surfacing the owner contract and tag via the new `FnArgsCreateExternalRef` member. No wasm hash is reported, because the referenced code can change after the transaction is signed
* Protocol 28's `scvExecutableTag` is rendered by `scValByType`
* Addresses resolve for all five `ScAddress` variants — account, contract, muxed, claimable balance and liquidity pool — in `scValByType` and `getTokenInvocationArgs`. `getTokenInvocationArgs` therefore now resolves a muxed (`M…`) sender, which it previously could not
* Test coverage for the graceful-degradation paths: an unrecognised authorized-function type, an unrecognised contract executable, and a wasm or Stellar-Asset executable paired with a mismatched contract-id preimage

### Fixed
* `scValByType` renders a contract instance's wasm hash as hex; it previously returned a UTF-8 interpretation of the raw 32 hash bytes

# Release notes - Typescript Wallet SDK Soroban - 4.0.1
* Version bump

# Release notes - Typescript Wallet SDK Soroban - 4.0.0

### BREAKING CHANGES
* Upgraded `@stellar/stellar-sdk` from `15.0.1` to `16.2.0` (#243)
* Minimum Node.js version raised from 20 to 22, as required by stellar-sdk v16 (#243)

# Release notes - Typescript Wallet SDK Soroban - 3.0.3
* Version bump

# Release notes - Typescript Wallet SDK Soroban - 3.0.2

### Added
* `getInvocationDetails` now walks the authorization tree to arbitrary depth (depth-first), so operations nested below the immediate sub-invocations are included in the returned list (#241)
* `getInvocationArgs` now decodes the `CreateContractV2` host function, surfacing its constructor arguments via a new optional `constructorArgs` field on `FnArgsCreateWasm` and `FnArgsCreateSac` (#241)

# Release notes - Typescript Wallet SDK Soroban - 3.0.1
* Version bump

# Release notes - Typescript Wallet SDK Soroban - 3.0.0

### BREAKING CHANGES
* Upgraded `@stellar/stellar-sdk` from `14.5.0` to `15.0.1` — Protocol 26 support
* `TransactionBase.networkPassphrase` setter now throws to enforce immutability (upstream change)
* XDR integer strict validation: i64/u64 `fromString()` throws on overflow/underflow, i32/u32 throws at XDR serialization (upstream change)

### Added
* XDR integer boundary and overflow/underflow tests

# Release notes - Typescript Wallet SDK Soroban - 2.0.0

### BREAKING CHANGES
* Minimum Node.js version bumped from 18 to 20 (#233)
* Upgraded `@stellar/stellar-sdk` from `13.0.0-beta.1` to `14.5.0` (#233)

### Fixed
* Fixed XDR type compatibility for SDK v14 — replaced `StrKey.encodeContract(contractId())` with `Address.fromScAddress()` to handle `Hash` type change from `Buffer` to `Opaque[]` (#233)

# Release notes - Typescript Wallet SDK Soroban - 1.10.0
* Version bump

# Release notes - Typescript Wallet SDK Soroban - 1.9.0
* Version bump

# Release notes - Typescript Wallet SDK Soroban - 1.8.0

### Added
* Upgrades `@stellar/stellar-sdk` to `13.0.0-beta.1` which supports the `Protocol 22` XDR (#172)

# Release notes - Typescript Wallet SDK Soroban - 1.7.0

### Added
* Bump version to 1.7.0

# Release notes - Typescript Wallet SDK Soroban - 1.6.0

### Added
* Upgrade @stellar/stellar-sdk to 12.1.0 (#143)

# Release notes - Typescript Wallet SDK Soroban - 1.5.0

### Added
* Init to the project, added soroban functionality
* getTokenInvocationArgs function
* Token parsing/formatting functions
* scValyByType function 
* generic getInvocationDetails helper
