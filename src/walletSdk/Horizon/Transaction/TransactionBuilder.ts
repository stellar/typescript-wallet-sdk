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
import {
  WithdrawTransaction,
  TransactionStatus,
  PathPayParams,
} from "../../Types";
import { PathPayOnlyOneAmountError } from "../../Exceptions";
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
   * @param {string} [sendAmount] - The amount to be sent. Must specify either sendAmount or destAmount,
   * but not both.
   * @param {string} [destAmount] - The amount to be received by the destination. Must specify either sendAmount or destAmount,
   * but not both.
   * @param {string} [destMin] - The minimum amount of the destination asset to be receive. This is a
   * protective measure, it allows you to specify a lower bound for an acceptable conversion. Only used
   * if using sendAmount.
   * (optional, default is ".0000001").
   * @param {string} [sendMax] - The maximum amount of the destination asset to be sent. This is a
   * protective measure, it allows you to specify an upper bound for an acceptable conversion. Only used
   * if using destAmount.
   * (optional, default is int64 max).
   *
   * @returns {TransactionBuilder} - Returns the current TransactionBuilder instance for method chaining.
   */
  pathPay({
    destinationAddress,
    sendAsset,
    destAsset,
    sendAmount,
    destAmount,
    destMin,
    sendMax,
  }: PathPayParams): TransactionBuilder {
    if ((sendAmount && destAmount) || (!sendAmount && !destAmount)) {
      throw new PathPayOnlyOneAmountError();
    }
    if (sendAmount) {
      this.operations.push(
        StellarSdk.Operation.pathPaymentStrictSend({
          destination: destinationAddress,
          sendAsset: sendAsset.toAsset(),
          sendAmount,
          destAsset: destAsset.toAsset(),
          destMin: destMin || ".0000001",
        }),
      );
    } else {
      this.operations.push(
        StellarSdk.Operation.pathPaymentStrictReceive({
          destination: destinationAddress,
          sendAsset: sendAsset.toAsset(),
          destAmount,
          destAsset: destAsset.toAsset(),
          sendMax: sendMax || "922337203685.4775807",
        }),
      );
    }

    return this;
  }

  /**
   * Swap assets using the Stellar network. This swaps using the
   * pathPaymentStrictReceive operation.
   *
   * @param {StellarAssetId} fromAsset - The source asset to be sent.
   * @param {StellarAssetId} toAsset - The destination asset to receive.
   * @param {string} amount - The amount of the source asset to be sent.
   * @param {string} [destMin] - (Optional) The minimum amount of the destination asset to be received.
   *
   * @returns {TransactionBuilder} Returns the current instance of the TransactionBuilder for method chaining.
   */
  swap(
    fromAsset: StellarAssetId,
    toAsset: StellarAssetId,
    amount: string,
    destMin?: string,
  ): TransactionBuilder {
    this.pathPay({
      destinationAddress: this.sourceAddress,
      sendAsset: fromAsset,
      destAsset: toAsset,
      sendAmount: amount,
      destMin,
    });
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
