import { AxiosInstance } from "axios";
import { StellarTomlResolver } from "stellar-sdk";

import { Config } from "walletSdk";
import { Sep10 } from "../Auth";
import { Sep12 } from "../Customer";
import { ServerRequestFailedError } from "../Exceptions";
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

export type Interactive = Sep24;

export type Auth = Sep10;

export type Customer = Sep12;

// Do not create this object directly, use the Wallet class.
export class Anchor {
  public language: string;

  private cfg: Config;
  private homeDomain: string;
  private httpClient: AxiosInstance;
  private toml: TomlInfo;

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
   * @returns {Promise<TomlInfo>} - A Promise that resolves to the TOML information.
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
   * @returns {Promise<TomlInfo>} - A Promise that resolves to the TOML information.
   */
  async getInfo(shouldRefresh?: boolean): Promise<TomlInfo> {
    return this.sep1(shouldRefresh);
  }

  /**
   * Create new auth object to authenticate account with the anchor using SEP-10.
   * @returns {Promise<Sep10>} - A Promise that resolves to the authentication manager.
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
   * @returns {Promise<Auth>} - A Promise that resolves to the authentication manager.
   */
  async auth(): Promise<Auth> {
    return this.sep10();
  }

  // ALEC TODO - jscomment
  // ALEC TODO - authtoken type?
  async sep12(authToken: string): Promise<Sep12> {
    const tomlInfo = await this.sep1();
    const kycServer = tomlInfo?.kycServer;
    console.log({ kycServer }); // ALEC TODO - remove
    if (!kycServer) {
      // ALEC TODO -
      throw new Error("Missing kyc server value from toml info");
    }
    return new Sep12(authToken, kycServer, this.httpClient);
  }

  // ALEC TODO - auth authToken type?
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
