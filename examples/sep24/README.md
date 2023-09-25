# Sep-24 examples for stellar typescript-wallet-sdk

## Example code

To view how the wallet-sdk can be used to create sep-24 deposits and withdrawals
look at `sep24.ts`.

## Running deposit and withdrawals

To see them in action you can run below from the project root:

```
$ yarn example:sep24
```

This will run the deposit flow and watch for it to finish. At the end it will
ask if you'd like to run the withdraw flow. Use USDC as the asset for the
example.

Progress will be logged in the terminal.

_note: the identity values used in the sep24 interactive portal can all be fake_

## Changing environment variables

If you'd like to use different environment variable values than the default
ones, you can add a `.env` file. See `.env.example` as an example.

The environment variables you can set are:

| Variable Name         | Description                                                                                                                    | Default Value                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| ANCHOR_DOMAIN         | The anchor domain for your application.                                                                                        | testanchor.stellar.org                                   |
| ASSET_CODE            | The code representing the asset.                                                                                               | USDC                                                     |
| ASSET_ISSUER          | The issuer's public key for the asset.                                                                                         | GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 |
| SOURCE_ACCOUNT_SECRET | The secret key for the account depositing or withdrawing from the anchor. If none given then a new account will be created.    | none                                                     |
| RUN_MAINNET           | Set to `true` to run the application on Mainnet.                                                                               | false                                                    |
| CLIENT_DOMAIN         | [SEP-10](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md) client domain used for authentication. | none                                                     |
| CLIENT_SECRET         | Secret key for the client domain. Alternatively, you may want to implement your own `WalletSigner`.                            | none                                                     |
