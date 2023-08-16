import {
  Account as StellarAccount,
  Server,
  Transaction,
  TransactionBuilder as StellarTransactionBuilder,
  FeeBumpTransaction,
} from "stellar-sdk";

import { Config } from "walletSdk";
import { AccountService } from "./AccountService";
import { TransactionBuilder } from "./transaction/TransactionBuilder";
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

// Do not create this object directly, use the Wallet class.
export class Stellar {
  private cfg: Config;
  server: Server;

  constructor(cfg: Config) {
    this.cfg = cfg;
    this.server = cfg.stellar.server;
  }

  account(): AccountService {
    return new AccountService(this.cfg);
  }

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
      const success = await this.submitTransaction(transaction);
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

  decodeTransaction(xdr: string): Transaction | FeeBumpTransaction {
    return StellarTransactionBuilder.fromXDR(xdr, this.cfg.stellar.network);
  }
}
