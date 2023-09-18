import axios from "axios";
import { walletSdk, IssuedAssetId } from "@stellar/typescript-wallet-sdk";

const wallet = walletSdk.Wallet.TestNet();
const stellar = wallet.stellar();

// Create Withdrawal
let authToken;
export const runWithdraw = async (anchor, kp) => {
  console.log("\ncreating withdrawal ...");
  const auth = await anchor.sep10();
  authToken = await auth.authenticate({ accountKp: kp });

  const assetCode = "SRT";
  const resp = await anchor.sep24().withdraw({
    assetCode,
    authToken,
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
    "SRT",
    "GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
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
    authToken,
    assetCode: "SRT",
    onMessage,
    onError,
    timeout: 5000,
    lang: "en-US",
  });

  stop = resp.stop;
};
