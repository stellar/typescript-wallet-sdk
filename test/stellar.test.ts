import {
  Keypair,
  Memo,
  MemoText,
  Operation,
  Asset,
  Horizon,
} from "stellar-sdk";
import axios from "axios";

import { Stellar, Wallet } from "../src";
import {
  AccountKeypair,
  SigningKeypair,
} from "../src/walletSdk/Horizon/Account";
import {
  IssuedAssetId,
  FiatAssetId,
  NativeAssetId,
} from "../src/walletSdk/Asset";
import { TransactionStatus, WithdrawTransaction } from "../src/walletSdk/Types";

// ALEC TODO - move to it's own describe?
describe("ALEC TODO - move", () => {
  // ALEC TODO - uncomment
  // it("should sponsor creating an account", async () => {
  //   const kp = new SigningKeypair(Keypair.random());
  //   console.log(`kp: ${kp.publicKey}`); // ALEC TODO - remove
  //   const newKp = new SigningKeypair(Keypair.random());
  //   console.log(`newKp: ${newKp.publicKey}`); // ALEC TODO - remove
  //   await axios.get("https://friendbot.stellar.org/?addr=" + kp.publicKey);

  //   const wal = Wallet.TestNet();
  //   const stellar = wal.stellar();

  //   const txBuilder = await stellar.transaction({
  //     sourceAddress: kp,
  //     baseFee: 100,
  //   });

  //   const buildingFunction = (builder) => builder.createAccount(newKp, "0");

  //   const txn = txBuilder.sponsoring(kp, buildingFunction, newKp).build();
  //   console.log(txn.toXDR()); // ALEC TODO - remove

  //   kp.sign(txn);
  //   newKp.sign(txn);

  //   const res = await stellar.submitTransaction(txn);
  //   expect(res).toBe(true);
  // }, 30000);

  // ALEC TODO - probably combine with above
  it("should sponsor creating an account - diff txn source and sponsor", async () => {
    const txnSourceKp = new SigningKeypair(Keypair.random());
    console.log(`txnSourceKp: ${txnSourceKp.publicKey}`); // ALEC TODO - remove
    const sponsorKp = new SigningKeypair(Keypair.random());
    console.log(`sponsorKp: ${sponsorKp.publicKey}`); // ALEC TODO - remove
    const newKp = new SigningKeypair(Keypair.random());
    console.log(`newKp: ${newKp.publicKey}`); // ALEC TODO - remove
    await axios.get(
      "https://friendbot.stellar.org/?addr=" + sponsorKp.publicKey,
    );
    await axios.get(
      "https://friendbot.stellar.org/?addr=" + txnSourceKp.publicKey,
    );

    const wal = Wallet.TestNet();
    const stellar = wal.stellar();

    const txBuilder = await stellar.transaction({
      sourceAddress: txnSourceKp,
      baseFee: 100,
    });

    const buildingFunction = (builder) => builder.createAccount(newKp, "0");

    const txn = txBuilder
      .sponsoring(txnSourceKp, buildingFunction, newKp)
      .build();
    console.log(txn.toXDR()); // ALEC TODO - remove

    // sponsorKp.sign(txn);
    newKp.sign(txn);
    txnSourceKp.sign(txn);

    const res = await stellar.submitTransaction(txn);
    expect(res).toBe(true);
  }, 30000);

  // ALEC TODO - uncomment
  // it("should sponsor adding trustlines", async () => {
  //   const kp = new SigningKeypair(Keypair.random());
  //   console.log(`kp: ${kp.publicKey}`); // ALEC TODO - remove
  //   const txnSourceKp = new SigningKeypair(Keypair.random());
  //   console.log(`txnSourceKp: ${txnSourceKp.publicKey}`); // ALEC TODO - remove
  //   await axios.get("https://friendbot.stellar.org/?addr=" + kp.publicKey);
  //   await axios.get(
  //     "https://friendbot.stellar.org/?addr=" + txnSourceKp.publicKey,
  //   );

  //   const wal = Wallet.TestNet();
  //   const stellar = wal.stellar();

  //   const txBuilder = await stellar.transaction({
  //     sourceAddress: txnSourceKp,
  //     baseFee: 100,
  //   });

  //   const buildingFunction = (builder) =>
  //     builder.addAssetSupport(
  //       new IssuedAssetId(
  //         "USDC",
  //         "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  //       ),
  //     );

  //   const txn = txBuilder.sponsoring(kp, buildingFunction).build();
  //   console.log(txn.toXDR()); // ALEC TODO - remove

  //   kp.sign(txn);
  //   txnSourceKp.sign(txn);

  //   const res = await stellar.submitTransaction(txn);
  //   expect(res).toBe(true);
  // }, 30000);
});

let wal: Wallet;
let stellar: Stellar;
const kp = SigningKeypair.fromSecret(
  "SAS372GXRG6U7FW6W2PRVELKPOJG2FZZUADCIELWU2U3A45TNWXEQUV5",
);
describe("Stellar", () => {
  beforeAll(async () => {
    wal = Wallet.TestNet();
    stellar = wal.stellar();

    // make sure signing key exists
    try {
      await stellar.server.loadAccount(kp.publicKey);
    } catch (e) {
      await axios.get("https://friendbot.stellar.org/?addr=" + kp.publicKey);
    }
  });
  it("should create and submit a transaction", async () => {
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
        await stellar.server.loadAccount(newKp.publicKey);
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
      .mockReturnValueOnce(Promise.resolve(true));

    const buildingFunction = (builder) =>
      builder.transfer(kp.publicKey, new NativeAssetId(), "2");

    const txn = await stellar.submitWithFeeIncrease({
      sourceAddress: kp,
      timeout: 180,
      baseFeeIncrease: 100,
      buildingFunction,
    });

    expect(txn).toBeTruthy();
    expect(txn.fee).toBe("200");
  });

  it("should create and submit fee-bump transaction", async () => {
    const txBuilder = await stellar.transaction({
      sourceAddress: kp,
      baseFee: 100,
    });
    const newKp = new AccountKeypair(Keypair.random());
    const transaction = txBuilder.createAccount(newKp, 2).build();
    kp.sign(transaction);

    const feeBumpTx = stellar.makeFeeBump({ feeAddress: kp, transaction });
    kp.sign(feeBumpTx);
    await stellar.submitTransaction(feeBumpTx);
  }, 10000);

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
      .mockReturnValueOnce(Promise.resolve(true));

    const signerFunction = (txn) => {
      txn.sign(kp.keypair);
      return txn;
    };

    const buildingFunction = (builder) =>
      builder.transfer(kp.publicKey, new NativeAssetId(), "2");

    const txn = await stellar.submitWithFeeIncrease({
      sourceAddress: kp,
      timeout: 180,
      baseFeeIncrease: 100,
      signerFunction,
      buildingFunction,
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
    let balance = acc.balances.find(
      (b) => (b as Horizon.BalanceLineAsset).asset_code === "USDC",
    );
    expect(balance).toBeTruthy();

    const tx2 = txBuilder.removeAssetSupport(asset).build();
    tx2.sign(kp.keypair);
    await stellar.submitTransaction(tx2);

    acc = await stellar.server.loadAccount(kp.publicKey);
    balance = acc.balances.find(
      (b) => (b as Horizon.BalanceLineAsset).asset_code === "USDC",
    );
    expect(balance).toBeFalsy();
  }, 20000);

  it("should import and sign a transaction from xdr", async () => {
    const txnXdr =
      "AAAAAgAAAACHw+LvUYx5O3Ot8A1SUChfTVk4qxFFJZ5QZ/ktaEUKPwAAAGQACEjuAAABDAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAACHw+LvUYx5O3Ot8A1SUChfTVk4qxFFJZ5QZ/ktaEUKPwAAAAAAAAAAATEtAAAAAAAAAAAA";

    const tx = stellar.decodeTransaction(txnXdr);
    kp.sign(tx);
  });
  it("should transfer withdrawal transaction", async () => {
    const walletTransaction = {
      id: "db15d166-5a5e-4d5c-ba5d-271c32cd8cf0",
      kind: "withdrawal",
      status: TransactionStatus.pending_user_transfer_start,
      amount_in: "50.55",
      withdraw_memo_type: "text",
      withdraw_memo: "the withdraw memo",
      withdraw_anchor_account:
        "GCSGSR6KQQ5BP2FXVPWRL6SWPUSFWLVONLIBJZUKTVQB5FYJFVL6XOXE",
    } as WithdrawTransaction;

    const asset = new IssuedAssetId(
      "USDC",
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );

    const txBuilder = await stellar.transaction({
      sourceAddress: kp,
      baseFee: 100,
    });

    const txn = txBuilder
      .transferWithdrawalTransaction(walletTransaction, asset)
      .build();
    expect(txn).toBeTruthy();
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
