import path from "path";

import { walletSdk, SigningKeypair, DefaultSigner, Wallet } from "../../src";

import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Grabbing environment variables

const anchorDomain = process.env.ANCHOR_DOMAIN || "testanchor.stellar.org";
const runMainnet = process.env.RUN_MAINNET || false;
const authKeySecret = process.env.AUTH_KEY_SECRET;
const clientDomain = process.env.CLIENT_DOMAIN;

let wallet: Wallet;
if (runMainnet === "true") {
  console.log("Warning: you are running this script on the public network.");
  wallet = walletSdk.Wallet.MainNet();
} else {
  wallet = walletSdk.Wallet.TestNet();
}
const anchor = wallet.anchor({
  homeDomain: anchorDomain,
});

export const getSep10AuthToken = async () => {
  const authKey = SigningKeypair.fromSecret(authKeySecret);
  const sep10 = await anchor.sep10();
  const signer = DefaultSigner;

  const getAuthToken = async () => {
    return sep10.authenticate({
      accountKp: authKey,
      walletSigner: signer,
      clientDomain,
    });
  };

  const authToken = await getAuthToken();

  return authToken;
};
