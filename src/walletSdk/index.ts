import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { Networks, Server } from "stellar-sdk";

import { Anchor } from "./Anchor";
import { DefaultSigner, WalletSigner } from "./Auth";
import { Stellar } from "./Horizon";
import { Recovery } from "./Recovery";
import {
  ConfigParams,
  StellarConfigurationParams,
  WalletAnchor,
  WalletParams,
  WalletRecovery,
  NETWORK_URLS,
} from "./Types";
import { getUrlDomain } from "./Utils";

/* tslint:disable-next-line:no-var-requires */
const version = require("../../package.json").version;
const walletHeaders = {
  "X-Client-Name": "typescript-wallet-sdk",
  "X-Client-Version": version,
};

export class Wallet {
  private cfg: Config;
  private language: string;

  static TestNet = (): Wallet => {
    return new Wallet({
      stellarConfiguration: StellarConfiguration.TestNet(),
    });
  };

  static MainNet = (): Wallet => {
    return new Wallet({
      stellarConfiguration: StellarConfiguration.MainNet(),
    });
  };

  constructor({
    stellarConfiguration,
    applicationConfiguration = new ApplicationConfiguration(),
    // Defaults wallet language to "en", this will reflect in all Anchor API calls
    language = "en",
  }: WalletParams) {
    this.cfg = new Config({ stellarConfiguration, applicationConfiguration });
    this.language = language;
  }

  anchor({ homeDomain, language = this.language }: WalletAnchor): Anchor {
    const url =
      homeDomain.indexOf("://") !== -1 ? homeDomain : `https://${homeDomain}`;

    return new Anchor({
      cfg: this.cfg,
      homeDomain: getUrlDomain(url),
      httpClient: this.cfg.app.defaultClient,
      language,
    });
  }

  stellar() {
    return new Stellar(this.cfg);
  }

  recovery({ servers }: WalletRecovery): Recovery {
    return new Recovery({
      cfg: this.cfg,
      stellar: this.stellar(),
      httpClient: this.cfg.app.defaultClient,
      servers,
    });
  }
}

export class Config {
  stellar: StellarConfiguration;
  app: ApplicationConfiguration;

  constructor({
    stellarConfiguration,
    applicationConfiguration,
  }: ConfigParams) {
    this.stellar = stellarConfiguration;
    this.app = applicationConfiguration;
  }
}

export class StellarConfiguration {
  server: Server;
  network: Networks;
  horizonUrl: string;
  baseFee: number;
  defaultTimeout: number;

  static TestNet = (): StellarConfiguration => {
    return new StellarConfiguration({
      network: Networks.TESTNET,
      horizonUrl: NETWORK_URLS.TESTNET,
    });
  };

  static MainNet = (): StellarConfiguration => {
    return new StellarConfiguration({
      network: Networks.PUBLIC,
      horizonUrl: NETWORK_URLS.PUBLIC,
    });
  };

  constructor({
    network,
    horizonUrl,
    baseFee = 100,
    defaultTimeout = 180,
  }: StellarConfigurationParams) {
    this.network = network;
    this.horizonUrl = horizonUrl;
    this.baseFee = baseFee;
    this.defaultTimeout = defaultTimeout;
    this.server = new Server(horizonUrl);
  }
}

export const DefaultClient = axios.create({
  headers: {
    ...walletHeaders,
  },
});

export class ApplicationConfiguration {
  defaultSigner: WalletSigner;
  defaultClient: AxiosInstance;
  defaultClientDomain?: string;

  constructor(
    defaultSigner?: WalletSigner,
    defaultClient?: AxiosInstance,
    defaultClientDomain?: string,
  ) {
    this.defaultSigner = defaultSigner || DefaultSigner;
    this.defaultClient = defaultClient || DefaultClient;
    this.defaultClientDomain = defaultClientDomain;
  }
}
