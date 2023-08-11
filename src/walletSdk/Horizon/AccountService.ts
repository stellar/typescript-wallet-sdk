import { Keypair, Networks, Server, ServerApi } from "stellar-sdk";

import { Config } from "walletSdk";
import { SigningKeypair } from "./Account";
import { HORIZON_LIMIT_DEFAULT, HORIZON_LIMIT_MAX, HORIZON_ORDER } from "../Types";
import { OperationsLimitExceededError } from "../Exceptions";

// Do not create this object directly, use the Wallet class.
export class AccountService {
  private server: Server;
  private network: Networks;

  constructor(cfg: Config) {
    this.server = cfg.stellar.server;
    this.network = cfg.stellar.network;
  }

  /**
   * Generate new account keypair (public and secret key). This key pair can be
   * used to create a Stellar account.
   *
   * @return public key and secret key
   */
  createKeypair(): SigningKeypair {
    return new SigningKeypair(Keypair.random());
  }

  /**
   * Get account information from the Stellar network.
   *
   * @param accountAddress Stellar address of the account
   * @param serverInstance optional Horizon server instance when default doesn't work
   * @return account information
   */
  async getInfo({ 
    accountAddress, 
    serverInstance = this.server 
  }: { 
    accountAddress: string; 
    serverInstance?: Server;
  }): Promise<ServerApi.AccountRecord> {
    return serverInstance.accounts().accountId(accountAddress).call();
  }

  /**
   * Get account operations for the specified Stellar address.
   *
   * @param accountAddress Stellar address of the account
   * @param limit optional how many operations to fetch, maximum is 200, default is 10
   * @param order optional data order, ascending or descending, defaults to descending
   * @param cursor optional cursor to specify a starting point
   * @param includeFailed optional flag to include failed operations, defaults to false
   * @return a list of operations
   * @throws [OperationsLimitExceededException] when maximum limit of 200 is exceeded
   */
  async getHistory({
    accountAddress,
    limit = HORIZON_LIMIT_DEFAULT,
    order = HORIZON_ORDER.DESC,
    cursor,
    includeFailed = false,
  }: {
    accountAddress: string;
    limit?: number;
    order?: HORIZON_ORDER;
    cursor?: string;
    includeFailed?: boolean;
  }): Promise<ServerApi.CollectionPage<ServerApi.OperationRecord>> {
    if (limit > HORIZON_LIMIT_MAX) {
      throw new OperationsLimitExceededError(HORIZON_LIMIT_MAX);
    }
    
    return this.server
      .operations()
      .forAccount(accountAddress)
      .limit(limit)
      .order(order)
      .cursor(cursor)
      .includeFailed(includeFailed)
      .call();
  }
}
