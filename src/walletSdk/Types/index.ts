import { AxiosRequestConfig } from "axios";
import { Server, Networks } from "stellar-sdk";
import { ApplicationConfiguration, StellarConfiguration } from "walletSdk";

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

export type WalletRecovery = {
  servers: Server[];
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

// Export all other types from walletSdk/Types.ts
export * from "./anchor";
export * from "./auth";
export * from "./horizon";
export * from "./interactive";
export * from "./utils";
export * from "./watcher";
