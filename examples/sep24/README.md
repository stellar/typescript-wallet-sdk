# Sep-24 examples for stellar typescript-wallet-sdk

## Example code

To view how the wallet-sdk can be used to create sep-24 deposits and withdrawals
look at `deposit.ts` and `withdraw.ts`.

## Running deposit and withdrawals

To see them in action you can run below:

```
$ yarn start
```

This will run the deposit flow and watch for it to finish. At the end it will
ask if you'd like to run the withdraw flow. Use USDC as the asset for the
example.

Progress will be logged in the terminal.

_note: the identity values used in the sep24 interactive portal can all be fake_
