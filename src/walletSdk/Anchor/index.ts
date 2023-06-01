import { AxiosInstance } from "axios";
import queryString from "query-string";
import { StellarTomlResolver } from "stellar-sdk";

import { Auth } from "../Auth";
import { Interactive } from "../interactive";
import { TomlInfo, parseToml } from "../toml";
import { Watcher } from "../Watcher";
import {
  MissingTransactionIdError,
  ServerRequestFailedError,
  InvalidTransactionResponseError,
  InvalidTransactionsResponseError,
  MissingAuthenticationError,
} from "../exception";
import { camelToSnakeCaseObject } from "../util/camelToSnakeCase";
import { Config } from "walletSdk";

// Do not create this object directly, use the Wallet class.
export class Anchor {
  public language: string;
  public authToken?: string;

  private cfg: Config;
  private homeDomain: string;
  private httpClient: AxiosInstance;
  private toml: TomlInfo;

  constructor({
    cfg,
    homeDomain,
    httpClient,
    language,
  }: {
    cfg: Config;
    homeDomain: string;
    httpClient: AxiosInstance;
    language: string;
  }) {
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

  async auth() {
    const tomlInfo = await this.getInfo();
    return new Auth(this.cfg, tomlInfo.webAuthEndpoint, this.httpClient);
  }

  // Sets authentication token that should be used in all Anchor requests
  // unless an explicit `authToken` value is provided as function param
  setAuthToken(token: string) {
    this.authToken = token;
  }

  interactive() {
    return new Interactive(this.homeDomain, this, this.httpClient);
  }

  watcher() {
    return new Watcher(this);
  }

  async getServicesInfo(lang: string = this.language) {
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
   * @throws [MissingAuthenticationError] if authToken not provided
   * @throws [MissingTransactionIdError] if none of the id params is provided
   * @throws [InvalidTransactionResponseError] if Anchor returns an invalid transaction
   * @throws [ServerRequestFailedError] if server request fails
   */
  async getTransactionBy({
    authToken = this.authToken,
    id,
    stellarTransactionId,
    externalTransactionId,
    lang = this.language,
  }: {
    authToken?: string;
    id?: string;
    stellarTransactionId?: string;
    externalTransactionId?: string;
    lang: string;
  }) {
    if (!authToken) {
      throw new MissingAuthenticationError();
    }

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
   * @throws [MissingAuthenticationError] if authToken not provided
   * @throws [InvalidTransactionsResponseError] if Anchor returns an invalid response
   * @throws [ServerRequestFailedError] if server request fails
   */
  async getTransactionsForAsset(params: {
    authToken?: string;
    assetCode: string;
    noOlderThan?: string;
    limit?: number;
    kind?: string;
    pagingId?: string;
    lang?: string;
  }) {
    const {
      authToken = this.authToken, 
      lang = this.language, 
      ...otherParams 
    } = params;

    if (!authToken) {
      throw new MissingAuthenticationError();
    }

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

  getHistory() {}
}
