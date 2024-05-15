# Typescript Wallet SDK Monorepo

Typescript Wallet SDK is a library that allows developers to build wallet
applications on the Stellar network faster. To jump right into how the main
typescript-wallet-sdk module works you can
[go here](./@stellar/typescript-wallet-sdk/README.md).

## Yarn Workspaces

This repo uses a yarn worspace to create a monorepo that includes the main
wallet sdk, and two modules for extending functionality:

- [typescript-wallet-sdk](./@stellar/typescript-wallet-sdk/README.md) - the main
  sdk for building wallets on stellar
- [typescript-wallet-sdk-km](./@stellar/typescript-wallet-sdk-km/README.md) -
  functionality for key managing
- [typescript-wallet-sdk-soroban](./@stellar/typescript-wallet-sdk-soroban/README.md) -
  functionality for smart contracts on stellar

## Prerequisites

You will need

- Node (>=18): https://nodejs.org/en/download/
- Yarn (v1.22.5 or newer): https://classic.yarnpkg.com/en/docs/install

## Install and Build the Project

```
yarn install
yarn build
```

- this will install and build for all sub modules

## Testing

```
yarn test
```

- this will run all jest unit tests for each submodule

Some tests that are not ran as part of that suite (but run during ci/cd):

- [integration tests](./@stellar/typescript-wallet-sdk/test/integration/README.md)
- [e2e tests](./@stellar/typescript-wallet-sdk/test/e2e/README.md)
