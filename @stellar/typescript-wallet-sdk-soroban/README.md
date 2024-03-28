# Stellar Typescript Wallet Soroban SDK [![npm version](https://badge.fury.io/js/@stellar%2Ftypescript-wallet-sdk-soroban.svg)](https://badge.fury.io/js/@stellar%2Ftypescript-wallet-sdk-soroban)

The Typescript Wallet Soroban SDK is a work-in-progress library that (currently)
allows developers to use soroban helpers in their wallet applications. It works
in conjuction with the main
[Typescript Wallet SDK](https://github.com/stellar/typescript-wallet-sdk) to
hold all the functionality a developer would need to create a wallet for the
stellar network.

## Dependency

The library is available via npm. To import `typescript-wallet-sdk-soroban` you
need to add it as a dependency to your code:

yarn:

```shell
yarn add @stellar/typescript-wallet-sdk-soroban
```

npm:

```shell
npm install @stellar/typescript-wallet-sdk-soroban
```

## Introduction

Here's some examples on how to use the Soroban helpers:

```typescript
import {
  getTokenInvocationArgs,
  formatTokenAmount,
  parseTokenAmount,
  scValByType,
} from "@stellar/typescript-wallet-sdk-soroban";

const transaction = TransactionBuilder.fromXDR(
  "AAAAAgAAAACM6IR9GHiRoVVAO78JJNksy2fKDQNs2jBn8bacsRLcrDucaFsAAAWIAAAAMQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABHkEVdJ+UfDnWpBr/qF582IEoDQ0iW0WPzO9CEUdvvh8AAAAIdHJhbnNmZXIAAAADAAAAEgAAAAAAAAAAjOiEfRh4kaFVQDu/CSTZLMtnyg0DbNowZ/G2nLES3KwAAAASAAAAAAAAAADoFl2ACT9HZkbCeuaT9MAIdStpdf58wM3P24nl738AnQAAAAoAAAAAAAAAAAAAAAAAAAAFAAAAAQAAAAAAAAAAAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAIzohH0YeJGhVUA7vwkk2SzLZ8oNA2zaMGfxtpyxEtysAAAAEgAAAAAAAAAA6BZdgAk/R2ZGwnrmk/TACHUraXX+fMDNz9uJ5e9/AJ0AAAAKAAAAAAAAAAAAAAAAAAAABQAAAAAAAAABAAAAAAAAAAIAAAAGAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAAFAAAAAEAAAAHa35L+/RxV6EuJOVk78H5rCN+eubXBWtsKrRxeLnnpRAAAAACAAAABgAAAAEeQRV0n5R8OdakGv+oXnzYgSgNDSJbRY/M70IRR2++HwAAABAAAAABAAAAAgAAAA8AAAAHQmFsYW5jZQAAAAASAAAAAAAAAACM6IR9GHiRoVVAO78JJNksy2fKDQNs2jBn8bacsRLcrAAAAAEAAAAGAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAAEAAAAAEAAAACAAAADwAAAAdCYWxhbmNlAAAAABIAAAAAAAAAAOgWXYAJP0dmRsJ65pP0wAh1K2l1/nzAzc/bieXvfwCdAAAAAQBkcwsAACBwAAABKAAAAAAAAB1kAAAAAA==",
  Networks.FUTURENET,
) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
const op = transaction.operations[0];

const args = getTokenInvocationArgs(op);

console.log(args);
/*
    prints:
      {
        fnName: "transfer,
        contractId: "CAPECFLUT6KHYOOWUQNP7KC6PTMICKANBURFWRMPZTXUEEKHN67B7UI2",
        from: "GCGORBD5DB4JDIKVIA536CJE3EWMWZ6KBUBWZWRQM7Y3NHFRCLOKYVAL",
        to: "GDUBMXMABE7UOZSGYJ5ONE7UYAEHKK3JOX7HZQGNZ7NYTZPPP4AJ2GQJ",
        amount: 5
      }
  */

const formattedAmount = formatTokenAmount("10000123", 3);
// formattedAmount = "10000.123"

const parsedAmount = parseTokenAmount("10000.123", 3);
// parsedAmount = 10000123

const accountAddress = xdr.ScVal.scvAddress(
  xdr.ScAddress.scAddressTypeAccount(
    xdr.PublicKey.publicKeyTypeEd25519(
      StrKey.decodeEd25519PublicKey(
        "GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB",
      ),
    ),
  ),
);

const addressString = scValByType(accountAddress);
// addressString = "GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB"
```
