import { AxiosInstance } from "axios";
import { StellarTomlResolver } from "stellar-sdk";

import { Config } from "walletSdk";
import { Sep10 } from "../Auth";
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

  async sep10(): Promise<Sep10> {
    const tomlInfo = await this.sep1();
    return new Sep10({
      cfg: this.cfg,
      webAuthEndpoint: tomlInfo.webAuthEndpoint,
      homeDomain: this.homeDomain,
      httpClient: this.httpClient,
    });
  }

  sep24(): Sep24 {
    return new Sep24({ anchor: this, httpClient: this.httpClient });
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
