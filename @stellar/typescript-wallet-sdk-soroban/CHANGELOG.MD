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
