import { Memo, MemoText } from "stellar-sdk";
import { Anchor, SigningKeypair, Types } from "@stellar/typescript-wallet-sdk";

// Create Deposit
let authToken: string;
export const runDeposit = async (anchor: Anchor, kp: SigningKeypair) => {
  console.log("\ncreating deposit ...");
  const auth = await anchor.sep10();
  authToken = await auth.authenticate({ accountKp: kp });

  const assetCode = "SRT";
  const resp = await anchor.sep24().deposit({
    assetCode,
    authToken,
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
    authToken,
    assetCode: "SRT",
    onMessage,
    onError,
    timeout: 5000,
    lang: "en-US",
  });

  stop = resp.stop;
};
