import { StellarTomlResolver } from "stellar-sdk";
import axios from "axios";

import { Auth } from "../auth";
import { Interactive } from "../interactive";
import { TomlInfo, parseToml } from "../toml";
import { ServerRequestFailedError } from "../exception";

export class Anchor {
  private homeDomain = "";

  constructor(homeDomain) {
    this.homeDomain = homeDomain;
  }

  async getInfo(): Promise<TomlInfo> {
    const toml = await StellarTomlResolver.resolve(this.homeDomain);
    return parseToml(toml);
  }

  async auth() {
    const tomlInfo = await this.getInfo();
    return new Auth(tomlInfo.webAuthEndpoint);
  }

  interactive() {
    return new Interactive(this.homeDomain, this);
  }

  async getServicesInfo() {
    const toml = await this.getInfo();
    const transferServerEndpoint = toml.transferServerSep24;

    try {
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
