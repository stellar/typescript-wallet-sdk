import {
  Operation,
  TransactionBuilder as StellarTransactionBuilder,
  Account as StellarAccount,
  Transaction,
  Horizon,
  Memo,
  xdr,
} from "@stellar/stellar-sdk";

import { Config } from "walletSdk";
import { AccountKeypair } from "../Account";
import {
  InsufficientStartingBalanceError,
  WithdrawalTxMissingMemoError,
  WithdrawalTxNotPendingUserTransferStartError,
  WithdrawalTxMemoError,
} from "../../Exceptions";
import { StellarAssetId } from "../../Asset";
import {
  WithdrawTransaction,
  TransactionStatus,
  PathPayParams,
} from "../../Types";
import { PathPayOnlyOneAmountError } from "../../Exceptions";
import { CommonTransactionBuilder } from "./CommonTransactionBuilder";
import { SponsoringBuilder } from "./SponsoringBuilder";

/**
 * Used for building transactions.
 * Do not create this object directly, use the Stellar class to create a transaction.
 * @class
 */
export class TransactionBuilder extends CommonTransactionBuilder<TransactionBuilder> {
  private cfg: Config;
  private builder: StellarTransactionBuilder;

  /**
   * Creates a new instance of the TransactionBuilder class for constructing Stellar transactions.
   * @constructor
   * @param {Config} cfg - Configuration object for Stellar operations.
   * @param {StellarAccount} sourceAccount - The source account for the transaction.
   * @param {number} [baseFee] - The base fee for the transaction. If not given will use the config base fee.
   * @param {Memo} [memo] - The memo for the transaction.
   * @param {Horizon.Server.Timebounds} [timebounds] - The timebounds for the transaction. If not given will use the config timebounds.
   */
  constructor(
    cfg: Config,
    sourceAccount: StellarAccount,
    baseFee?: number,
    memo?: Memo,
    timebounds?: Horizon.Server.Timebounds,
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

  /**
   * Sponsoring a transaction.
   * @param {AccountKeypair} sponsorAccount - The account doing the sponsoring.
   * @param {(builder: SponsoringBuilder) => SponsoringBuilder} buildingFunction - Function for creating the
   * operations that will be sponsored.
   * @see {@link ./SponsoringBuilder.ts} or {@link ./CommonTransactionBuilder.ts} for operations that can be sponsored.
   * @param {AccountKeypair} [sponsoredAccount] - The account that will be sponsored.
   * @returns {TransactionBuilder} The transaction builder to build the transaction before submitting.
   */
  sponsoring(
    sponsorAccount: AccountKeypair,
    buildingFunction: (builder: SponsoringBuilder) => SponsoringBuilder,
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

  /**
   * Creates a Stellar account.
   * @param {AccountKeypair} newAccount - The new account's keypair.
   * @param {number} [startingBalance=1] - The starting balance for the new account (default is 1 XLM).
   * @throws {InsufficientStartingBalanceError} If the starting balance is less than 1.
   * @returns {TransactionBuilder} The TransactionBuilder instance.
   */
  createAccount(
    newAccount: AccountKeypair,
    startingBalance: number = 1,
  ): TransactionBuilder {
    if (startingBalance < 1) {
      throw new InsufficientStartingBalanceError();
    }

    this.operations.push(
      Operation.createAccount({
        destination: newAccount.publicKey,
        startingBalance: startingBalance.toString(),
        source: this.sourceAddress,
      }),
    );
    return this;
  }

  /**
   * Adds a payment operation to transfer an amount of an asset to a destination address.
   * @param {string} destinationAddress - The destination account's public key.
   * @param {StellarAssetId} assetId - The asset to transfer.
   * @param {string} amount - The amount to transfer.
   * @returns {TransactionBuilder} The TransactionBuilder instance.
   */
  transfer(
    destinationAddress: string,
    assetId: StellarAssetId,
    amount: string,
  ): TransactionBuilder {
    this.operations.push(
      Operation.payment({
        destination: destinationAddress,
        asset: assetId.toAsset(),
        amount,
      }),
    );
    return this;
  }

  /**
   * Creates and adds a path payment operation to the transaction builder.
   * @param {PathPayParams} params - The path payment parameters.
   * @param {string} params.destinationAddress - The destination Stellar address to which the payment is sent.
   * @param {StellarAssetId} params.sendAsset - The asset to be sent.
   * @param {StellarAssetId} params.destAsset - The asset the destination will receive.
   * @param {string} [params.sendAmount] - The amount to be sent. Must specify either sendAmount or destAmount,
   * but not both.
   * @param {string} [params.destAmount] - The amount to be received by the destination. Must specify either sendAmount or destAmount,
   * but not both.
   * @param {string} [params.destMin] - The minimum amount of the destination asset to be receive. This is a
   * protective measure, it allows you to specify a lower bound for an acceptable conversion. Only used
   * if using sendAmount.
   * (optional, default is ".0000001").
   * @param {string} [params.sendMax] - The maximum amount of the destination asset to be sent. This is a
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
        Operation.pathPaymentStrictSend({
          destination: destinationAddress,
          sendAsset: sendAsset.toAsset(),
          sendAmount,
          destAsset: destAsset.toAsset(),
          destMin: destMin || ".0000001",
        }),
      );
    } else {
      this.operations.push(
        Operation.pathPaymentStrictReceive({
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
   * @param {StellarAssetId} fromAsset - The source asset to be sent.
   * @param {StellarAssetId} toAsset - The destination asset to receive.
   * @param {string} amount - The amount of the source asset to be sent.
   * @param {string} [destMin] - (Optional) The minimum amount of the destination asset to be received.
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

  /**
   * Adds an operation to the transaction.
   * @param {xdr.Operation} op - The operation to add.
   * @returns {TransactionBuilder} The TransactionBuilder instance.
   */
  addOperation(op: xdr.Operation): TransactionBuilder {
    this.builder.addOperation(op);
    return this;
  }

  /**
   * Add a memo for the transaction.
   * @param {Memo} memo - The memo to add to the transaction.
   * @returns {TransactionBuilder} The TransactionBuilder instance.
   */
  setMemo(memo: Memo): TransactionBuilder {
    this.builder.addMemo(memo);
    return this;
  }

  /**
   * Add a transfer operation to the builder from a sep-24 withdrawal transaction.
   * @param {WithdrawTransaction} transaction - The withdrawal transaction.
   * @param {StellarAssetId} assetId - The asset ID to transfer.
   * @throws {WithdrawalTxNotPendingUserTransferStartError} If the withdrawal transaction status is not pending_user_transfer_start.
   * @throws {WithdrawalTxMissingMemoError} If the withdrawal transaction is missing a memo.
   * @throws {WithdrawalTxMemoError} If there is an issue with the withdrawal transaction memo.
   * @returns {TransactionBuilder} The TransactionBuilder instance.
   */
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

    if (transaction.withdraw_memo_type === "hash") {
      try {
        const buffer = Buffer.from(transaction.withdraw_memo, "base64");
        const memo = Memo.hash(buffer.toString("hex"));
        this.setMemo(memo);
      } catch {
        throw new WithdrawalTxMemoError();
      }
    } else {
      this.setMemo(
        new Memo(transaction.withdraw_memo_type, transaction.withdraw_memo),
      );
    }

    return this.transfer(
      transaction.withdraw_anchor_account,
      assetId,
      transaction.amount_in,
    );
  }

  /**
   * Merges account into a destination account.
   * **Warning**: This operation will give full control of the account to the destination account,
   * effectively removing the merged account from the network.
   * @param {string} destination - The stellar account merging into.
   * @param {string} [source] - Account that is being merged. If not given then will default to
   * the TransactionBuilder source account.
   * @returns {TransactionBuilder} The TransactionBuilder instance.
   */
  accountMerge(destination: string, source?: string): TransactionBuilder {
    this.operations.push(Operation.accountMerge({ destination, source }));
    return this;
  }

  /**
   * Builds the Stellar transaction so can be submitted.
   * @returns {Transaction} The built Stellar transaction.
   */
  build(): Transaction {
    this.operations.forEach((op) => {
      this.builder.addOperation(op);
    });
    return this.builder.build();
  }
}
