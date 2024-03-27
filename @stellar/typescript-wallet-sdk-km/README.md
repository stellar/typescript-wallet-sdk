# Stellar Typescript Wallet Key Manager SDK [![npm version](https://badge.fury.io/js/@stellar%2Ftypescript-wallet-sdk-km.svg)](https://badge.fury.io/js/@stellar%2Ftypescript-wallet-sdk-km)

The Typescript Wallet Key Manager SDK is a library that allows developers to use
key managing functionality in their wallet applications. It works in conjuction
with the main
[Typescript Wallet SDK](https://github.com/stellar/typescript-wallet-sdk) to
hold all the functionality a developer would need to create a wallet for the
stellar network.

## Dependency

The library is available via npm. To import `typescript-wallet-sdk-km` you need
to add it as a dependency to your code:

yarn:

```shell
yarn add @stellar/typescript-wallet-sdk-km
```

npm:

```shell
npm install @stellar/typescript-wallet-sdk-km
```

## Introduction

Here's a small example on how to use the KeyManager to store and retrieve a key:

Import the package:

```typescript
import { KeyManager, MemoryKeyStore } from "@stellar/typescript-wallet-sdk-km";
```

Creating a KeyManager class using simple memory key storage:

```typescript
const testStore = new MemoryKeyStore();
const testKeyManager = new KeyManager({ keyStore: testStore });
```

Store an encrypted key:

```typescript
const id = "this is a my test id";
testKeyManager.registerEncrypter(IdentityEncrypter);
await testKeyManager.storeKey({
  key: {
    id,
    type: KeyType.plaintextKey,
    publicKey: "TestPublicKey",
    privateKey: "TestPrivateKey",
  },
  password: "test",
  encrypterName: "IdentityEncrypter",
});
```

Retrieve the stored key:

```typescript
const keyData = await testKeyManager.loadKey(id, password);
```
