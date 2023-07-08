import { AnchorTransaction } from "./anchor";

export type WatchTransactionsParams = {
  authToken: string;
  assetCode: string;
  onMessage: (transaction: AnchorTransaction) => void;
  onError: (error: AnchorTransaction | Error) => void;
  watchlist?: string[];
  timeout?: number;
  isRetry?: boolean;
  lang?: string;
  kind?: string;
  noOlderThan?: string;
};

export type WatchTransactionParams = {
  authToken: string;
  assetCode: string;
  id: string;
  onMessage: (transaction: AnchorTransaction) => void;
  onSuccess: (transaction: AnchorTransaction) => void;
  onError: (error: AnchorTransaction | Error) => void;
  timeout?: number;
  isRetry?: boolean;
  lang?: string;
}

export type WatcherRefreshFunction = () => void;
export type WatcherStopFunction = () => void;

export interface WatcherResponse {
  refresh: WatcherRefreshFunction;
  stop: WatcherStopFunction;
}