import StellarSdk, { Networks, Server } from "stellar-sdk";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

import { Anchor } from "./anchor";
import { WalletSigner, DefaultSigner } from "./auth/WalletSigner";
import { Stellar } from "./horizon/Stellar";
import { NETWORK_URLS } from "./horizon/constants";
import { Recovery } from "./recovery/Recovery";
import { getUrlDomain } from "./util/url";

/* tslint:disable-next-line:no-var-requires */
const version = require("../../package.json").version;
const walletHeaders = {
  "X-Client-Name": "typescript-wallet-sdk",
  "X-Client-Version": version,
};

class Config {
  app: ApplicationConfiguration;
  stellar: StellarConfiguration;
  constructor(stellarCfg, appCfg) {
    this.stellar = stellarCfg;
    this.app = appCfg;
  }
}

export class Wallet {
  private cfg: Config;

  static TestNet = (): Wallet => {
    return new Wallet(StellarConfiguration.TestNet());
  };

  static MainNet = (): Wallet => {
    return new Wallet(StellarConfiguration.MainNet());
  };

  constructor(
    stellarConfiguration: StellarConfiguration,
    applicationConfiguration: ApplicationConfiguration = new ApplicationConfiguration()
  ) {
    this.cfg = new Config(stellarConfiguration, applicationConfiguration);
  }

  anchor(homeDomain: string, httpClientConfig: AxiosRequestConfig = {}) {
    const url =
      homeDomain.indexOf("://") !== -1 ? homeDomain : `https://${homeDomain}`;
    return new Anchor(
      this.cfg,
      getUrlDomain(url),
      this.getClient(httpClientConfig)
    );
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
