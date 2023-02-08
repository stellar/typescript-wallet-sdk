import { StellarTomlResolver } from "stellar-sdk";

// ALEC TODO - figure out imports
import { Auth } from "../Auth";

export class Anchor {
  domain = "";

  constructor(domain) {
    this.domain = domain;
  }

  async getInfo(): Promise<StellarTomlResolver.StellarToml> {
    return await StellarTomlResolver.resolve(this.domain);
  }

  async auth(privateKey: string) {
    const tomlInfo = await this.getInfo();
    return new Auth(tomlInfo.WEB_AUTH_ENDPOINT, privateKey);
  }

  interactive() {}

  getServicesInfo() {}

  getTransaction() {}

  getTransactionForAsset() {}

  getHistory() {}
}
