import StellarSdk, {
  Keypair,
  Memo,
  MemoText,
  Operation,
  Asset,
} from "stellar-sdk";
import axios from "axios";
import {
  AccountKeypair,
  SigningKeypair,
} from "../src/walletSdk/Horizon/Account";

import sdk from "../src";
const { walletSdk } = sdk;

let wal;
let stellar;
const kp = SigningKeypair.fromSecret(
  "SAS372GXRG6U7FW6W2PRVELKPOJG2FZZUADCIELWU2U3A45TNWXEQUV5",
);
describe("Stellar", () => {
  beforeEach(() => {
    wal = walletSdk.Wallet.TestNet();
    stellar = wal.stellar();
  });
  it("should create and submit a transaction", async () => {
    // make sure signing key exists
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

  it("should resubmit with fee increase if txn fails", async () => {
    // mock 1 failed response and then 1 successful to test retry
    jest
      .spyOn(stellar, "submitTransaction")
      .mockRejectedValueOnce({
        response: {
          status: 400,
          statusText: "Bad Request",
          data: {
            extras: {
              result_codes: { transaction: "tx_too_late" },
            },
          },
        },
      })
      .mockReturnValueOnce({ successful: true });

    const txn = await stellar.submitWithFeeIncrease({
      sourceAddress: kp,
      timeout: 180,
      baseFeeIncrease: 100,
      operations: [
        Operation.payment({
          destination: kp.publicKey,
          asset: Asset.native(),
          amount: "1",
        }),
      ],
    });
    expect(txn).toBeTruthy();
    expect(txn.fee).toBe("200");
  });

  it("should be able to give a signing keypair", async () => {
    // mock 1 failed response and then 1 successful to test retry
    jest
      .spyOn(stellar, "submitTransaction")
      .mockRejectedValueOnce({
        response: {
          status: 400,
          statusText: "Bad Request",
          data: {
            extras: {
              result_codes: { transaction: "tx_too_late" },
            },
          },
        },
      })
      .mockReturnValueOnce({ successful: true });

    const txn = await stellar.submitWithFeeIncrease({
      sourceAddress: kp,
      signingAddresses: [
        SigningKeypair.fromSecret(
          "SDCLCSOJ7JFDUAGMB4RD54JBQ633M2DHWWGNUE4WMK52WMEU6QKZCPHV",
        ),
      ],
      timeout: 180,
      baseFeeIncrease: 100,
      operations: [
        Operation.payment({
          destination: kp.publicKey,
          asset: Asset.native(),
          amount: "1",
        }),
      ],
    });
    expect(txn).toBeTruthy();
    expect(txn.fee).toBe("200");
  });
});
