import { AxiosInstance } from "axios";
import queryString from "query-string";

import { Anchor } from "../Anchor";
import {
  AssetNotSupportedError,
  ServerRequestFailedError,
  MissingTransactionIdError,
  InvalidTransactionResponseError,
  InvalidTransactionsResponseError,
} from "../Exceptions";
import {
  FLOW_TYPE,
  Sep24PostParams,
  Sep24PostResponse,
  AnchorTransaction,
  GetTransactionParams,
  GetTransactionsParams,
  TransactionStatus,
} from "../Types";
import { camelToSnakeCaseObject } from "../Utils";

// Let's prevent exporting this constructor type as
// we should not create this Sep24 class directly.
type Sep24Params = {
  anchor: Anchor;
  httpClient: AxiosInstance;
};

// Do not create this object directly, use the Wallet class.
export class Sep24 {
  private anchor: Anchor;
  private httpClient: AxiosInstance;

  constructor(params: Sep24Params) {
    const { anchor, httpClient } = params;

    this.anchor = anchor;
    this.httpClient = httpClient;
  }

  async deposit({
    accountAddress,
    assetCode,
    authToken,
    lang,
    extraFields,
    fundsAccountAddress,
  }: Sep24PostParams): Promise<Sep24PostResponse> {
    return this.flow({
      accountAddress,
      assetCode,
      authToken,
      lang,
      extraFields,
      fundsAccountAddress,
      type: FLOW_TYPE.DEPOSIT,
    });
  }

  async withdraw({
    accountAddress,
    assetCode,
    authToken,
    lang,
    extraFields,
    fundsAccountAddress,
  }: Sep24PostParams): Promise<Sep24PostResponse> {
    return this.flow({
      accountAddress,
      assetCode,
      authToken,
      lang,
      extraFields,
      fundsAccountAddress,
      type: FLOW_TYPE.WITHDRAW,
    });
  }

  private async flow(
    params: Sep24PostParams & { type: FLOW_TYPE }
  ): Promise<Sep24PostResponse> {
    const {
      accountAddress,
      assetCode,
      authToken,
      lang = this.anchor.language,
      extraFields,
      fundsAccountAddress = accountAddress,
      type,
    } = params;

    const toml = await this.anchor.sep1();
    const transferServerEndpoint = toml.transferServerSep24;

    const serviceInfo = await this.anchor.getServicesInfo();

    let assets: string[];
    if (type === FLOW_TYPE.DEPOSIT) {
      assets = Object.keys(serviceInfo.deposit);
    } else {
      assets = Object.keys(serviceInfo.withdraw);
    }
    if (!assets.includes(assetCode)) {
      throw new AssetNotSupportedError(type, assetCode);
    }

    try {
      const resp = await this.httpClient.post(
        `${transferServerEndpoint}/transactions/${type}/interactive`,
        {
          asset_code: assetCode,
          lang,
          account: fundsAccountAddress,
          ...extraFields,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const interactiveResponse: Sep24PostResponse = resp.data;

      return interactiveResponse;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
   * Get single transaction's current status and details. One of the [id], [stellarTransactionId],
   * [externalTransactionId] must be provided.
   *
   * @param authToken auth token of the account authenticated with the anchor
   * @param id transaction ID
   * @param stellarTransactionId stellar transaction ID
   * @param externalTransactionId external transaction ID
   * @return transaction object
   * @throws [MissingTransactionIdError] if none of the id params is provided
   * @throws [InvalidTransactionResponseError] if Anchor returns an invalid transaction
   * @throws [ServerRequestFailedError] if server request fails
   */
  async getTransactionBy({
    authToken,
    id,
    stellarTransactionId,
    externalTransactionId,
    lang = this.anchor.language,
  }: GetTransactionParams): Promise<AnchorTransaction> {
    if (!id && !stellarTransactionId && !externalTransactionId) {
      throw new MissingTransactionIdError();
    }

    const toml = await this.anchor.sep1();
    const transferServerEndpoint = toml.transferServerSep24;

    let qs: { [name: string]: string } = {};

    if (id) {
      qs = { id };
    } else if (stellarTransactionId) {
      qs = { stellar_transaction_id: stellarTransactionId };
    } else if (externalTransactionId) {
      qs = { external_transaction_id: externalTransactionId };
    }

    qs = { lang, ...qs };

    try {
      const resp = await this.httpClient.get(
        `${transferServerEndpoint}/transaction?${queryString.stringify(qs)}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const transaction: AnchorTransaction = resp.data.transaction;

      if (!transaction || Object.keys(transaction).length === 0) {
        throw new InvalidTransactionResponseError(transaction);
      }

      return transaction;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
   * Get account's transactions specified by asset and other params.
   *
   * @param authToken auth token of the account authenticated with the anchor
   * @param assetCode target asset to query for
   * @param noOlderThan response should contain transactions starting on or after this date & time
   * @param limit response should contain at most 'limit' transactions
   * @param kind kind of transaction that is desired. E.g.: 'deposit', 'withdrawal'
   * @param pagingId response should contain transactions starting prior to this ID (exclusive)
   * @param lang desired language (localization), it can also accept locale in the format 'en-US'
   * @return list of transactions as requested by the client, sorted in time-descending order
   * @throws [InvalidTransactionsResponseError] if Anchor returns an invalid response
   * @throws [ServerRequestFailedError] if server request fails
   */
  async getTransactionsForAsset({
    authToken,
    assetCode,
    noOlderThan,
    limit,
    kind,
    pagingId,
    lang = this.anchor.language,
  }: GetTransactionsParams): Promise<AnchorTransaction[]> {
    const toml = await this.anchor.sep1();
    const transferServerEndpoint = toml.transferServerSep24;

    // Let's convert all params to snake case for the API call
    const apiParams = camelToSnakeCaseObject({
      assetCode,
      noOlderThan,
      limit,
      kind,
      pagingId,
      lang,
    });

    try {
      const resp = await this.httpClient.get(
        `${transferServerEndpoint}/transactions?${queryString.stringify(
          apiParams
        )}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const transactions: AnchorTransaction[] = resp.data.transactions;

      if (!transactions || !Array.isArray(transactions)) {
        throw new InvalidTransactionsResponseError(transactions);
      }

      return transactions;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
   * Get all successfully finished (either completed or refunded) account transactions for specified
   * asset. Optional field implementation depends on anchor.
   *
   * @param authToken auth token of the account authenticated with the anchor
   * @param assetCode target asset to query for
   * @param noOlderThan response should contain transactions starting on or after this date & time
   * @param limit response should contain at most 'limit' transactions
   * @param kind kind of transaction that is desired. E.g.: 'deposit', 'withdrawal'
   * @param pagingId response should contain transactions starting prior to this ID (exclusive)
   * @param lang desired language (localization), it can also accept locale in the format 'en-US'
   * @return list of filtered transactions that achieved a final state (completed or refunded)
   * @throws [AssetNotSupportedError] if asset is not supported by the anchor
   * @throws [InvalidTransactionsResponseError] if Anchor returns an invalid response
   * @throws [ServerRequestFailedError] if server request fails
   */

  async getHistory({
    authToken,
    assetCode,
    noOlderThan,
    limit,
    kind,
    pagingId,
    lang = this.anchor.language,
  }: GetTransactionsParams): Promise<AnchorTransaction[]> {
    const toml = await this.anchor.sep1();
    if (!toml.currencies?.find(({ code }) => code === assetCode)) {
      throw new AssetNotSupportedError(null, assetCode);
    }

    const transactions = await this.getTransactionsForAsset({
      authToken,
      assetCode,
      noOlderThan,
      limit,
      kind,
      pagingId,
      lang,
    });

    const finishedTransactions = transactions.filter(({ status }) =>
      [TransactionStatus.completed, TransactionStatus.refunded].includes(status)
    );

    return finishedTransactions;
  }
}
