import { RawAxiosRequestHeaders } from "axios";
import { Networks } from "@stellar/stellar-sdk";
import { ApplicationConfiguration, StellarConfiguration } from "walletSdk";
import { RecoveryServerMap } from "./recovery";

// Export types from root walletSdk/index.ts
export type WalletParams = {
  stellarConfiguration: StellarConfiguration;
  applicationConfiguration?: ApplicationConfiguration;
  language?: string;
};

export type WalletAnchor = {
  homeDomain: string;
  language?: string;
};

export type WalletRecoveryServers = {
  servers: RecoveryServerMap;
};

export type ConfigParams = {
  stellarConfiguration: StellarConfiguration;
  applicationConfiguration?: ApplicationConfiguration;
};

export type StellarConfigurationParams = {
  network: Networks;
  horizonUrl: string;
  baseFee?: number;
  defaultTimeout?: number;
};

export type AxiosErrorData = {
  status?: number;
  statusText?: string;
  // eslint-disable-next-line
  responseData?: any;
  headers?: RawAxiosRequestHeaders;
};

// Export all other types from walletSdk/Types.ts
export * from "./anchor";
export * from "./auth";
export * from "./horizon";
export * from "./recovery";
export * from "./sep6";
export * from "./sep12";
export * from "./sep24";
export * from "./sep38";
export * from "./utils";
export * from "./watcher";
