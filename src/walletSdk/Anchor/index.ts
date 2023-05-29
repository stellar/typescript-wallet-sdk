import { StellarTomlResolver } from "stellar-sdk";
import axios from "axios";
import queryString from "query-string";

import { Auth } from "../Auth";
import { Interactive } from "../interactive";
import { TomlInfo, parseToml } from "../toml";
import { 
  MissingTransactionIdError, 
  ServerRequestFailedError, 
  InvalidTransactionResponseError,
  InvalidTransactionsResponseError
} from "../exception";
import { camelToSnakeCaseObject } from "../util/camelToSnakeCase";

function _normalizeTransaction(transaction) {
  // some anchors return _id instead of id, so rewrite that
  if (transaction._id && transaction.id === undefined) {
    transaction.id = transaction._id;
  }

  // others provide amount but not amount_in / amount_out
  if (
    transaction.amount &&
    transaction.amount_in === undefined &&
    transaction.amount_out === undefined
  ) {
    transaction.amount_in = transaction.amount;
    transaction.amount_out = transaction.amount;
  }
  return transaction;
}

// Do not create this object directly, use the Wallet class.
export class Anchor {
  private homeDomain = "";
  private httpClient = null;
  private cfg;
  private toml: TomlInfo;

  constructor(cfg, homeDomain: string, httpClient) {
    this.homeDomain = homeDomain;
    this.httpClient = httpClient;
    this.cfg = cfg;
  }

  async getInfo(shouldRefresh?: boolean): Promise<TomlInfo> {
    // return cached TOML values by default
    if(this.toml && !shouldRefresh) {
      return this.toml;
    }

    // fetch fresh TOML values from Anchor domain
    const stellarToml = await StellarTomlResolver.resolve(this.homeDomain);
    const parsedToml = parseToml(stellarToml);
    this.toml = parsedToml;
    return parsedToml;
  }

  async auth() {
    const toml = await this.getInfo();
    return new Auth(toml.webAuthEndpoint);
  }

  interactive() {
    return new Interactive(this.homeDomain, this);
  }

  async getServicesInfo() {
    const toml = await this.getInfo();
    const transferServerEndpoint = toml.transferServerSep24;

    try {
      // TODO - use httpClient
      const resp = await axios.get(`${transferServerEndpoint}/info`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
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
  async getTransactionBy({
    authToken,
    id,
    stellarTransactionId,
    externalTransactionId,
    lang,
  }: {
    authToken: string;
    id?: string;
    stellarTransactionId?: string;
    externalTransactionId?: string;
    lang?: string;
  }) {
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

    if (lang) {
      qs = { lang, ...qs };
    }

    try {
      // TODO - use httpClient
      const resp = await axios.get(`${transferServerEndpoint}/transaction?${queryString.stringify(qs)}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
  
      const transaction = resp.data?.transaction;

      if(!transaction || Object.keys(transaction).length === 0) {
        throw new InvalidTransactionResponseError(transaction);
      }

      return _normalizeTransaction(transaction);
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
  async getTransactionsForAsset(params: { 
    authToken: string;
    assetCode: string;
    noOlderThan?: string;
    limit?: number;
    kind?: string;
    pagingId?: string;
    lang?: string;
  }) {
    const { authToken, ...otherParams } = params;

    const toml = this.toml || await this.getInfo();
    const transferServerEndpoint = toml.transferServerSep24;

    // Let's convert all params to snake case for the API call
    const apiParams = camelToSnakeCaseObject(otherParams);

    try {
      // TODO - use httpClient
      const resp = await axios.get(`${transferServerEndpoint}/transactions?${queryString.stringify(apiParams)}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const transactions = resp.data?.transactions;

      if(!transactions || !Array.isArray(transactions)) {
        throw new InvalidTransactionsResponseError(transactions);
      }

      return transactions.map(_normalizeTransaction);
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  getTransaction() {}

  getHistory() {}
}
