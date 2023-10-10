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
  [id: string]: AnchorTransaction;
}

interface TransactionsRegistry {
  [assetCode: string]: TransactionsRegistryAsset;
}

/**
 * Used for watching transaction from an Anchor as part of sep-24.
 * Do not create this object directly, use the Anchor class.
 * @class
 */
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

  /**
   * Creates a new instance of the Watcher class.
   *
   * @param {Anchor} anchor - The Anchor to watch from.
   */
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
   * - Any new transaction appears
   * - Any of the initial pending transactions change any state
   *
   * You may also provide an array of transaction ids, `watchlist`, and this
   * watcher will always react to transactions whose ids are in the watchlist.
   * @param {string} params.authToken - The authentication token used for authenticating with th anchor.
   * @param {string} params.assetCode - The asset code to filter transactions by.
   * @param {function} params.onMessage - A callback function to handle incoming transaction messages.
   * @param {function} params.onError - A callback function to handle errors during transaction streaming.
   * @param {Array<string>} [params.watchlist=[]] - An optional array of specific transaction IDs to watch.
   * @param {number} [params.timeout=5000] - The timeout duration for the streaming connection (in milliseconds).
   * @param {boolean} [params.isRetry=false] - Indicates whether this is a retry attempt (optional).
   * @param {string} [params.lang=this.anchor.language] - The desired language (localization) for transaction messages.
   * @param {string} params.kind - The kind of transaction to filter by.
   * @param {string} [params.noOlderThan] - A date and time specifying that transactions older than this value should not be included.
   * @returns {WatcherResponse} An object holding the refresh and stop functions for the watcher.
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
   * @param {string} params.authToken - The authentication token used for authenticating with th anchor.
   * @param {string} params.assetCode - The asset code to filter transactions by.
   * @param {string} params.id - The id of the transaction to watch.
   * @param {function} params.onMessage - A callback function to handle incoming transaction messages.
   * @param {function} params.onSuccess - If a transaction status is in a end state (eg. completed, refunded, expired) then this callback is called.
   * @param {function} params.onError - A callback function to handle errors during transaction streaming.
   * @param {number} [params.timeout=5000] - The timeout duration for the streaming connection (in milliseconds).
   * @param {boolean} [params.isRetry=false] - Indicates whether this is a retry attempt (optional).
   * @param {string} [params.lang=this.anchor.language] - The desired language (localization) for transaction messages.
   * @returns {WatcherResponse} An object holding the refresh and stop functions for the watcher.
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
        let isChanged = true;
        if (
          registeredTransaction &&
          registeredTransaction.status === transaction.status
        ) {
          isChanged = false;
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
          if (isChanged) {
            onMessage(transaction);
          }
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
