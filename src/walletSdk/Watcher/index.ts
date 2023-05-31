import isEqual from "lodash/isEqual";

import { Anchor } from "walletSdk/Anchor";
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

export class Watcher {
  private anchor: Anchor;

  private _allTransactionsWatcher?: ReturnType<typeof setTimeout>;
  private _watchAllTransactionsRegistry: WatchAllTransactionsRegistry;
  private _transactionsRegistry: TransactionsRegistry;
  private _transactionsIgnoredRegistry: TransactionsRegistry;

  constructor(anchor: Anchor) {
    this.anchor = anchor;

    this._watchAllTransactionsRegistry = {};
    this._transactionsRegistry = {};
    this._transactionsIgnoredRegistry = {};
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

    this.anchor.getTransactionsForAsset({ authToken, assetCode, ...otherParams })
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

}
