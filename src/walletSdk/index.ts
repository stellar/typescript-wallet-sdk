import axios, { AxiosInstance } from "axios";
import { Networks, Horizon } from "stellar-sdk";

import { Anchor } from "./Anchor";
import { DefaultSigner, WalletSigner } from "./Auth";
import { Stellar } from "./Horizon";
import { Recovery } from "./Recovery";
import {
  ConfigParams,
  StellarConfigurationParams,
  WalletAnchor,
  WalletParams,
  WalletRecoveryServers,
  NETWORK_URLS,
} from "./Types";
import { getUrlDomain } from "./Utils";

/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const version = require("../../package.json").version;
const walletHeaders = {
  "X-Client-Name": "typescript-wallet-sdk",
  "X-Client-Version": version,
};

/**
 * The Wallet SDK main entry point class. From these class methods you can create a
 * wallet on the Stellar network.
 * @class
 */
export class Wallet {
  private cfg: Config;
  private language: string;

  /**
   * Creates a Wallet instance configured to the test network.
   * @returns {Wallet} A Wallet instance configured to the test network.
   */
  static TestNet = (): Wallet => {
    return new Wallet({
      stellarConfiguration: StellarConfiguration.TestNet(),
    });
  };

  /**
   * Creates a Wallet instance configured to the public network.
   * @returns {Wallet} A Wallet instance configured to the public network.
   */
  static MainNet = (): Wallet => {
    return new Wallet({
      stellarConfiguration: StellarConfiguration.MainNet(),
    });
  };

  /**
   * Creates a new Wallet instance.
   * @param {WalletParams} params - The Wallet params.
   * @param {StellarConfiguration} params.stellarConfiguration - The Stellar configuration.
   * @param {ApplicationConfiguration} params.applicationConfiguration - The Application configuration.
   * @param {string} [params.language] - The default langauge to use.
   */
  constructor({
    stellarConfiguration,
    applicationConfiguration = new ApplicationConfiguration(),
    // Defaults wallet language to "en", this will reflect in all Anchor API calls
    language = "en",
  }: WalletParams) {
    this.cfg = new Config({ stellarConfiguration, applicationConfiguration });
    this.language = language;
  }

  /**
   * Create an Anchor instance for interacting with an Anchor.
   * @param {WalletAnchor} params - The anchor params.
   * @param {string} params.homeDomain - The home domain of the anchor. This domain will be used for
   * things like getting the toml info.
   * @param {string} [params.language=this.language] - The language setting for the Anchor.
   * @returns {Anchor} An Anchor instance.
   */
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

  /**
   * Create a Stellar instance for interacting with the Stellar network.
   * @returns {Stellar} A Stellar instance.
   */
  stellar(): Stellar {
    return new Stellar(this.cfg);
  }

  /**
   * Create a Recovery instance for account recovery using SEP-30.
   * @param {WalletRecoveryServers} servers - A map of recovery servers.
   * @returns {Recovery} A Recovery instance.
   */
  recovery({ servers }: WalletRecoveryServers): Recovery {
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
  server: Horizon.Server;
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
    this.server = new Horizon.Server(horizonUrl);
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
