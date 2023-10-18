import {
  Account as StellarAccount,
  Server,
  Transaction,
  TransactionBuilder as StellarTransactionBuilder,
  FeeBumpTransaction,
} from "stellar-sdk";

import { Config } from "walletSdk";
import { AccountService } from "./AccountService";
import { TransactionBuilder } from "./Transaction/TransactionBuilder";
import {
  TransactionParams,
  SubmitWithFeeIncreaseParams,
  FeeBumpTransactionParams,
} from "../Types";
import {
  AccountDoesNotExistError,
  TransactionSubmitFailedError,
  TransactionSubmitWithFeeIncreaseFailedError,
  SignerRequiredError,
} from "../Exceptions";
import { getResultCode } from "../Utils/getResultCode";
import { SigningKeypair } from "./Account";

/**
 * Interaction with the Stellar Network.
 * Do not create this object directly, use the Wallet class.
 * @class
 */
export class Stellar {
  private cfg: Config;
  server: Server;

  /**
   * Creates a new instance of the Stellar class.
   * @constructor
   * @param {Config} cfg - Configuration object.
   */
  constructor(cfg: Config) {
    this.cfg = cfg;
    this.server = cfg.stellar.server;
  }

  /**
   * Returns an AccountService instance for managing Stellar accounts.
   * @returns {AccountService} An AccountService instance.
   */
  account(): AccountService {
    return new AccountService(this.cfg);
  }

  /**
   * Construct a Stellar transaction.
   * @param {TransactionParams} params - The Transaction params.
   * @param {AccountKeypair} params.sourceAddress - The source account keypair.
   * @param {Server.Timebounds | number} [params.timebounds] - The timebounds for the transaction.
   * If a number is given, then timebounds constructed from now to now + number in seconds.
   * @param {number} [params.baseFee] - The base fee for the transaction. Defaults to the config base fee.
   * @param {Memo} [params.memo] - The memo for the transaction.
   * @returns {TransactionBuilder} A TransactionBuilder instance.
   * @throws {AccountDoesNotExistError} If the source account does not exist.
   */
  async transaction({
    sourceAddress,
    baseFee,
    memo,
    timebounds,
  }: TransactionParams): Promise<TransactionBuilder> {
    let sourceAccount: StellarAccount;
    try {
      sourceAccount = await this.cfg.stellar.server.loadAccount(
        sourceAddress.publicKey,
      );
    } catch (e) {
      throw new AccountDoesNotExistError(this.cfg.stellar.network);
    }

    let formattedTimebounds: Server.Timebounds | undefined;
    if (typeof timebounds === "number") {
      formattedTimebounds = {
        minTime: 0,
        maxTime: Math.floor(Date.now() / 1000) + timebounds,
      };
    } else {
      formattedTimebounds = timebounds;
    }

    return new TransactionBuilder(
      this.cfg,
      sourceAccount,
      baseFee,
      memo,
      formattedTimebounds,
    );
  }

  /**
   * Creates a FeeBumpTransaction instance for increasing the fee of an existing transaction.
   * @param {FeeBumpTransactionParams} params - The Fee Bump Transaction params.
   * @param {AccountKeypair} params.feeAddress - The account that will pay for the transaction's fee.
   * @param {Transaction} params.transaction - The transaction to be fee bumped.
   * @param {number} [params.baseFee] - The base fee (stroops) for the fee bump transaction. Defaults to the config base fee.
   * @returns {FeeBumpTransaction} A FeeBumpTransaction instance.
   */
  makeFeeBump({
    feeAddress,
    transaction,
    baseFee,
  }: FeeBumpTransactionParams): FeeBumpTransaction {
    return StellarTransactionBuilder.buildFeeBumpTransaction(
      feeAddress.keypair,
      (baseFee || this.cfg.stellar.baseFee).toString(),
      transaction,
      transaction.networkPassphrase,
    );
  }

  /**
   * Submits a signed transaction to the server. If the submission fails with status
   * 504 indicating a timeout error, it will automatically retry.
   * @param {Transaction|FeeBumpTransaction} signedTransaction - The signed transaction to submit.
   * @returns {boolean} `true` if the transaction was successfully submitted.
   * @throws {TransactionSubmitFailedError} If the transaction submission fails.
   */
  async submitTransaction(
    signedTransaction: Transaction | FeeBumpTransaction,
  ): Promise<boolean> {
    try {
      const response = await this.server.submitTransaction(signedTransaction);
      if (!response.successful) {
        throw new TransactionSubmitFailedError(response);
      }
      return true;
    } catch (e) {
      if (e.response.status === 504) {
        // in case of 504, keep retrying this tx until submission succeeds or we get a different error
        // https://developers.stellar.org/api/errors/http-status-codes/horizon-specific/timeout
        // https://developers.stellar.org/docs/encyclopedia/error-handling#timeouts
        return await this.submitTransaction(signedTransaction);
      }
      throw e;
    }
  }

  /**
   * Submits a signed transaction. If the submission fails with error code: tx_too_late,
   * then resubmit with an increased base fee.
   * @see {@link https://developers.stellar.org/docs/encyclopedia/error-handling#retrying-until-success-strategy}
   * for more info on this strategy.
   * @param {SubmitWithFeeIncreaseParams} params - The SubmitWithFeeIncrease params.
   * @param {AccountKeypair} params.sourceAddress - The source account keypair.
   * @param {number} params.timeout - The number of seconds from now the transaction is allowed to be submitted.
   * @param {number} params.baseFeeIncrease - The amount to increase base fee (in stroops) if submission fails.
   * @param {(builder: TransactionBuilder) => TransactionBuilder} params.buildingFunction - Function for building the
   * operations of the transactions.
   * @param {(builder: TransactionBuilder) => TransactionBuilder} [params.signerFunction] - Function for signing the transaction.
   * If not given, will use the soure keypair to sign.
   * @param {number} [params.baseFee] - The base fee (stroops) of the transaction.
   * @param {Memo} [params.memo] - The memo of the transaction.
   * @param {number} [params.maxFee] - The max fee allowed (stroops) of the transaction, afterward will stop submitting and throw error.
   * @returns {Transaction} The submitted transaction.
   * @throws {TransactionSubmitWithFeeIncreaseFailedError} If the transaction submission with fee increase fails.
   */
  async submitWithFeeIncrease({
    sourceAddress,
    timeout,
    baseFeeIncrease,
    buildingFunction,
    signerFunction,
    baseFee,
    memo,
    maxFee,
  }: SubmitWithFeeIncreaseParams): Promise<Transaction> {
    let builder = await this.transaction({
      sourceAddress,
      timebounds: timeout,
      baseFee,
      memo,
    });

    builder = buildingFunction(builder);

    let transaction = builder.build();
    if (signerFunction) {
      transaction = signerFunction(transaction);
    } else if (sourceAddress instanceof SigningKeypair) {
      transaction.sign(sourceAddress.keypair);
    } else {
      throw new SignerRequiredError();
    }

    try {
      await this.submitTransaction(transaction);
      return transaction;
    } catch (e) {
      const resultCode = getResultCode(e);
      if (resultCode === "tx_too_late") {
        const newFee = parseInt(transaction.fee) + baseFeeIncrease;

        if (maxFee && newFee > maxFee) {
          throw new TransactionSubmitWithFeeIncreaseFailedError(maxFee, e);
        }

        return this.submitWithFeeIncrease({
          sourceAddress,
          timeout,
          baseFeeIncrease,
          buildingFunction,
          signerFunction,
          baseFee: newFee,
          memo,
        });
      }
      throw e;
    }
  }

  /**
   * Decodes a Stellar transaction from xdr.
   * @param {string} xdr - The XDR representation of the transaction.
   * @returns {Transaction|FeeBumpTransaction} The decoded transaction.
   */
  decodeTransaction(xdr: string): Transaction | FeeBumpTransaction {
    return StellarTransactionBuilder.fromXDR(xdr, this.cfg.stellar.network);
  }
}
