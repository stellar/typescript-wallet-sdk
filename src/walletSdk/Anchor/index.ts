import { AxiosInstance } from "axios";
import queryString from "query-string";
import { StellarTomlResolver } from "stellar-sdk";

import { Config } from "walletSdk";
import { Auth } from "walletSdk/Auth";
import {
  MissingTransactionIdError,
  ServerRequestFailedError,
  InvalidTransactionResponseError,
  InvalidTransactionsResponseError,
  AssetNotSupportedError,
} from "walletSdk/Exception";
import { Interactive } from "walletSdk/Interactive";
import { TomlInfo, parseToml } from "walletSdk/Toml";
import { 
  AnchorServiceInfo, 
  AnchorTransaction, 
  GetTransactionParams, 
  GetTransactionsParams, 
  TransactionStatus 
} from "walletSdk/Types";
import { Watcher } from "walletSdk/Watcher";
import { camelToSnakeCaseObject } from "walletSdk/Util/camelToSnakeCase";

// Let's keep this constructor type private as
// we should not create this Anchor class directly.
type AnchorParams = {
  cfg: Config;
  homeDomain: string;
  httpClient: AxiosInstance;
  language: string;
};

// Do not create this object directly, use the Wallet class.
export class Anchor {
  public language: string;

  private cfg: Config;
  private homeDomain: string;
  private httpClient: AxiosInstance;
  private toml: TomlInfo;

  constructor(params: AnchorParams) {
    const {
      cfg,
      homeDomain,
      httpClient,
      language,
    } = params;

    this.cfg = cfg;
    this.homeDomain = homeDomain;
    this.httpClient = httpClient;
    this.language = language;
  }

  async getInfo(shouldRefresh?: boolean): Promise<TomlInfo> {
    // return cached TOML values by default
    if (this.toml && !shouldRefresh) {
      return this.toml;
    }

    // fetch fresh TOML values from Anchor domain
    const stellarToml = await StellarTomlResolver.resolve(this.homeDomain);
    const parsedToml = parseToml(stellarToml);
    this.toml = parsedToml;
    return parsedToml;
  }

  async auth(): Promise<Auth> {
    const tomlInfo = await this.getInfo();
    return new Auth(
      this.cfg,
      tomlInfo.webAuthEndpoint,
      this.homeDomain,
      this.httpClient
    );
  }

  interactive(): Interactive {
    return new Interactive(this.homeDomain, this, this.httpClient);
  }

  watcher(): Watcher {
    return new Watcher(this);
  }

  async getServicesInfo(lang: string = this.language): Promise<AnchorServiceInfo> {
    const toml = await this.getInfo();
    const transferServerEndpoint = toml.transferServerSep24;

    try {
      const resp = await this.httpClient.get(
        `${transferServerEndpoint}/info?lang=${lang}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return resp.data;
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
  async getTransactionBy(params: GetTransactionParams): Promise<AnchorTransaction> {
    const {
      authToken,
      id,
      stellarTransactionId,
      externalTransactionId,
      lang = this.language,
    } = params;

    if (!id && !stellarTransactionId && !externalTransactionId) {
      throw new MissingTransactionIdError();
    }

    const toml = await this.getInfo();
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

      const transaction = resp.data?.transaction;

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
  async getTransactionsForAsset(params: GetTransactionsParams): Promise<AnchorTransaction[]> {
    const { 
      authToken, 
      lang = this.language, 
      ...otherParams 
    } = params;

    const toml = await this.getInfo();
    const transferServerEndpoint = toml.transferServerSep24;

    // Let's convert all params to snake case for the API call
    const apiParams = camelToSnakeCaseObject({ lang, ...otherParams });

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

      const transactions = resp.data?.transactions;

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

  async getHistory(params: GetTransactionsParams): Promise<AnchorTransaction[]> {
    const { assetCode } = params;

    const toml = await this.getInfo();
    if (!toml.currencies?.find(({ code }) => code === assetCode)) {
      throw new AssetNotSupportedError(null, assetCode);
    }

    const transactions = await this.getTransactionsForAsset(params);

    const finishedTransactions = transactions
      .filter(({ status }) => [
        TransactionStatus.completed, 
        TransactionStatus.refunded
      ].includes(status));

    return finishedTransactions;
  }
}
