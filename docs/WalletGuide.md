# Wallet SDK usage guide

<!--- TOC -->

* [Getting started](#getting-started)
  * [Configuring client](#configuring-client)
* [Anchor](#anchor)
  * [Add client domain signing](#add-client-domain-signing)
    * [Example](#example)
* [Build on Stellar](#build-on-stellar)
  * [Account service](#account-service)
  * [Transaction builder](#transaction-builder)
* [Recovery](#recovery)

<!--- END -->

## Getting Started

First, a root Wallet object should be created. This is a core class, that provides all functionality available in the current SDK. Later, it will be shown, how to use the wallet object to access methods.

It's advised to have a singleton wallet object shared across the app.  
Creating a wallet with default configuration connected to testnet is simple:

```typescript
let wallet = Wallet.TestNet();
```

The wallet instance can be further configured. For example, to connect to the public main network:

```typescript
let wallet = new Wallet({
  stellarConfiguration: StellarConfiguration.MainNet(),
});
```

### Configuring client

The Wallet SDK uses the [axios client](https://axios-http.com/docs/intro) for all network requests. A default client is used by default, or a custom client can given and configured like so:

```typescript
const customClient: AxiosInstance = axios.create({
  baseURL: "https://some-url.com/api",
  timeout: 1000,
  headers: { "X-Custom-Header": "foobar" },
});
let appConfig = new ApplicationConfiguration(
  DefaultSigner,
  customClient
);
let wal = new Wallet({
  stellarConfiguration: StellarConfiguration.TestNet(),
  applicationConfiguration: appConfig,
});
  ```

## Anchor

Build on and off ramps with anchors for deposits and withdrawals.

```typescript
let anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });
```

Get anchor information from a TOML file.

```typescript
let resp = await anchor.sep1();
```

Authenticate an account with the anchor using SEP-10.

```typescript
// create an account to authenticate
let account = wal.stellar().account();
let accountKp = account.createKeypair();

// authenticate with Sep-10
let auth = await anchor.sep10();
let authToken = await auth.authenticate({ accountKp });
```

Get available anchor services and information about them. For example, sep24 deposit/withdrawal limits, currency, fees, payment methods.

```typescript
let serviceInfo = await anchor.getServicesInfo();
```

Sep24 deposit and withdrawal.

```typescript
const assetCode = "XLM";

let resp = await anchor.sep24().deposit({
  accountAddress: accountKp.publicKey(),
  assetCode,
  authToken,
});

let resp = await anchor.sep24().withdraw({
  accountAddress: accountKp.publicKey(),
  assetCode,
  authToken,
});
```

Get a single transaction's current status and details.

```typescript
const transaction = await anchor.sep24().getTransactionBy({
  authToken,
  id: transactionId,
});
```

Get account transactions for a specified asset.

```typescript
const transactions = await anchor.sep24().getHistory({
  authToken,
  assetCode,
});
```

Watch transaction.

```typescript
let watcher = anchor.watcher();

let { stop } = watcher.watchOneTransaction({
  authToken,
  assetCode,
  id: successfulTransaction.id,
  onMessage,
  onSuccess,
  onError,
});

// stop watching transaction
stop();
```

### Add client domain signing

One of the features being supported
by [SEP-10 Authentication](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md)
is verifying client domain. This enables anchor to recognize that user request was made using a specific client.

Functionality of signing with client domain is enabled by the [WalletSigner](../wallet-sdk/src/walletsdk/Auth/WalletSigner.ts). You can use the `DefaultSigner` class as a baseline for your implementation. The main method that needs to be implemented is `signWithDomainAccount`.

Implementation should make a request to a backend server containing the client domain private key. Server returns signed transaction, finishing the flow.

For your wallet signer to be used, it's required to set it in this SDK. It's recommended to set it globally via `ApplicationConfiguration` `defaultSigner` [option](../wallet-sdk/src/walletsdk/index.ts).
Alternatively, it can be passed to the `authenticate` call of the `Sep10` class.

#### Example

In the example below, [Stellar demo wallet](https://demo-wallet.stellar.org) will be used as a client domain. Server-side implementation, responsible for signing transaction can be found [here](https://github.com/stellar/stellar-demo-wallet/tree/master/packages/demo-wallet-server).  

First, create an object using the `WalletSigner` interface, and define both the signWithClientAccount and a signWithDomainAccount method.

```typescript
const demoWalletSigner: WalletSigner = {
  signWithClientAccount: ({ transaction, accountKp }) => {
    transaction.sign(accountKp);
    return transaction;
  },
  signWithDomainAccount: async ({
    transactionXDR,
    networkPassphrase,
    accountKp,
  }) => {
    return await axios.post("https://demo-wallet-server.stellar.org/sign", {
      transactionXDR,
      networkPassphrase,
    });
  },
};
```

Wallet can now use this class:
```typescript
const wallet = new walletSdk.Wallet({
  stellarConfiguration: walletSdk.StellarConfiguration.TestNet(),
  applicationConfiguration: new walletSdk.ApplicationConfiguration(
    demoWalletSigner
  ),
});
```

And it can now be used for authentication with client domain:
```typescript
const authToken = await auth.authenticate({
  accountKp,
  walletSigner: demoWalletSigner,
  clientDomain: "demo-wallet-server.stellar.org",
});
```


## Build on Stellar

Once the Wallet is configured, you can use the following:

- transaction builder to create transactions (for example, fund the account or add asset support),
- account service to generate account keypair or get account information, and
- submit a signed transaction to Stellar network.

### Account service

Generate new account keypair (public and secret keys).

```typescript
let account = wal.stellar().account();
let accountKeyPair = account.createKeypair();
```

Get account information from the Stellar network (assets, liquidity pools, and reserved native balance).

```typescript
... code to be added
```

Get account history (all operations) from the Stellar network.

```typescript
... code to be added
```

### Transaction builder

Transaction builder allows you to create various transactions that can be signed and submitted to the Stellar network.
Some transactions can be sponsored.

```typescript
let sourceAccountKeyPair = account.createKeypair();
let destinationAccountKeyPair = account.createKeypair();
```

Create account transaction activates/creates an account with a starting balance (by default, it's 1 XLM). This transaction can be sponsored.

```typescript
... code to be added
```

Lock the master key of the account (set its weight to 0). Use caution when locking the account's master key. Make sure you have set the correct signers and weights. Otherwise, you will lock the account irreversibly. This transaction can be
sponsored.

```typescript
... code to be added
```

Add an asset (trustline) to the account. This allows account to receive the asset. This transaction can be sponsored.

```typescript
... code to be added
```

Remove an asset from the account (the balance must be 0)

```typescript
... code to be added
```

Add a new signer to the account. Use caution when adding new signers. Make sure you set the correct signer weight.
Otherwise, you will lock the account irreversibly. This transaction can be sponsored.

```typescript
... code to be added
```

Remove a signer from the account.

```typescript
... code to be added
```

Modify account thresholds (usefully with multiple signers assigned to the account). Allows to restrict access to certain
operations when limit is not reached.

```typescript
... code to be added
```

coming soon:

### Submit transaction

### Transaction builder (extra)

### Transaction builder (sponsoring)

### Sponsoring account creation

### Sponsoring account creation and modification

### Fee bump transaction

### Using XDR to exchange transaction data between server and client

## Recovery
