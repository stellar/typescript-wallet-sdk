import { StellarTomlResolver } from "stellar-sdk";

import { Auth } from "../Auth";
import { Interactive } from "../interactive";
import { TomlInfo, parseToml } from "../toml";
import { ServerRequestFailedError } from "../exception";

// Do not create this object directly, use the Wallet class.
export class Anchor {
  private homeDomain = "";
  private httpClient = null;
  private cfg;

  constructor(cfg, homeDomain: string, httpClient) {
    this.homeDomain = homeDomain;
    this.httpClient = httpClient;
    this.cfg = cfg;
  }

  async getInfo(): Promise<TomlInfo> {
    const toml = await StellarTomlResolver.resolve(this.homeDomain);
    return parseToml(toml);
  }

  async auth() {
    const tomlInfo = await this.getInfo();
    return new Auth(this.cfg, tomlInfo.webAuthEndpoint, this.httpClient);
  }

  interactive() {
    return new Interactive(this.homeDomain, this, this.httpClient);
  }

  async getServicesInfo() {
    const toml = await this.getInfo();
    const transferServerEndpoint = toml.transferServerSep24;

    try {
      const resp = await this.httpClient.get(`${transferServerEndpoint}/info`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  getTransaction() {}

  getTransactionForAsset() {}

  getHistory() {}
}
