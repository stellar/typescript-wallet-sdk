import axios from "axios";
import readline from "readline";

import {
  walletSdk,
  Anchor,
  SigningKeypair,
  Types,
  IssuedAssetId,
} from "../../src";
import { Memo, MemoText } from "stellar-sdk";

const wallet = walletSdk.Wallet.TestNet();
const stellar = wallet.stellar();
const anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });
const account = stellar.account();

let kp: SigningKeypair;

const asset = new IssuedAssetId(
  "USDC",
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
);

const runSep24 = async () => {
  await createAccount();
  await runDeposit(anchor, kp);
  await runDepositWatcher(anchor);

  while (!depositDone) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const ans = await askQuestion("Do you want to start withdrawal? (y/n)");
  if (ans !== "y") {
    process.exit(0);
  }

  await runWithdraw(anchor, kp);
  await runWithdrawWatcher(anchor, kp);
};

// Create Account
const createAccount = async () => {
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
  authToken = await auth.authenticate({ accountKp: kp });

  const resp = await anchor.sep24().deposit({
    assetCode: asset.code,
    authToken: authToken,
    lang: "en-US",
    destinationMemo: new Memo(MemoText, "test-memo"),
  });

  console.log("Open url:\n", resp.url);
};

// Watch Deposit
export let depositDone = false;
export const runDepositWatcher = (anchor: Anchor) => {
  console.log("\nstarting watcher ...");

  let stop: Types.WatcherStopFunction;
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

  let stop;
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
