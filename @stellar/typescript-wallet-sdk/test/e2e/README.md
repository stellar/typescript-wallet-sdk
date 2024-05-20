# How it works

## browser.test.ts

This test uses playwright to load the browser bundle file into a browser
environment and run its code. If there is a bug in how its built,
window.WalletSDK will be undefined.

### To run

$ yarn build $ yarn test browser.test.ts
