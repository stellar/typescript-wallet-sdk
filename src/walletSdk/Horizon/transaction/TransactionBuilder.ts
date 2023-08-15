import StellarSdk, {
  TransactionBuilder as StellarTransactionBuilder,
  Account as StellarAccount,
  Transaction,
  Server,
  Memo,
  xdr,
  Networks,
} from "stellar-sdk";

import { Config } from "walletSdk";
import { AccountKeypair } from "../Account";
import {
  InsufficientStartingBalanceError,
  WithdrawalTxMissingMemoError,
  WithdrawalTxNotPendingUserTransferStartError,
} from "../../Exceptions";
import { IssuedAssetId, StellarAssetId } from "../../Asset";
import { WithdrawTransaction, TransactionStatus } from "../../Types";

export class TransactionBuilder {
  private network: Networks;
  private operations: Array<xdr.Operation>;
  private builder: StellarTransactionBuilder;

  sourceAccount: string;

  constructor(
    cfg: Config,
    sourceAccount: StellarAccount,
    baseFee?: number,
    memo?: Memo,
    timebounds?: Server.Timebounds,
  ) {
    this.network = cfg.stellar.network;
    this.operations = [];
    this.builder = new StellarTransactionBuilder(sourceAccount, {
      fee: baseFee ? baseFee.toString() : cfg.stellar.baseFee.toString(),
      timebounds,
      memo,
      networkPassphrase: cfg.stellar.network,
    });
    if (!timebounds) {
      this.builder.setTimeout(cfg.stellar.defaultTimeout);
    }

    this.sourceAccount = sourceAccount.accountId();
  }

  createAccount(
    newAccount: AccountKeypair,
    startingBalance: number = 1,
  ): TransactionBuilder {
    if (startingBalance < 1) {
      throw new InsufficientStartingBalanceError();
    }

    this.operations.push(
      StellarSdk.Operation.createAccount({
        destination: newAccount.publicKey,
        startingBalance: startingBalance.toString(),
        source: this.sourceAccount,
      }),
    );
    return this;
  }

  transfer(
    destinationAddress: string,
    assetId: StellarAssetId,
    amount: string,
  ): TransactionBuilder {
    this.operations.push(
      StellarSdk.Operation.payment({
        destination: destinationAddress,
        asset: assetId.toAsset(),
        amount,
      }),
    );
    return this;
  }

  addOperation(op: xdr.Operation): TransactionBuilder {
    this.builder.addOperation(op);
    return this;
  }

  addMemo(memo: Memo): TransactionBuilder {
    this.builder.addMemo(memo);
    return this;
  }

  addAssetSupport(
    asset: IssuedAssetId,
    trustLimit?: string,
  ): TransactionBuilder {
    this.operations.push(
      StellarSdk.Operation.changeTrust({
        asset: asset.toAsset(),
        limit: trustLimit,
        source: this.sourceAccount,
      }),
    );
    return this;
  }

  removeAssetSupport(asset: IssuedAssetId): TransactionBuilder {
    return this.addAssetSupport(asset, "0");
  }

  build(): Transaction {
    this.operations.forEach((op) => {
      this.builder.addOperation(op);
    });
    return this.builder.build();
  }

  transferWithdrawalTransaction(
    transaction: WithdrawTransaction,
    assetId: StellarAssetId,
  ): TransactionBuilder {
    if (transaction.status !== TransactionStatus.pending_user_transfer_start) {
      throw new WithdrawalTxNotPendingUserTransferStartError(
        transaction.status,
      );
    }

    if (!(transaction.withdraw_memo_type && transaction.withdraw_memo)) {
      throw new WithdrawalTxMissingMemoError();
    }

    return this.addMemo(
      new Memo(transaction.withdraw_memo_type, transaction.withdraw_memo),
    ).transfer(
      transaction.withdraw_anchor_account,
      assetId,
      transaction.amount_in,
    );
  }
}
