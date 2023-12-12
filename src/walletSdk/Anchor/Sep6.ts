import { AxiosInstance } from "axios";
import queryString from "query-string";

import { Anchor } from "../Anchor";
import {
  ServerRequestFailedError,
  MissingTransactionIdError,
} from "../Exceptions";
import {
  Sep6Info,
  Sep6Params,
  Sep6DepositParams,
  Sep6WithdrawParams,
  Sep6DepositResponse,
  Sep6WithdrawResponse,
  Sep6ExchangeParams,
  Sep6Transaction,
  GetTransactionParams,
  GetTransactionsParams,
  WatcherSepType,
  AuthToken,
} from "../Types";
import {
  Watcher,
  _getTransactionsForAsset,
  _getTransactionBy,
} from "../Watcher";
import { camelToSnakeCaseObject } from "../Utils";

/**
 * Flow for creating deposits and withdrawals with an anchor using SEP-6.
 * For an interactive flow use Sep24 instead.
 * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0006.md}
 * Do not create this object directly, use the Anchor class.
 * @class
 */
export class Sep6 {
  private anchor: Anchor;
  private httpClient: AxiosInstance;
  private anchorInfo: Sep6Info;

  /**
   * Creates a new instance of the Sep6 class.
   * @constructor
   * @param {Sep6Params} params - Parameters to initialize the Sep6 instance.
   */
  constructor(params: Sep6Params) {
    const { anchor, httpClient } = params;

    this.anchor = anchor;
    this.httpClient = httpClient;
  }

  /**
   * Get SEP-6 anchor information.
   * If `shouldRefresh` is set to `true`, it fetches fresh values; otherwise, it returns cached values if available.
   * @param {boolean} [shouldRefresh=false] - Flag to force a refresh of TOML values.
   * @returns {Promise<Sep6Info>} - SEP-6 information about the anchor.
   */
  async info(shouldRefresh?: boolean): Promise<Sep6Info> {
    if (this.anchorInfo && !shouldRefresh) {
      return this.anchorInfo;
    }

    const { transferServer } = await this.anchor.sep1();
    try {
      const resp = await this.httpClient.get(`${transferServer}/info`);
      this.anchorInfo = resp.data;
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
   * Deposits funds using the SEP-6 protocol. Next steps by
   * the anchor are given in the response.
   *
   * @param {object} options - The options for the deposit.
   * @param {AuthToken} options.authToken - The authentication token.
   * @param {Sep6DepositParams} options.params - The parameters for the deposit request.
   *
   * @returns {Promise<Sep6DepositResponse>} Sep6 deposit response, containing next steps if needed
   * to complete the deposit.
   *
   * @throws {Error} If an unexpected error occurs during the deposit operation.
   */
  async deposit({
    authToken,
    params,
  }: {
    authToken: AuthToken;
    params: Sep6DepositParams;
  }): Promise<Sep6DepositResponse> {
    return this.flow({ type: "deposit", authToken, params });
  }

  /**
   * Initiates a withdrawal using SEP-6.
   *
   * @param {object} options - The options for the withdrawal operation.
   * @param {AuthToken} options.authToken - The authentication token.
   * @param {Sep6WithdrawParams} options.params - The parameters for the withdrawal request.
   *
   * @returns {Promise<Sep6WithdrawResponse>} Sep6 withdraw response.
   */
  async withdraw({
    authToken,
    params,
  }: {
    authToken: AuthToken;
    params: Sep6WithdrawParams;
  }): Promise<Sep6WithdrawResponse> {
    return this.flow({ type: "withdraw", authToken, params });
  }

  /**
   * Similar to the SEP-6 deposit function, but for non-equivalent assets
   * that require an exchange.
   *
   * @param {object} options - The options for the deposit exchange.
   * @param {AuthToken} options.authToken - The authentication token.
   * @param {Sep6ExchangeParams} options.params - The parameters for the deposit request.
   *
   * @returns {Promise<Sep6DepositResponse>} Sep6 deposit response, containing next steps if needed
   * to complete the deposit.
   *
   * @throws {Error} If an unexpected error occurs during the deposit operation.
   */
  async depositExchange({
    authToken,
    params,
  }: {
    authToken: AuthToken;
    params: Sep6ExchangeParams;
  }): Promise<Sep6DepositResponse> {
    return this.flow({ type: "deposit-exchange", authToken, params });
  }

  /**
   * Similar to the SEP-6 withdraw function, but for non-equivalent assets
   * that require an exchange.
   *
   * @param {object} options - The options for the deposit exchange.
   * @param {AuthToken} options.authToken - The authentication token.
   * @param {Sep6ExchangeParams} options.params - The parameters for the deposit request.
   *
   * @returns {Promise<Sep6WithdrawResponse>} Sep6 withdraw response, containing next steps if needed
   * to complete the withdrawal.
   *
   * @throws {Error} If an unexpected error occurs during the deposit operation.
   */
  async withdrawExchange({
    authToken,
    params,
  }: {
    authToken: AuthToken;
    params: Sep6ExchangeParams;
  }): Promise<Sep6WithdrawResponse> {
    return this.flow({ type: "withdraw-exchange", authToken, params });
  }

  private async flow({
    type,
    authToken,
    params,
  }: {
    type: "deposit" | "withdraw" | "deposit-exchange" | "withdraw-exchange";
    authToken: AuthToken;
    params: Sep6DepositParams | Sep6WithdrawParams | Sep6ExchangeParams;
  }) {
    const { transferServer } = await this.anchor.sep1();

    try {
      const resp = await this.httpClient.get(
        `${transferServer}/${type}?${queryString.stringify(params)}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken.token}`,
          },
        },
      );
      return resp.data;
    } catch (e) {
      if (e.response?.data?.type === "non_interactive_customer_info_needed") {
        return e.response?.data;
      } else if (e.response?.data?.type === "customer_info_status") {
        return e.response?.data;
      }
      throw e;
    }
  }

  /**
   * Creates a new instance of the Watcher class, to watch sep6 transactions.
   * @returns {Watcher} A new Watcher instance.
   */
  watcher(): Watcher {
    return new Watcher(this.anchor, WatcherSepType.SEP6);
  }

  /**
   * Get account's sep6 transactions specified by asset and other params.
   * @param {GetTransactionsParams} params - The Get Transactions params.
   * @param {AuthToken} params.authToken - The authentication token for the account authenticated with the anchor.
   * @param {string} params.assetCode - The target asset to query for.
   * @param {string} params.account - The stellar account public key involved in the transactions. If the service requires SEP-10
   * authentication, this parameter must match the authenticated account.
   * @param {string} [params.noOlderThan] - The response should contain transactions starting on or after this date & time.
   * @param {string} [params.limit] - The response should contain at most 'limit' transactions.
   * @param {string} [params.kind] - The kind of transaction that is desired. E.g.: 'deposit', 'withdrawal', 'depo
   * -exchange', 'withdrawal-exchange'.
   * @param {string} [params.pagingId] - The response should contain transactions starting prior to this ID (exclusive).
   * @param {string} [params.lang] - The desired language (localization), it can also accept locale in the format 'en-US'.
   * @returns {Promise<Sep6Transaction[]>} A list of transactions as requested by the client, sorted in time-descending order.
   * @throws {InvalidTransactionsResponseError} Anchor returns an invalid response.
   * @throws {ServerRequestFailedError} If server request fails.
   */
  async getTransactionsForAsset({
    authToken,
    assetCode,
    account,
    noOlderThan,
    limit,
    kind,
    pagingId,
    lang = this.anchor.language,
  }: GetTransactionsParams & { account: string }): Promise<Sep6Transaction[]> {
    const toml = await this.anchor.sep1();
    const transferServerEndpoint = toml.transferServer;

    // Let's convert all params to snake case for the API call
    const apiParams = camelToSnakeCaseObject({
      assetCode,
      account,
      noOlderThan,
      limit,
      kind,
      pagingId,
      lang,
    });

    return _getTransactionsForAsset<Sep6Transaction>(
      authToken,
      apiParams,
      transferServerEndpoint,
      this.httpClient,
    );
  }

  /**
   * Get single sep6 transaction's current status and details from the anchor.
   * @param {GetTransactionParams} params - The Get Transactions params.
   * @param {AuthToken} params.authToken - The authentication token for the account authenticated with the anchor.
   * @param {string} [params.id] - The transaction ID.
   * @param {string} [params.stellarTransactionId] - The Stellar transaction ID.
   * @param {string} [params.externalTransactionId] - The external transaction ID.
   * @param {string} [params.lang] - The language setting.
   * @returns {Promise<Sep6Transaction>} The transaction object.
   * @throws {MissingTransactionIdError} If none of the ID parameters is provided.
   * @throws {InvalidTransactionResponseError} If the anchor returns an invalid transaction response.
   * @throws {ServerRequestFailedError} If the server request fails.
   */
  async getTransactionBy({
    authToken,
    id,
    stellarTransactionId,
    externalTransactionId,
    lang = this.anchor.language,
  }: GetTransactionParams): Promise<Sep6Transaction> {
    if (!id && !stellarTransactionId && !externalTransactionId) {
      throw new MissingTransactionIdError();
    }

    const toml = await this.anchor.sep1();
    const transferServerEndpoint = toml.transferServer;

    // Let's convert all params to snake case for the API call
    const apiParams = camelToSnakeCaseObject({
      id,
      stellarTransactionId,
      externalTransactionId,
      lang,
    });

    return _getTransactionBy<Sep6Transaction>(
      authToken,
      apiParams,
      transferServerEndpoint,
      this.httpClient,
    );
  }
}
