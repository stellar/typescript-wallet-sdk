# typescript-wallet-sdk

Typescript Wallet SDK to build Stellar wallets

### This SDK is currently in development. Some features may not work as expected. Please use at your own risk.

### To use locally you can use npm link:

```
// build wallet sdk
cd typescript-wallet-sdk
yarn
yarn run build

// add npm link of sdk directory
npm link

// change to your wallet directory, and then create npm link
cd my-wallet
npm link @stellar/typescript-wallet-sdk

// import in wallet code
import typescript-wallet-sdk from "@stellar/typescript-wallet-sdk"
```

### To run tests:

```
yarn test
```
