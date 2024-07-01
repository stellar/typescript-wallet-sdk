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


