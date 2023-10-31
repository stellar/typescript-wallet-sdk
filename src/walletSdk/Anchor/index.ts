import { AxiosInstance } from "axios";
import { StellarTomlResolver } from "stellar-sdk";

import { Config } from "walletSdk";
import { Sep10 } from "../Auth";
import { Sep12 } from "../Customer";
import {
  ServerRequestFailedError,
  KYCServerNotFoundError,
} from "../Exceptions";
import { Sep6 } from "./Sep6";
import { Sep24 } from "./Sep24";
import { AnchorServiceInfo, TomlInfo } from "../Types";
import { parseToml } from "../Utils";

// Let's prevent exporting this constructor type as
// we should not create this Anchor class directly.
type AnchorParams = {
  cfg: Config;
  homeDomain: string;
  httpClient: AxiosInstance;
  language: string;
};

// // ALEC TODO - better alias
// export type Sep6 = Sep6;

export type Interactive = Sep24;

export type Auth = Sep10;

export type Customer = Sep12;

/**
 * Build on/off ramps with anchors.
 * Do not create this object directly, use the Wallet class.
 * @class
 */
export class Anchor {
  public language: string;

  private cfg: Config;
  private homeDomain: string;
  private httpClient: AxiosInstance;
  private toml: TomlInfo;

  /**
   * Creates a new Anchor instance.
   * @constructor
   * @param {AnchorParams} params - The parameters to initialize the Anchor.
   */
  constructor(params: AnchorParams) {
    const { cfg, homeDomain, httpClient, language } = params;

    this.cfg = cfg;
    this.homeDomain = homeDomain;
    this.httpClient = httpClient;
    this.language = language;
  }

  /**
   * Get anchor information from a TOML file.
   * If `shouldRefresh` is set to `true`, it fetches fresh TOML values; otherwise, it returns cached values if available.
   * @param {boolean} [shouldRefresh=false] - Flag to force a refresh of TOML values.
   * @returns {Promise<TomlInfo>} - TOML information about the anchor.
   */
  async sep1(shouldRefresh?: boolean): Promise<TomlInfo> {
    // return cached TOML values by default
    if (this.toml && !shouldRefresh) {
      return this.toml;
    }

    // fetch fresh TOML values from Anchor domain
    const stellarToml = await StellarTomlResolver.resolve(this.homeDomain);
    const parsedToml = parseToml(stellarToml);
    this.toml = parsedToml;
    return parsedToml;
  }

  /**
   * Retrieves and returns TOML information using the `sep1` method.
   * @param {boolean} [shouldRefresh=false] - Flag to force a refresh of TOML values.
   * @returns {Promise<TomlInfo>} - TOML information.
   */
  async getInfo(shouldRefresh?: boolean): Promise<TomlInfo> {
    return this.sep1(shouldRefresh);
  }

  /**
   * ALEC TODO - comment. It can be used for withdrawal or deposit.
   * @returns {Sep6} - interactive flow service.
   */
  sep6(): Sep6 {
    return new Sep6({ anchor: this, httpClient: this.httpClient });
  }

  // ALEC TODO - alias method

  /**
   * Create new auth object to authenticate account with the anchor using SEP-10.
   * @returns {Promise<Sep10>} - The SEP-10 authentication manager.
   */
  async sep10(): Promise<Sep10> {
    const tomlInfo = await this.sep1();
    return new Sep10({
      cfg: this.cfg,
      webAuthEndpoint: tomlInfo.webAuthEndpoint,
      homeDomain: this.homeDomain,
      httpClient: this.httpClient,
    });
  }

  /**
   * Create new auth object to authenticate with using the `sep10` method.
   * @returns {Promise<Auth>} - The SEP-10 authentication manager.
   */
  async auth(): Promise<Auth> {
    return this.sep10();
  }

  /**
   * Create new customer object to handle customer records with the anchor using SEP-12.
   * @param {string} authToken - The authentication token.
   * @returns {Promise<Sep12>} - A Sep12 customer instance.
   * @throws {KYCServerNotFoundError} - If the KYC server information is not available.
   */
  async sep12(authToken: string): Promise<Sep12> {
    const tomlInfo = await this.sep1();
    const kycServer = tomlInfo?.kycServer;
    if (!kycServer) {
      throw new KYCServerNotFoundError();
    }
    return new Sep12(authToken, kycServer, this.httpClient);
  }

  /**
   * Create new customer object to handle customer records using the `sep12` method.
   * @param {string} authToken - The authentication token.
   * @returns {Promise<Customer>} - A Customer instance.
   */
  async customer(authToken: string): Promise<Customer> {
    return this.sep12(authToken);
  }

  /**
   * Creates new interactive flow for given anchor. It can be used for withdrawal or deposit.
   * @returns {Sep24} - interactive flow service.
   */
  sep24(): Sep24 {
    return new Sep24({ anchor: this, httpClient: this.httpClient });
  }

  /**
   * Creates new interactive flow using the `sep24` method.
   * @returns {Interactive} - interactive flow service
   */
  interactive(): Interactive {
    return this.sep24();
  }

  /**
   * Get information about an Anchor.
   * @param {string} [lang=this.language] - The language in which to retrieve information.
   * @returns {Promise<AnchorServiceInfo>} An object containing information about the Anchor.
   * @throws {ServerRequestFailedError} If the http request fails.
   */
  async getServicesInfo(
    lang: string = this.language,
  ): Promise<AnchorServiceInfo> {
    const toml = await this.sep1();
    const transferServerEndpoint = toml.transferServerSep24;

    try {
      const resp = await this.httpClient.get(
        `${transferServerEndpoint}/info?lang=${lang}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const servicesInfo: AnchorServiceInfo = resp.data;

      return servicesInfo;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}
