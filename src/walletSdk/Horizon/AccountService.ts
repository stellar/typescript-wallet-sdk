import { Keypair, Networks, Horizon } from "stellar-sdk";

import { Config } from "walletSdk";
import { SigningKeypair } from "./Account";
import {
  HORIZON_LIMIT_DEFAULT,
  HORIZON_LIMIT_MAX,
  HORIZON_ORDER,
} from "../Types";
import { OperationsLimitExceededError } from "../Exceptions";

// Do not create this object directly, use the Wallet class.
/**
 * KYC management with Sep-12.
 * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md}
 * Do not create this object directly, use the Stellar class.
 * @class
 */
export class AccountService {
  private server: Horizon.Server;
  private network: Networks;

  /**
   * Creates a new instance of the AccountService class.
   * @constructor
   * @param {Config} cfg - Configuration for the service.
   */
  constructor(cfg: Config) {
    this.server = cfg.stellar.server;
    this.network = cfg.stellar.network;
  }

  /**
   * Generate new account keypair (public and secret key). This key pair can be
   * used to create a Stellar account.
   * @returns {SigningKeypair} Keypair capable of signing.
   */
  createKeypair(): SigningKeypair {
    return new SigningKeypair(Keypair.random());
  }

  /**
   * Generate new account keypair (public and secret key) from random bytes. This key pair can be
   * used to create a Stellar account.
   * @param {Buffer} randomBytes - Random bytes to create keypair from.
   * @returns {SigningKeypair} Keypair capable of signing.
   */
  createKeypairFromRandom(randomBytes: Buffer): SigningKeypair {
    return new SigningKeypair(Keypair.fromRawEd25519Seed(randomBytes));
  }

  /**
   * Get account information from the Stellar network.
   * @param {object} params - The parameters for retrieving account information.
   * @param {string} params.accountAddress - Stellar address of the account.
   * @param {Horizon.HorizonApi.Server} [params.serverInstance=this.server] - Horizon server instance when default doesn't work.
   * @returns {Promise<Horizon.ServerApi.AccountRecord>} Account information.
   */
  async getInfo({
    accountAddress,
    serverInstance = this.server,
  }: {
    accountAddress: string;
    serverInstance?: Horizon.Server;
  }): Promise<Horizon.ServerApi.AccountRecord> {
    return serverInstance.accounts().accountId(accountAddress).call();
  }

  /**
   * Get account operations for the specified Stellar address.
   * @param {object} params - The parameters for retrieving account history.
   * @param {string} params.accountAddress - Stellar address of the account
   * @param {number} [params.limit=HORIZON_LIMIT_DEFAULT] - How many operations to fetch, maximum is 200, default is 10
   * @param {HORIZON_ORDER} [params.order=HORIZON_ORDER.DESC] - Data order, ascending or descending, defaults to descending
   * @param {string} [params.cursor] - Cursor to specify a starting point
   * @param {boolean} [params.includeFailed=false] - Flag to include failed operations.
   * @returns {Promise<Horizon.ServerApi.CollectionPage<Horizon.ServerApi.OperationRecord>>} A list of operations.
   * @throws {OperationsLimitExceededError} when maximum limit of 200 is exceeded.
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
  }): Promise<
    Horizon.ServerApi.CollectionPage<Horizon.ServerApi.OperationRecord>
  > {
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
