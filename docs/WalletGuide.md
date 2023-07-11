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

## Anchor

Build on and off ramps with anchors for deposits and withdrawals.

```typescript
let anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });
```

Get anchor information from a TOML file.

```typescript
let resp = await anchor.getInfo();
```

Authenticate an account with the anchor using SEP-10.

```typescript
// create an account to authenticate
let account = wal.stellar().account();
let accountKp = account.createKeypair();

// authenticate with Sep-10
let auth = await anchor.auth();
let authToken = await auth.authenticate({ accountKp });
```

Get available anchor services and information about them. For example, interactive deposit/withdrawal limits, currency, fees, payment methods.

```typescript
let serviceInfo = await anchor.getServicesInfo();
```

Interactive deposit and withdrawal.

```typescript
const assetCode = "XLM";

let resp = await anchor.interactive().deposit({
  accountAddress: accountKp.publicKey(),
  assetCode,
  authToken,
});

let resp = await anchor.interactive().withdraw({
  accountAddress: accountKp.publicKey(),
  assetCode,
  authToken,
});
```

Get a single transaction's current status and details.

```typescript
const transaction = await anchor.getTransactionBy({
  authToken,
  id: transactionId,
});
```

Get account transactions for a specified asset.

```typescript
const transactions = await anchor.getHistory({
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
