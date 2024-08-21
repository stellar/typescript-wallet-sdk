# Sep-1o examples for stellar typescript-wallet-sdk

## Example code

To view how the wallet-sdk can be used to create a sep-10 auth token for an
wallet to send to an anchor,look at `sep10Wallet.ts`.

To view how to setup an authentication server for the anchor,look at
`sep10Server.ts`.

## Changing environment variables

If you'd like to use different environment variable values than the default
ones, you can add a `.env` file. See `.env.example` as an example.

The environment variables you can set are:

| Variable Name   | Description                                                                                                                    | Default Value          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| ANCHOR_DOMAIN   | The anchor domain for your application.                                                                                        | testanchor.stellar.org |
| AUTH_KEY_SECRET | The secret key for the account authenticating                                                                                  | none                   |
| RUN_MAINNET     | Set to `true` to run the application on Mainnet.                                                                               | false                  |
| CLIENT_DOMAIN   | [SEP-10](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md) client domain used for authentication. | none                   |
