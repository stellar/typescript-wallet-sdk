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
import {
  IssuedAssetId,
  FiatAssetId,
  NativeAssetId,
} from "../src/walletSdk/Asset";

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

    const signerFunction = (txn) => {
      txn.sign(kp.keypair);
      return txn;
    };

    const txn = await stellar.submitWithFeeIncrease({
      sourceAddress: kp,
      signingAddresses: [
        SigningKeypair.fromSecret(
          "SDCLCSOJ7JFDUAGMB4RD54JBQ633M2DHWWGNUE4WMK52WMEU6QKZCPHV",
        ),
      ],
      timeout: 180,
      baseFeeIncrease: 100,
      signerFunction,
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
  it("should add and remove asset support", async () => {
    const asset = new IssuedAssetId(
      "USDC",
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );

    const txBuilder = await stellar.transaction({
      sourceAddress: kp,
      baseFee: 1000,
    });
    const tx = txBuilder.addAssetSupport(asset).build();
    tx.sign(kp.keypair);
    await stellar.submitTransaction(tx);

    let acc = await stellar.server.loadAccount(kp.publicKey);
    let balance = acc.balances.find((b) => b.asset_code === "USDC");
    expect(balance).toBeTruthy();

    const tx2 = txBuilder.removeAssetSupport(asset).build();
    tx2.sign(kp.keypair);
    await stellar.submitTransaction(tx2);

    acc = await stellar.server.loadAccount(kp.publicKey);
    balance = acc.balances.find((b) => b.asset_code === "USDC");
    expect(balance).toBeFalsy();
  }, 20000);

  it("should import and sign a transaction from xdr", async () => {
    const txnXdr =
      "AAAAAgAAAACHw+LvUYx5O3Ot8A1SUChfTVk4qxFFJZ5QZ/ktaEUKPwAAAGQACEjuAAABDAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAACHw+LvUYx5O3Ot8A1SUChfTVk4qxFFJZ5QZ/ktaEUKPwAAAAAAAAAAATEtAAAAAAAAAAAA";

    const tx = stellar.decodeTransaction(txnXdr);
    kp.sign(tx);
  });
});

describe("Asset", () => {
  it("should create an asset", () => {
    const issued = new IssuedAssetId(
      "USDC",
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );
    expect(issued.sep38).toBe(
      "stellar:USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );
    expect(issued.toAsset().code).toBe("USDC");

    const native = new NativeAssetId();
    expect(native.sep38).toBe("stellar:native");
    expect(native.toAsset().code).toBe("XLM");

    const fiat = new FiatAssetId("USD");
    expect(fiat.sep38).toBe("iso4217:USD");
  });
});
