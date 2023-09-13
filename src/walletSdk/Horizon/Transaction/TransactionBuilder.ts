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
    super(sourceAccount.accountId(), []);
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
    buildingFunction: (SponsoringBuilder) => SponsoringBuilder,
    sponsoredAccount?: AccountKeypair,
  ): TransactionBuilder {
    new SponsoringBuilder(
      sponsoredAccount ? sponsoredAccount.publicKey : this.sourceAddress,
      sponsorAccount,
      this.operations,
      buildingFunction,
    );
    return this;
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

  /**
   * Creates and adds a path payment operation to the transaction builder.
   *
   * @param {string} destinationAddress - The destination Stellar address to which the payment is sent.
   * @param {StellarAssetId} sendAsset - The asset to be sent.
   * @param {StellarAssetId} destAsset - The asset the destination will receive.
   * @param {string} amount - The amount to be sent as a string.
   * @param {string} [destMin] - The minimum amount of the destination asset to be receive. This is a
   * protective measure, it allows you to specify a lower bound for an  acceptable conversion.
   * (optional, default is ".0000001").
   *
   * @returns {TransactionBuilder} - Returns the current TransactionBuilder instance for method chaining.
   */
  pathPay(
    destinationAddress: string,
    sendAsset: StellarAssetId,
    destAsset: StellarAssetId,
    amount: string,
    destMin?: string,
  ): TransactionBuilder {
    this.operations.push(
      StellarSdk.Operation.pathPaymentStrictSend({
        destination: destinationAddress,
        sendAsset: sendAsset.toAsset(),
        sendAmount: amount,
        destAsset: destAsset.toAsset(),
        destMin: destMin || ".0000001",
      }),
    );
    return this;
  }

  swap(
    fromAsset: StellarAssetId,
    toAsset: StellarAssetId,
    amount: string,
    destMin?: string,
  ): TransactionBuilder {
    this.pathPay(this.sourceAddress, fromAsset, toAsset, amount, destMin);
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
