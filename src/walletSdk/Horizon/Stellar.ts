import { Account as StellarAccount, Server, Transaction } from "stellar-sdk";
import { Config } from "walletSdk";
import { AccountService } from "./AccountService";
import { TransactionBuilder } from "./transaction/TransactionBuilder";
import { TransactionParams } from "../Types";
import {
  AccountDoesNotExistError,
  TransactionSubmitFailedError,
} from "../Exceptions";

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

  async submitTransaction(signedTransaction: Transaction): Promise<boolean> {
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
}
