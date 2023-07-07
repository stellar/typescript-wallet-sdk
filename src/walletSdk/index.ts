import StellarSdk, { Networks, Server } from "stellar-sdk";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

import { Anchor } from "./Anchor";
import { WalletSigner, DefaultSigner } from "./Auth/WalletSigner";
import { Stellar } from "./Horizon/Stellar";
import { NETWORK_URLS } from "./Types";
import { Recovery } from "./Recovery";
import { getUrlDomain } from "./Util/url";

/* tslint:disable-next-line:no-var-requires */
const version = require("../../package.json").version;
const walletHeaders = {
  "X-Client-Name": "typescript-wallet-sdk",
  "X-Client-Version": version,
};

export class Config {
  app: ApplicationConfiguration;
  stellar: StellarConfiguration;
  constructor(stellarCfg, appCfg) {
    this.stellar = stellarCfg;
    this.app = appCfg;
  }
}

export class Wallet {
  private cfg: Config;
  private language: string;

  static TestNet = (): Wallet => {
    return new Wallet(StellarConfiguration.TestNet());
  };

  static MainNet = (): Wallet => {
    return new Wallet(StellarConfiguration.MainNet());
  };

  constructor(
    stellarConfiguration: StellarConfiguration,
    applicationConfiguration: ApplicationConfiguration = new ApplicationConfiguration(),
    // Defaults wallet language to "en", this will reflect in all Anchor API calls
    language: string = "en"
  ) {
    this.cfg = new Config(stellarConfiguration, applicationConfiguration);
    this.language = language;
  }

  anchor(
    homeDomain: string,
    httpClientConfig: AxiosRequestConfig = {},
    language: string = this.language
  ) {
    const url =
      homeDomain.indexOf("://") !== -1 ? homeDomain : `https://${homeDomain}`;

    return new Anchor({
      cfg: this.cfg,
      homeDomain: getUrlDomain(url),
      httpClient: this.getClient(httpClientConfig),
      language,
    });
  }

  stellar() {
    return new Stellar(this.cfg);
  }

  recover(servers, httpClientConfig: AxiosRequestConfig = {}) {
    return new Recovery(
      this.cfg,
      this.stellar(),
      this.getClient(httpClientConfig),
      servers
    );
  }

  getClient(httpClientConfig: AxiosRequestConfig = {}) {
    return axios.create({
      headers: {
        ...walletHeaders,
        ...httpClientConfig.headers,
      },
      ...httpClientConfig,
    });
  }
}

export class StellarConfiguration {
  server: Server;
  network: Networks;
  horizonUrl: string;
  baseFee: number;

  static TestNet = (): StellarConfiguration => {
    return new StellarConfiguration(Networks.TESTNET, NETWORK_URLS.TESTNET);
  };

  static MainNet = (): StellarConfiguration => {
    return new StellarConfiguration(Networks.PUBLIC, NETWORK_URLS.PUBLIC);
  };

  constructor(network, horizonUrl, baseFee = 100) {
    this.network = network;
    this.baseFee = baseFee;
    this.horizonUrl = horizonUrl;
    this.server = new Server(horizonUrl);
  }
}

export class ApplicationConfiguration {
  defaultSigner: WalletSigner;
  defaultClient: AxiosInstance;
  constructor(defaultSigner: WalletSigner = DefaultSigner) {
    this.defaultSigner = defaultSigner;
    this.defaultClient = axios.create({
      headers: {
        ...walletHeaders,
      },
    });
  }
}
