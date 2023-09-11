import { Anchor } from "../Anchor";
import {
  AnchorTransaction,
  TransactionStatus,
  WatchTransactionParams,
  WatchTransactionsParams,
  WatcherResponse,
} from "../Types";

interface WatchRegistryAsset {
  [id: string]: boolean;
}

interface WatchOneTransactionRegistry {
  [assetCode: string]: WatchRegistryAsset;
}

interface WatchAllTransactionsRegistry {
  [assetCode: string]: boolean;
}

interface TransactionsRegistryAsset {
  [id: string]: any; // TOOD - replace with Transaction type
}

interface TransactionsRegistry {
  [assetCode: string]: TransactionsRegistryAsset;
}

// Do not create this object directly, use the Anchor class.
export class Watcher {
  private anchor: Anchor;

  private _oneTransactionWatcher: {
    [assetCode: string]: {
      [id: string]: ReturnType<typeof setTimeout>;
    };
  };
  private _allTransactionsWatcher?: ReturnType<typeof setTimeout>;
  private _watchOneTransactionRegistry: WatchOneTransactionRegistry;
  private _watchAllTransactionsRegistry: WatchAllTransactionsRegistry;
  private _transactionsRegistry: TransactionsRegistry;
  private _transactionsIgnoredRegistry: TransactionsRegistry;

  constructor(anchor: Anchor) {
    this.anchor = anchor;

    this._oneTransactionWatcher = {};
    this._allTransactionsWatcher = undefined;
    this._watchOneTransactionRegistry = {};
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
   *  - Any new transaction appears
   *  - Any of the initial pending transactions change any state
   *
   * You may also provide an array of transaction ids, `watchlist`, and this
   * watcher will always react to transactions whose ids are in the watchlist.
   */
  watchAllTransactions({
    authToken,
    assetCode,
    onMessage,
    onError,
    watchlist = [],
    timeout = 5000,
    isRetry = false,
    lang = this.anchor.language,
    kind,
    noOlderThan,
  }: WatchTransactionsParams): WatcherResponse {
    const allParams = {
      authToken,
      assetCode,
      onMessage,
      onError,
      watchlist,
      timeout,
      isRetry,
      lang,
      kind,
      noOlderThan,
    };

    // make an object map out of watchlist
    const watchlistMap = watchlist.reduce(
      (memo, id: string) => ({ ...memo, [id]: true }),
      {},
    );

    // make sure to initiate registries for the given asset code
    // to prevent 'Cannot read properties of undefined' errors
    if (!this._transactionsRegistry[assetCode]) {
      this._transactionsRegistry[assetCode] = {};
    }
    if (!this._transactionsIgnoredRegistry[assetCode]) {
      this._transactionsIgnoredRegistry[assetCode] = {};
    }

    // if it's a first run, drop it in the registry for the given asset code
    if (!isRetry) {
      this._watchAllTransactionsRegistry[assetCode] = true;
    }

    this.anchor
      .sep24()
      .getTransactionsForAsset({
        authToken,
        assetCode,
        lang,
        kind,
        noOlderThan,
      })
      .then((transactions: AnchorTransaction[]) => {
        // make sure we're still watching
        if (!this._watchAllTransactionsRegistry[assetCode]) {
          return;
        }

        try {
          const newTransactions = transactions.filter((transaction) => {
            const isInProgress =
              transaction.status.indexOf("pending") === 0 ||
              transaction.status === TransactionStatus.incomplete;
            const registeredTransaction =
              this._transactionsRegistry[assetCode][transaction.id];

            // if this is the first watch, only keep the pending ones
            if (!isRetry) {
              // always show transactions on the watchlist
              if (watchlistMap[transaction.id]) {
                return true;
              }

              // if we're not in progress, then save this in an ignore reg
              if (!isInProgress) {
                this._transactionsIgnoredRegistry[assetCode][transaction.id] =
                  transaction;
              }

              return isInProgress;
            }

            // if we've had the transaction before, only report updates if status changed
            if (registeredTransaction) {
              return registeredTransaction.status !== transaction.status;
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
          });

          newTransactions.forEach((transaction) => {
            this._transactionsRegistry[assetCode][transaction.id] = transaction;

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
            ...allParams,
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
          ...allParams,
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

  /**
   * Watch a transaction until it stops pending. Takes three callbacks:
   * * onMessage - When the transaction comes back as pending_ or incomplete.
   * * onSuccess - When the transaction comes back as completed / refunded / expired.
   * * onError - When there's a runtime error, or the transaction comes back as
   * no_market / too_small / too_large / error.
   */
  watchOneTransaction({
    authToken,
    assetCode,
    id,
    onMessage,
    onSuccess,
    onError,
    timeout = 5000,
    isRetry = false,
    lang = this.anchor.language,
  }: WatchTransactionParams): WatcherResponse {
    const allParams = {
      authToken,
      assetCode,
      id,
      onMessage,
      onSuccess,
      onError,
      timeout,
      isRetry,
      lang,
    };

    // make sure to initiate registries for the given asset code
    // to prevent 'Cannot read properties of undefined' errors
    if (!this._transactionsRegistry[assetCode]) {
      this._transactionsRegistry[assetCode] = {};
    }
    if (!this._oneTransactionWatcher[assetCode]) {
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
    this.anchor
      .sep24()
      .getTransactionBy({ authToken, id, lang })
      .then((transaction: AnchorTransaction) => {
        // make sure we're still watching
        if (!this._watchOneTransactionRegistry[assetCode]?.[id]) {
          return;
        }

        const registeredTransaction =
          this._transactionsRegistry[assetCode][transaction.id];

        // if we've had the transaction before, only report if there is a status change
        if (
          registeredTransaction &&
          registeredTransaction.status === transaction.status
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
              ...allParams,
              isRetry: true,
            });
          }, timeout);
          onMessage(transaction);
        } else if (
          [
            TransactionStatus.completed,
            TransactionStatus.refunded,
            TransactionStatus.expired,
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
          ...allParams,
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
}
