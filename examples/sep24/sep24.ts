import axios from "axios";
import readline from "readline";
import path from "path";

import {
  walletSdk,
  Anchor,
  SigningKeypair,
  Types,
  IssuedAssetId,
  DefaultSigner,
} from "../../src";
import { Memo, MemoText, Transaction, TransactionBuilder } from "stellar-sdk";

import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Grabbing environment variables

const anchorDomain = process.env.ANCHOR_DOMAIN || "testanchor.stellar.org";
const assetCode = process.env.ASSET_CODE || "USDC";
const assetIssuer =
  process.env.ASSET_ISSUER ||
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const runMainnet = process.env.RUN_MAINNET || false;
const sourceAccountSecret = process.env.SOURCE_ACCOUNT_SECRET;
const clientDomain = process.env.CLIENT_DOMAIN;
const clientSecret = process.env.CLIENT_SECRET;

// Running example

let wallet;
if (runMainnet === "true") {
  console.log("Warning: you are running this script on the public network.");
  wallet = walletSdk.Wallet.MainNet();
} else {
  wallet = walletSdk.Wallet.TestNet();
}
const stellar = wallet.stellar();
const anchor = wallet.anchor({
  homeDomain: anchorDomain,
});
const account = stellar.account();

let kp: SigningKeypair;

const asset = new IssuedAssetId(assetCode, assetIssuer);

const runSep24 = async () => {
  await createAccount();
  await runDeposit(anchor, kp);
  runDepositWatcher(anchor);

  while (!depositDone) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const ans = await askQuestion("Do you want to start withdrawal? (y/n)");
  if (ans !== "y") {
    process.exit(0);
  }

  await runWithdraw(anchor, kp);
  runWithdrawWatcher(anchor, kp);
};

// Create Account
const createAccount = async () => {
  if (sourceAccountSecret) {
    kp = SigningKeypair.fromSecret(sourceAccountSecret);
    return;
  }

  console.log("creating account ...");
  kp = account.createKeypair();
  console.log(`kp: \n${kp.publicKey}\n${kp.secretKey}`);

  // funding new account
  await axios.get("https://friendbot.stellar.org/?addr=" + kp.publicKey);

  const txBuilder = await stellar.transaction({
    sourceAddress: kp,
    baseFee: 1000,
  });
  const tx = txBuilder.addAssetSupport(asset).build();
  kp.sign(tx);
  await stellar.submitTransaction(tx);
};

// Create Deposit
let authToken: string;
export const runDeposit = async (anchor: Anchor, kp: SigningKeypair) => {
  console.log("\ncreating deposit ...");
  const auth = await anchor.sep10();
  authToken = await auth.authenticate({
    accountKp: kp,
    clientDomain,
    walletSigner,
  });

  const resp = await anchor.sep24().deposit({
    assetCode: asset.code,
    authToken: authToken,
    lang: "en-US",
    destinationMemo: new Memo(MemoText, "test-memo"),
    // Optional field. Same result would be achieved with omitting this field.
    // Replace with a different account if you want to change destination
    destinationAccount: kp.publicKey,
    // If not specified, amount will be collected in the interactive flow. You can also pass extra SEP-9 fields.
    extraFields: { amount: "10" },
  });

  console.log("Open url:\n", resp.url);
};

// Watch Deposit
export let depositDone = false;
export const runDepositWatcher = (anchor: Anchor) => {
  console.log("\nstarting watcher ...");

  const stop: Types.WatcherStopFunction;
  const onMessage = (m: Types.AnchorTransaction) => {
    console.log({ m });
    if (m.status === Types.TransactionStatus.completed) {
      console.log("status completed, stopping watcher");
      stop();
      depositDone = true;
    }
  };

  const onError = (error: Types.AnchorTransaction | Error) => {
    console.error({ error });
  };

  const watcher = anchor.sep24().watcher();
  const resp = watcher.watchAllTransactions({
    authToken: authToken,
    assetCode: asset.code,
    onMessage,
    onError,
    timeout: 5000,
    lang: "en-US",
  });

  stop = resp.stop;
};

// Create Withdrawal
export const runWithdraw = async (anchor, kp) => {
  console.log("\ncreating withdrawal ...");

  const resp = await anchor.sep24().withdraw({
    assetCode: asset.code,
    authToken: authToken,
    lang: "en-US",
    // Optional field. Same result would be achieved with omitting this field.
    // Replace with a different account if you want to change destination
    withdrawalAccount: kp.publicKey,
    // If not specified, amount will be collected in the interactive flow. You can also pass extra SEP-9 fields.
    extraFields: { amount: "10" },
  });
  console.log("Open url:\n", resp.url);
};

const sendWithdrawalTransaction = async (withdrawalTxn, kp) => {
  const asset = new IssuedAssetId(
    "USDC",
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  );

  const txBuilder = await stellar.transaction({
    sourceAddress: kp,
    baseFee: 1000,
  });
  const tx = txBuilder
    .transferWithdrawalTransaction(withdrawalTxn, asset)
    .build();
  kp.sign(tx);
  await stellar.submitTransaction(tx);
};

// Watch Withdrawal
export const runWithdrawWatcher = (anchor, kp) => {
  console.log("\nstarting watcher ...");

  const stop;
  const onMessage = (m) => {
    console.log({ m });

    if (m.status === Types.TransactionStatus.pending_user_transfer_start) {
      sendWithdrawalTransaction(m, kp);
    }

    if (m.status === Types.TransactionStatus.completed) {
      console.log("status completed, stopping watcher");

      stop();
    }
  };

  const onError = (e) => {
    console.error({ e });
  };

  const watcher = anchor.sep24().watcher();
  const resp = watcher.watchAllTransactions({
    authToken: authToken,
    assetCode: asset.code,
    onMessage,
    onError,
    timeout: 5000,
    lang: "en-US",
  });

  stop = resp.stop;
};

const walletSigner = DefaultSigner;
walletSigner.signWithDomainAccount = async ({
  transactionXDR,
  networkPassphrase,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accountKp,
}: Types.SignWithDomainAccountParams): Promise<Transaction> => {
  if (!clientSecret) {
    throw new Error("Client Secret missing from .env file");
  }

  const signer = SigningKeypair.fromSecret(clientSecret);

  const transaction = TransactionBuilder.fromXDR(
    transactionXDR,
    networkPassphrase,
  ) as Transaction;
  signer.sign(transaction);

  return Promise.resolve(transaction);
};

export const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    }),
  );
};

runSep24();
