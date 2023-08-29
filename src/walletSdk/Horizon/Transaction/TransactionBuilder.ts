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
import { CommonTransactionBuilder } from "./CommonTransactionBuilder";
import { SponsoringBuilder } from "./SponsoringBuilder";

export class TransactionBuilder extends CommonTransactionBuilder<TransactionBuilder> {
  private cfg: Config;
  private builder: StellarTransactionBuilder;

  constructor(
    cfg: Config,
    sourceAccount: StellarAccount,
    baseFee?: number,
    memo?: Memo,
    timebounds?: Server.Timebounds,
  ) {
    super(sourceAccount.accountId());
    this.builder = new StellarTransactionBuilder(sourceAccount, {
      fee: baseFee ? baseFee.toString() : cfg.stellar.baseFee.toString(),
      timebounds,
      memo,
      networkPassphrase: cfg.stellar.network,
    });
    if (!timebounds) {
      this.builder.setTimeout(cfg.stellar.defaultTimeout);
    }
  }

  sponsoring(
    sponsorAccount: AccountKeypair,
    sponsoredAccount?: AccountKeypair,
  ): SponsoringBuilder {
    return new SponsoringBuilder(
      sponsoredAccount ? sponsoredAccount.publicKey : this.sourceAddress,
      sponsorAccount,
      this.builder,
    );
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
        source: this.sourceAddress,
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

  setMemo(memo: Memo): TransactionBuilder {
    this.builder.addMemo(memo);
    return this;
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

    return this.setMemo(
      new Memo(transaction.withdraw_memo_type, transaction.withdraw_memo),
    ).transfer(
      transaction.withdraw_anchor_account,
      assetId,
      transaction.amount_in,
    );
  }

  build(): Transaction {
    this.operations.forEach((op) => {
      this.builder.addOperation(op);
    });
    return this.builder.build();
  }
}
