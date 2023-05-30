import { StellarTomlResolver } from "stellar-sdk";
import axios from "axios";
import queryString from "query-string";

import { Auth } from "../Auth";
import { Interactive } from "../interactive";
import { TomlInfo, parseToml } from "../toml";
import { 
  MissingTransactionIdError, 
  ServerRequestFailedError, 
  InvalidTransactionResponseError
} from "../exception";

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

  getTransaction() {}

  getTransactionForAsset() {}

  getHistory() {}
}
