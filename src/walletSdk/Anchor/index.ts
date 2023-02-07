import { StellarTomlResolver } from "stellar-sdk";

export class Anchor {
  domain = "";

  constructor(domain) {
    this.domain = domain;
  }

  async getInfo(): Promise<StellarTomlResolver.StellarToml> {
    return await StellarTomlResolver.resolve(this.domain);
  }

  auth() {}

  getServicesInfo() {}

  getTransaction() {}

  getTransactionForAsset() {}

  getHistory() {}

  interactive() {}
}
