import { StellarTomlResolver } from "stellar-sdk";
import axios from "axios";

import { Auth } from "../auth";
import { Interactive } from "../interactive";
import { TomlInfo, parseToml } from "../toml";
import { ServerRequestFailedError } from "../exception";

// Do not create this object directly, use the Wallet class.
export class Anchor {
  private homeDomain = "";
  private httpClient = null;
  private cfg;
  private toml: TomlInfo;

  constructor(cfg, homeDomain: string, httpClient) {
    this.homeDomain = homeDomain;
    this.httpClient = httpClient;
    this.cfg = cfg;
  }

  async getInfo(): Promise<TomlInfo> {
    const stellarToml = await StellarTomlResolver.resolve(this.homeDomain);
    const parsedToml = parseToml(stellarToml);
    this.toml = parsedToml;
    return parsedToml;
  }

  async auth() {
    const toml = this.toml || await this.getInfo();
    return new Auth(toml.webAuthEndpoint);
  }

  interactive() {
    return new Interactive(this.homeDomain, this);
  }

  async getServicesInfo() {
    const toml = this.toml || await this.getInfo();
    const transferServerEndpoint = toml.transferServerSep24;

    try {
      // TODO - use httpClient
      const resp = await axios.get(`${transferServerEndpoint}/info`, {
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
