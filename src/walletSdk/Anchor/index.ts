import axios from "axios";
import isEqual from "lodash/isEqual";
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
  InvalidTransactionsResponseError
} from "../exception";
import { camelToSnakeCaseObject } from "../util/camelToSnakeCase";
import { Config, HttpClient } from "walletSdk";
import { TransactionStatus, WatcherResponse } from "../Watcher/Types";

interface WatchRegistryAsset {
  [id: string]: boolean;
}

interface WatchOneTransactionRegistry {
  [assetCode: string]: WatchRegistryAsset;
}

interface TransactionsRegistryAsset {
  [id: string]: any; // TOOD - replace with Transaction type
}

interface TransactionsRegistry {
  [assetCode: string]: TransactionsRegistryAsset;
}

// Do not create this object directly, use the Wallet class.
export class Anchor {
  public language: string;

  private cfg: Config;
  private homeDomain: string;
  private httpClient: HttpClient;
  private toml: TomlInfo;

  private _oneTransactionWatcher: {
    [assetCode: string]: {
      [id: string]: ReturnType<typeof setTimeout>;
    }
  };

  private _watchOneTransactionRegistry: WatchOneTransactionRegistry;
  private _transactionsRegistry: TransactionsRegistry;

  constructor({ 
    cfg, 
    homeDomain, 
    httpClient,
    language, 
  }: { 
    cfg: Config; 
    homeDomain: string, 
    httpClient: HttpClient,
    language: string,
  }) {
    this.cfg = cfg;
    this.homeDomain = homeDomain;
    this.httpClient = httpClient;
    this.language = language;

    this._oneTransactionWatcher = {};
    this._watchOneTransactionRegistry = {};
    this._transactionsRegistry = {};
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

  watcher() {
    return new Watcher(this);
  }

  async getServicesInfo(lang: string = this.language) {
    const toml = await this.getInfo();
    const transferServerEndpoint = toml.transferServerSep24;

    try {
      // TODO - use httpClient
      const resp = await axios.get(`${transferServerEndpoint}/info?lang=${lang}`, {
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
    lang = this.language,
  }: {
    authToken: string;
    id?: string;
    stellarTransactionId?: string;
    externalTransactionId?: string;
    lang: string;
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

    qs = { lang, ...qs };

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
  async getTransactionsForAsset(params: { 
    authToken: string;
    assetCode: string;
    noOlderThan?: string;
    limit?: number;
    kind?: string;
    pagingId?: string;
    lang?: string;
  }) {
    const { authToken, lang = this.language, ...otherParams } = params;

    const toml = await this.getInfo();
    const transferServerEndpoint = toml.transferServerSep24;

    // Let's convert all params to snake case for the API call
    const apiParams = camelToSnakeCaseObject({ lang, ...otherParams });

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

      return transactions;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
  * Watch a transaction until it stops pending. Takes three callbacks:
  * * onMessage - When the transaction comes back as pending_ or incomplete.
  * * onSuccess - When the transaction comes back as completed / refunded / expired.
  * * onError - When there's a runtime error, or the transaction comes back as
  * no_market / too_small / too_large / error.
  */
  watchOneTransaction(params: {
    authToken: string;
    assetCode: string;
    id: string;
    onMessage: (transaction) => void;
    onSuccess: (transaction) => void;
    onError: (error: any) => void;
    timeout?: number;
    isRetry?: boolean;
    lang?: string;
  }): WatcherResponse {
    const {
      authToken,
      assetCode,
      id,
      onMessage,
      onSuccess,
      onError,
      timeout = 5000,
      isRetry = false,
      lang,
    } = params;
    // make sure to initiate registries for the given asset code
    // to prevent 'Cannot read properties of undefined' errors
    if(!this._transactionsRegistry[assetCode]) {
      this._transactionsRegistry[assetCode] = {};
    }
    if(!this._oneTransactionWatcher[assetCode]) {
      this._oneTransactionWatcher[assetCode] = {};
    }

    // if it's a first run, drop it in the registry for the given asset code
    if (!isRetry) {
      this._watchOneTransactionRegistry[assetCode] = {
        ...(this._watchOneTransactionRegistry[assetCode] || {}),
        [id]: true,
      };
    }

    // do this all asynchronously (since this func needs to return a cancel fun)
    this.getTransactionBy({ authToken, id, lang })
      .then((transaction) => {
        // make sure we're still watching
        if (!this._watchOneTransactionRegistry[assetCode]?.[id]) {
          return;
        }

        const registeredTransaction = this._transactionsRegistry[assetCode][
          transaction.id
        ];

        // if we've had the transaction before, only report if there is a change
        if (
          registeredTransaction &&
          isEqual(registeredTransaction, transaction)
        ) {
          return;
        }

        this._transactionsRegistry[assetCode][transaction.id] = transaction;

        if (
          transaction.status.indexOf("pending") === 0 ||
          transaction.status === TransactionStatus.incomplete
        ) {
          if (this._oneTransactionWatcher[assetCode][id]) {
            clearTimeout(this._oneTransactionWatcher[assetCode][id]);
          }

          this._oneTransactionWatcher[assetCode][id] = setTimeout(() => {
            this.watchOneTransaction({
              ...params,
              isRetry: true,
            });
          }, timeout);
          onMessage(transaction);
        } else if (
          [
            TransactionStatus.completed, 
            TransactionStatus.refunded,
            TransactionStatus.expired
          ].includes(transaction.status)
        ) {
          onSuccess(transaction);
        } else {
          onError(transaction);
        }
      })
      .catch((e) => {
        onError(e);
      });

    return {
      refresh: () => {
        // don't do that if we stopped watching
        if (!this._watchOneTransactionRegistry[assetCode]?.[id]) {
          return;
        }

        if (this._oneTransactionWatcher[assetCode][id]) {
          clearTimeout(this._oneTransactionWatcher[assetCode][id]);
        }

        this.watchOneTransaction({
          ...params,
          isRetry: true,
        });
      },
      stop: () => {
        if (this._oneTransactionWatcher[assetCode][id]) {
          this._watchOneTransactionRegistry[assetCode][id] = false;
          clearTimeout(this._oneTransactionWatcher[assetCode][id]);
        }
      },
    };
  }

  getTransaction() {}

  getHistory() {}
}
