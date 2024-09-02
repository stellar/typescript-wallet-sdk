import { Keypair, Memo, MemoText, Horizon } from "@stellar/stellar-sdk";
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
  Assets,
} from "../src/walletSdk/Asset";
import { TransactionStatus, WithdrawTransaction } from "../src/walletSdk/Types";
import {
  WithdrawalTxMissingDestinationError,
  WithdrawalTxMissingMemoError,
  WithdrawalTxNotPendingUserTransferStartError,
} from "../src/walletSdk/Exceptions";

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
      await stellar.fundTestnetAccount(kp.publicKey);
    }
  }, 10000);

  it("should create and submit a transaction", async () => {
    const now = Math.floor(Date.now() / 1000) - 5;

    const txBuilderParams = [
      {
        sourceAddress: kp,
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
      (b) => (b as Horizon.HorizonApi.BalanceLineAsset).asset_code === "USDC",
    );
    expect(balance).toBeTruthy();

    const tx2 = txBuilder.removeAssetSupport(asset).build();
    tx2.sign(kp.keypair);
    await stellar.submitTransaction(tx2);

    acc = await stellar.server.loadAccount(kp.publicKey);
    balance = acc.balances.find(
      (b) => (b as Horizon.HorizonApi.BalanceLineAsset).asset_code === "USDC",
    );
    expect(balance).toBeFalsy();
  }, 20000);

  it("should import and sign a transaction from xdr", () => {
    const txnXdr =
      "AAAAAgAAAACHw+LvUYx5O3Ot8A1SUChfTVk4qxFFJZ5QZ/ktaEUKPwAAAGQACEjuAAABDAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAACHw+LvUYx5O3Ot8A1SUChfTVk4qxFFJZ5QZ/ktaEUKPwAAAAAAAAAAATEtAAAAAAAAAAAA";

    const tx = stellar.decodeTransaction(txnXdr);
    kp.sign(tx);
  });

  it("should return recommended fee", async () => {
    const fee = await stellar.getRecommendedFee();
    expect(fee).toBeTruthy();
  });

  describe("TransactionBuilder/transferWithdrawalTransaction", () => {
    it("should transfer withdrawal transaction", async () => {
      const memoExamples = [
        {
          type: "text",
          value: "example text",
        },
        {
          type: "id",
          value: "12345",
        },
        {
          type: "hash",
          value: "AAAAAAAAAAAAAAAAAAAAAMAP+8deo0TViBD09TfOBY0=",
        },
        {
          type: "hash",
          value: "MV9b23bQeMQ7isAGTkoBZGErH853yGk0W/yUx1iU7dM=",
        },
      ];

      for (const memoExample of memoExamples) {
        const walletTransaction = {
          id: "db15d166-5a5e-4d5c-ba5d-271c32cd8cf0",
          kind: "withdrawal",
          status: TransactionStatus.pending_user_transfer_start,
          amount_in: "50.55",
          withdraw_memo_type: memoExample.type,
          withdraw_memo: memoExample.value,
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
      }
    }, 20000);

    it("should throw if tx not in pending_user_transfer_start status", async () => {
      const walletTransaction = {
        id: "db15d166-5a5e-4d5c-ba5d-271c32cd8cf0",
        kind: "withdrawal",
        status: TransactionStatus.pending_anchor,
        amount_in: "50.55",
        withdraw_memo_type: "text",
        withdraw_memo: "example text",
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

      expect(() => {
        txBuilder
          .transferWithdrawalTransaction(walletTransaction, asset)
          .build();
      }).toThrowError(WithdrawalTxNotPendingUserTransferStartError);
    }, 5000);

    it("should throw if tx is missing withdraw_anchor_account", async () => {
      const walletTransaction = {
        id: "db15d166-5a5e-4d5c-ba5d-271c32cd8cf0",
        kind: "withdrawal",
        status: TransactionStatus.pending_user_transfer_start,
        amount_in: "50.55",
        withdraw_memo_type: "text",
        withdraw_memo: "example text",
        withdraw_anchor_account: null,
      } as WithdrawTransaction;

      const asset = new IssuedAssetId(
        "USDC",
        "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      );

      const txBuilder = await stellar.transaction({
        sourceAddress: kp,
        baseFee: 100,
      });

      expect(() => {
        txBuilder
          .transferWithdrawalTransaction(walletTransaction, asset)
          .build();
      }).toThrowError(WithdrawalTxMissingDestinationError);
    }, 5000);

    it("should throw if tx is missing withdraw_memo_type", async () => {
      const walletTransaction = {
        id: "db15d166-5a5e-4d5c-ba5d-271c32cd8cf0",
        kind: "withdrawal",
        status: TransactionStatus.pending_user_transfer_start,
        amount_in: "50.55",
        withdraw_memo_type: null,
        withdraw_memo: "example text",
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

      expect(() => {
        txBuilder
          .transferWithdrawalTransaction(walletTransaction, asset)
          .build();
      }).toThrowError(WithdrawalTxMissingMemoError);
    }, 5000);

    it("should throw if tx is missing withdraw_memo", async () => {
      const walletTransaction = {
        id: "db15d166-5a5e-4d5c-ba5d-271c32cd8cf0",
        kind: "withdrawal",
        status: TransactionStatus.pending_user_transfer_start,
        amount_in: "50.55",
        withdraw_memo_type: "text",
        withdraw_memo: null,
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

      expect(() => {
        txBuilder
          .transferWithdrawalTransaction(walletTransaction, asset)
          .build();
      }).toThrowError(WithdrawalTxMissingMemoError);
    }, 5000);
  });
});

let txnSourceKp;
let sponsorKp;
let newKp;
describe("SponsoringBuilder", () => {
  beforeAll(async () => {
    wal = Wallet.TestNet();
    stellar = wal.stellar();

    txnSourceKp = new SigningKeypair(Keypair.random());
    sponsorKp = new SigningKeypair(Keypair.random());
    newKp = new SigningKeypair(Keypair.random());
    await axios.get(
      "https://friendbot.stellar.org/?addr=" + sponsorKp.publicKey,
    );
    await axios.get(
      "https://friendbot.stellar.org/?addr=" + txnSourceKp.publicKey,
    );
  }, 15000);

  it("should sponsor creating an account", async () => {
    const wal = Wallet.TestNet();
    const stellar = wal.stellar();

    const txBuilder = await stellar.transaction({
      sourceAddress: txnSourceKp,
      baseFee: 100,
    });
    const buildingFunction = (bldr) => bldr.createAccount(newKp, 0);
    // scenario of different txn source account from sponsor account
    const txn = txBuilder
      .sponsoring(sponsorKp, buildingFunction, newKp)
      .build();
    newKp.sign(txn);
    txnSourceKp.sign(txn);
    sponsorKp.sign(txn);

    const res = await stellar.submitTransaction(txn);
    expect(res).toBe(true);

    const sponsoredLoaded = (await stellar.server.loadAccount(
      newKp.publicKey,
    )) as any;
    expect(sponsoredLoaded.num_sponsored).toBe(2);
  }, 15000);

  it("should sponsor adding trustlines", async () => {
    const txBuilder = await stellar.transaction({
      sourceAddress: txnSourceKp,
      baseFee: 100,
    });
    const buildingFunction = (bldr) =>
      bldr.addAssetSupport(
        new IssuedAssetId(
          "USDC",
          "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        ),
      );
    const txn = txBuilder.sponsoring(sponsorKp, buildingFunction).build();
    sponsorKp.sign(txn);
    txnSourceKp.sign(txn);

    const res = await stellar.submitTransaction(txn);
    expect(res).toBe(true);

    const sponsorLoaded = (await stellar.server.loadAccount(
      sponsorKp.publicKey,
    )) as any;
    expect(sponsorLoaded.num_sponsoring).toBe(3);
  }, 15000);

  it("should allow sponsoring and regular operations in same transaction", async () => {
    const txBuilder = await stellar.transaction({
      sourceAddress: txnSourceKp,
      baseFee: 100,
    });
    const buildingFunction = (bldr) =>
      bldr.addAssetSupport(
        new IssuedAssetId(
          "USDC",
          "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        ),
      );
    const txn = txBuilder
      .sponsoring(sponsorKp, buildingFunction)
      .transfer(sponsorKp.publicKey, new NativeAssetId(), "5")
      .build();
    sponsorKp.sign(txn);
    txnSourceKp.sign(txn);

    const res = await stellar.submitTransaction(txn);
    expect(res).toBe(true);

    const sponsorLoaded = (await stellar.server.loadAccount(
      sponsorKp.publicKey,
    )) as any;
    expect(sponsorLoaded.num_sponsoring).toBe(3);
  }, 15000);
  it("should sponsor account modification", async () => {
    const txBuilder = await stellar.transaction({
      sourceAddress: txnSourceKp,
      baseFee: 100,
    });
    const otherKp = new SigningKeypair(Keypair.random());

    const txn = txBuilder
      .sponsoring(sponsorKp, (bldr) => bldr.addAccountSigner(otherKp, 2))
      .build();
    sponsorKp.sign(txn);
    txnSourceKp.sign(txn);

    await stellar.submitTransaction(txn);
    const sourceLoaded = (await stellar.server.loadAccount(
      txnSourceKp.publicKey,
    )) as any;
    expect(
      sourceLoaded.signers.find((signer) => signer.key === otherKp.publicKey)
        .weight,
    ).toBe(2);
  }, 15000);
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
  it("should use premade constants", () => {
    let issued = Assets.Main.USDC;
    expect(issued.sep38).toBe(
      "stellar:USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    );

    issued = Assets.Test.USDC;
    expect(issued.sep38).toBe(
      "stellar:USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );
  });
});

describe("Account Modifying", () => {
  it("should modify account ", async () => {
    const wallet = Wallet.TestNet();
    const stellar = wallet.stellar();

    const sourceKp = new SigningKeypair(Keypair.random());
    const otherKp = new SigningKeypair(Keypair.random());
    await axios.get(
      "https://friendbot.stellar.org/?addr=" + sourceKp.publicKey,
    );
    await axios.get("https://friendbot.stellar.org/?addr=" + otherKp.publicKey);

    // Add account signer
    let txBuilder = await stellar.transaction({
      sourceAddress: sourceKp,
      baseFee: 1000,
    });
    const tx = txBuilder.addAccountSigner(otherKp, 1).build();
    tx.sign(sourceKp.keypair);
    await stellar.submitTransaction(tx);

    let resp = await stellar.server.loadAccount(sourceKp.publicKey);

    expect(
      resp.signers.find((signer) => signer.key === sourceKp.publicKey),
    ).toBeTruthy();
    expect(
      resp.signers.find((signer) => signer.key === otherKp.publicKey),
    ).toBeTruthy();

    // Remove account signer
    txBuilder = await stellar.transaction({
      sourceAddress: sourceKp,
      baseFee: 1000,
    });
    const removeTx = txBuilder.removeAccountSigner(otherKp).build();
    removeTx.sign(sourceKp.keypair);
    await stellar.submitTransaction(removeTx);

    resp = await stellar.server.loadAccount(sourceKp.publicKey);
    expect(
      resp.signers.find((signer) => signer.key === sourceKp.publicKey),
    ).toBeTruthy();
    expect(
      resp.signers.find((signer) => signer.key === otherKp.publicKey),
    ).toBeFalsy();

    // Change account thresholds
    txBuilder = await stellar.transaction({
      sourceAddress: sourceKp,
      baseFee: 1000,
    });
    const thresholdTx = txBuilder.setThreshold({ low: 0, high: 1 }).build();
    thresholdTx.sign(sourceKp.keypair);
    await stellar.submitTransaction(thresholdTx);

    resp = await stellar.server.loadAccount(sourceKp.publicKey);
    expect(resp.thresholds).toEqual({
      low_threshold: 0,
      med_threshold: 0,
      high_threshold: 1,
    });

    // Lock master account
    txBuilder = await stellar.transaction({
      sourceAddress: sourceKp,
      baseFee: 1000,
    });
    const lockTx = txBuilder.lockAccountMasterKey().build();
    lockTx.sign(sourceKp.keypair);
    await stellar.submitTransaction(lockTx);

    resp = await stellar.server.loadAccount(sourceKp.publicKey);
    expect(resp.signers[0].weight).toBe(0);
  }, 45000);

  it("should merge account", async () => {
    const wallet = Wallet.TestNet();
    const stellar = wallet.stellar();
    const account = wallet.stellar().account();

    const accountKp = account.createKeypair();
    const sourceKp = account.createKeypair();
    await stellar.fundTestnetAccount(accountKp.publicKey);
    await stellar.fundTestnetAccount(sourceKp.publicKey);

    const txBuilder = await stellar.transaction({
      sourceAddress: accountKp,
      baseFee: 1000,
    });
    const mergeTxn = txBuilder
      .accountMerge(accountKp.publicKey, sourceKp.publicKey)
      .build();
    mergeTxn.sign(accountKp.keypair);
    mergeTxn.sign(sourceKp.keypair);
    await stellar.submitTransaction(mergeTxn);

    let found;
    try {
      const accResp = await stellar.server.loadAccount(sourceKp.publicKey);
      if (accResp) {
        found = true;
      }
    } catch (e) {
      found = false;
    }
    expect(found).toBeFalsy();
    const accResp = await stellar.server.loadAccount(accountKp.publicKey);
    expect(parseInt(accResp.balances[0].balance)).toBeGreaterThan(19998);
  }, 30000);
});
