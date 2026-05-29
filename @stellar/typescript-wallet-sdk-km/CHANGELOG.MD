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

