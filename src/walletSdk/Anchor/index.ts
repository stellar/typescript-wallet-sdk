import { StellarTomlResolver } from "stellar-sdk";
import axios from "axios";
import queryString from "query-string";
import isEqual from "lodash/isEqual";

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
import { TransactionStatus, WatcherResponse } from "./Types";

interface WatchAllTransactionsRegistry {
  [assetCode: string]: boolean;
}

interface TransactionsRegistryAsset {
  [id: string]: any; // TOOD - replace with Transaction type
}

interface TransactionsRegistry {
  [assetCode: string]: TransactionsRegistryAsset;
}

// Do not create this object directly, use the Wallet class.
export class Anchor {
  private homeDomain = "";
  private httpClient = null;
  private cfg;
  private toml: TomlInfo;

  private _allTransactionsWatcher?: ReturnType<typeof setTimeout>;
  private _watchAllTransactionsRegistry: WatchAllTransactionsRegistry;
  private _transactionsRegistry: TransactionsRegistry;
  private _transactionsIgnoredRegistry: TransactionsRegistry;

  constructor(cfg, homeDomain: string, httpClient) {
    this.homeDomain = homeDomain;
    this.httpClient = httpClient;
    this.cfg = cfg;

    this._watchAllTransactionsRegistry = {};
    this._transactionsRegistry = {};
    this._transactionsIgnoredRegistry = {};
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
    const { authToken, ...otherParams } = params;

    const toml = await this.getInfo();
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

      return transactions;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
  * Watch all transactions returned from a transfer server. When new or
  * updated transactions come in, run an `onMessage` callback.
  *
  * On initial load, it'll return ALL pending transactions via onMessage.
  * Subsequent messages will be any one of these events:
  *  * Any new transaction appears
  *  * Any of the initial pending transactions change any state
  *
  * You may also provide an array of transaction ids, `watchlist`, and this
  * watcher will always react to transactions whose ids are in the watchlist.
  */
  watchAllTransactions(params: {
    authToken: string;
    assetCode: string;
    onMessage: (transaction) => void;
    onError: (error: any) => void;
    watchlist?: string[];
    timeout?: number;
    isRetry?: boolean;
    noOlderThan?: string;
    kind?: string;
    lang?: string;
  }): WatcherResponse {
    const {
      authToken,
      assetCode,
      onMessage,
      onError,
      watchlist = [],
      timeout = 5000,
      isRetry = false,
      ...otherParams
    } = params;
    
    // make an object map out of watchlist
    const watchlistMap = watchlist.reduce(
      (memo, id: string) => ({ ...memo, [id]: true }),
      {},
    );

    // make sure to initiate registries for the given asset code
    // to prevent 'Cannot read properties of undefined' errors
    if(!this._transactionsRegistry[assetCode]) {
      this._transactionsRegistry[assetCode] = {};
    }
    if(!this._transactionsIgnoredRegistry[assetCode]) {
      this._transactionsIgnoredRegistry[assetCode] = {};
    }

    // if it's a first run, drop it in the registry for the given asset code
    if (!isRetry) {
      this._watchAllTransactionsRegistry[assetCode] = true;
    }

    this.getTransactionsForAsset({ authToken, assetCode, ...otherParams })
      .then((transactions: any[]) => { // TOOD - replace with Transaction[] type
        // make sure we're still watching
        if (!this._watchAllTransactionsRegistry[assetCode]) {
          return;
        }

        try {
          const newTransactions = transactions.filter(
            (transaction) => {
              const isInProgress =
                transaction.status.indexOf("pending") === 0 ||
                transaction.status === TransactionStatus.incomplete;
              const registeredTransaction = this._transactionsRegistry[
                assetCode
              ][transaction.id];

              // if this is the first watch, only keep the pending ones
              if (!isRetry) {
                // always show transactions on the watchlist
                if (watchlistMap[transaction.id]) {
                  return true;
                }

                // if we're not in progress, then save this in an ignore reg
                if (!isInProgress) {
                  this._transactionsIgnoredRegistry[assetCode][
                    transaction.id
                  ] = transaction;
                }

                return isInProgress;
              }

              // if we've had the transaction before, only report updates
              if (registeredTransaction) {
                return !isEqual(registeredTransaction, transaction);
              }

              // if it's NOT a registered transaction, and it's not the first
              // roll, maybe it's a new transaction that achieved a final
              // status immediately so register that!
              if (
                [
                  TransactionStatus.completed,
                  TransactionStatus.refunded,
                  TransactionStatus.expired,
                  TransactionStatus.error,
                ].includes(transaction.status) &&
                isRetry &&
                !this._transactionsIgnoredRegistry[assetCode][transaction.id]
              ) {
                return true;
              }

              // always use in progress transactions
              if (isInProgress) {
                return true;
              }

              return false;
            },
          );

          newTransactions.forEach((transaction) => {
            this._transactionsRegistry[assetCode][
              transaction.id
            ] = transaction;

            if (transaction.status === TransactionStatus.error) {
              onError(transaction);
            } else {
              onMessage(transaction);
            }
          });
        } catch (e) {
          onError(e);
          return;
        }

        // call it again
        if (this._allTransactionsWatcher) {
          clearTimeout(this._allTransactionsWatcher);
        }
        this._allTransactionsWatcher = setTimeout(() => {
          this.watchAllTransactions({
            ...params,
            isRetry: true,
         });
        }, timeout);
      })
      .catch((e) => {
        onError(e);
      });

    return {
      refresh: () => {
        // don't do that if we stopped watching
        if (!this._watchAllTransactionsRegistry[assetCode]) {
          return;
        }

        if (this._allTransactionsWatcher) {
          clearTimeout(this._allTransactionsWatcher);
        }

        this.watchAllTransactions({
          ...params,
          isRetry: true,
       });
      },
      stop: () => {
        if (this._allTransactionsWatcher) {
          this._watchAllTransactionsRegistry[assetCode] = false;
          this._transactionsRegistry[assetCode] = {};
          this._transactionsIgnoredRegistry[assetCode] = {};
          clearTimeout(this._allTransactionsWatcher);
        }
      },
    };
  }

  getHistory() {}
}
