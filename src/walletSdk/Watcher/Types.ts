export type WatcherRefreshFunction = () => void;
export type WatcherStopFunction = () => void;

export interface WatcherResponse {
  refresh: WatcherRefreshFunction;
  stop: WatcherStopFunction;
}