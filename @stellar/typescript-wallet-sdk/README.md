# Stellar Typescript Wallet SDK [![npm version](https://badge.fury.io/js/@stellar%2Ftypescript-wallet-sdk.svg)](https://badge.fury.io/js/@stellar%2Ftypescript-wallet-sdk)

Typescript Wallet SDK is a library that allows developers to build wallet
applications on the Stellar network faster. It utilizes
[Javascript Stellar SDK](https://github.com/stellar/js-stellar-sdk) to
communicate with a Stellar Horizon server.  
It offers wide range of functionality to simplify integration with the Stellar
network, and connect to the anchors easily, utilizing various Stellar protocols
(SEPs)

## Dependency

The library is available via npm. To import `typescript-wallet-sdk` library you
need to add it as a dependency to your code:

yarn:

```shell
yarn add @stellar/typescript-wallet-sdk
```

npm:

```shell
npm install @stellar/typescript-wallet-sdk
```

## Introduction

Here's a small example creating main wallet class with default configuration
connected to testnet network:

```typescript
let wallet = walletSdk.Wallet.TestNet();
```

It should later be re-used across the code, as it has access to various useful
children classes. For example, you can authenticate with the `testanchor` as
simple as:

```typescript
const authKey = SigningKeypair.fromSecret("my secret key");
const anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });
const sep10 = await anchor.sep10();

const authToken = await sep10.authenticate({ accountKp: authKey });
```

Read
[full wallet guide](https://developers.stellar.org/docs/category/build-a-wallet-with-the-wallet-sdk)
for more info
