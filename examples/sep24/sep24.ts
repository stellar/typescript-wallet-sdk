import axios from "axios";
import { Memo, MemoText } from "stellar-sdk";
import {
  walletSdk,
  Anchor,
  SigningKeypair,
  Types,
  IssuedAssetId,
} from "@stellar/typescript-wallet-sdk";

const wallet = walletSdk.Wallet.TestNet();
const stellar = wallet.stellar();

// Create Deposit
let authTokenDeposit: string;
export const runDeposit = async (anchor: Anchor, kp: SigningKeypair) => {
  console.log("\ncreating deposit ...");
  const auth = await anchor.sep10();
  authTokenDeposit = await auth.authenticate({ accountKp: kp });

  const assetCode = "USDC";
  const resp = await anchor.sep24().deposit({
    assetCode,
    authToken: authTokenDeposit,
    lang: "en-US",
    destinationMemo: new Memo(MemoText, "test-memo"),
    extraFields: {
      wallet_name: "Test Wallet",
      wallet_url: "https://stellar.org/",
    },
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
    if (m.status === "completed") {
      console.log("status completed, stopping watcher");
      stop();
      depositDone = true;
    }
  };

  const onError = (error: Types.AnchorTransaction | Error) => {
    console.log({ error });
  };

  const watcher = anchor.sep24().watcher();
  const resp = watcher.watchAllTransactions({
    authToken: authTokenDeposit,
    assetCode: "USDC",
    onMessage,
    onError,
    timeout: 5000,
    lang: "en-US",
  });

  stop = resp.stop;
};

// Create Withdrawal
let authTokenWithdraw;
export const runWithdraw = async (anchor, kp) => {
  console.log("\ncreating withdrawal ...");
  const auth = await anchor.sep10();
  authTokenWithdraw = await auth.authenticate({ accountKp: kp });

  const assetCode = "USDC";
  const resp = await anchor.sep24().withdraw({
    assetCode,
    authToken: authTokenWithdraw,
    lang: "en-US",
    extraFields: {
      wallet_name: "Test Wallet",
      wallet_url: "https://stellar.org/",
    },
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
  const success = await stellar.submitTransaction(tx);
  if (!success) {
    throw new Error("adding trustline failed");
  }
};

// Watch Withdrawal
export const runWithdrawWatcher = (anchor, kp) => {
  console.log("\nstarting watcher ...");

  let stop;
  const onMessage = (m) => {
    console.log({ m });

    if (m.status === "pending_user_transfer_start") {
      sendWithdrawalTransaction(m, kp);
    }

    if (m.status === "completed") {
      console.log("status completed, stopping watcher");

      stop();
      process.exit(0);
    }
  };

  const onError = (e) => {
    console.log({ e });
  };

  const watcher = anchor.sep24().watcher();
  const resp = watcher.watchAllTransactions({
    authToken: authTokenWithdraw,
    assetCode: "USDC",
    onMessage,
    onError,
    timeout: 5000,
    lang: "en-US",
  });

  stop = resp.stop;
};
