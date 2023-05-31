import StellarSdk, { Networks, Server } from "stellar-sdk";

import { Anchor } from "./Anchor";
import { WalletSigner, DefaultSigner } from "./Auth/WalletSigner";
import { Stellar } from "./horizon/Stellar";
import { NETWORK_URLS } from "./horizon/constants";
import { Recovery } from "./recovery/Recovery";
import { getUrlDomain } from "./util/url";

// TODO - https://stellarorg.atlassian.net/browse/WAL-789?atlOrigin=eyJpIjoiZjcwNzZhOTJmNjE1NGRhNTk1NDlkOTExMTYxMDJkZmYiLCJwIjoiaiJ9
interface ClientConfigFn {}
interface ClientConfig {}
export class HttpClient {}

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
  private clients = [];
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
    language: string = "en",
  ) {
    this.cfg = new Config(stellarConfiguration, applicationConfiguration);
    this.language = language;
  }

  anchor(
    homeDomain: string, 
    httpClientConfig: ClientConfigFn = null,
    language: string = this.language,
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

  recover(servers, httpClientConfig) {
    return new Recovery(
      this.cfg,
      this.stellar(),
      this.getClient(httpClientConfig),
      servers
    );
  }

  getClient(httpClientConfig?) {
    // TODO - create an httpClient object from the passed in config object
    const httpClient = null;
    if (httpClient) {
      this.clients.push(httpClient);
    }
    return httpClient ? httpClient : this.cfg.app.defaultClient;
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
  defaultClient: HttpClient;
  constructor(
    defaultSigner: WalletSigner = DefaultSigner,
    defaultCliengConfig: ClientConfig = {}
  ) {
    this.defaultSigner = defaultSigner;
    // TODO - default client
    this.defaultClient = new HttpClient();
  }
}
