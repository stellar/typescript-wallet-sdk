import StellarSdk, { Keypair, Memo, MemoText } from "stellar-sdk";
import axios from "axios";
import {
  AccountKeypair,
  SigningKeypair,
} from "../src/walletSdk/Horizon/Account";

import sdk from "../src";
const { walletSdk } = sdk;

describe("Stellar", () => {
  it("should create and submit a transaction", async () => {
    const wal = walletSdk.Wallet.TestNet();
    const stellar = wal.stellar();

    // make sure signing key exists
    const kp = SigningKeypair.fromSecret(
      "SAS372GXRG6U7FW6W2PRVELKPOJG2FZZUADCIELWU2U3A45TNWXEQUV5",
    );
    try {
      await stellar.server.loadAccount(kp.publicKey);
    } catch (e) {
      await axios.get("https://friendbot.stellar.org/?addr=" + kp.publicKey);
    }

    const now = Math.floor(Date.now() / 1000) - 5;

    const txBuilderParams = [
      {
        sourceAddress: kp,
        baseFee: 100,
        startingBalance: 2,
      },
      {
        sourceAddress: kp,
        baseFee: 100,
        timebounds: 180,
        memo: new Memo(MemoText, "test-memo"),
        startingBalance: 2.1,
      },
      {
        sourceAddress: kp,
        baseFee: 100,
        timebounds: { minTime: now, maxTime: now + 180 },
        startingBalance: 2,
      },
    ];

    for (const param of txBuilderParams) {
      const txBuilder = await stellar.transaction(param);
      const newKp = new AccountKeypair(Keypair.random());
      const tx = txBuilder.createAccount(newKp, param.startingBalance).build();
      tx.sign(kp.keypair);

      let failed;
      try {
        await stellar.submitTransaction(tx);
        await stellar.server.loadAccount(param.sourceAddress.publicKey);
      } catch (e) {
        failed = true;
      }
      expect(failed).toBeFalsy();
    }
  }, 30000);
});
