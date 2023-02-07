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

  async auth(publicKey: string) {
    const tomlInfo = await this.getInfo();
    const auth = new Auth(tomlInfo.WEB_AUTH_ENDPOINT, publicKey);

    // ALEC TODO - remove
    console.log(auth.authenticate()); // ALEC TODO - remove
  }

  getServicesInfo() {}

  getTransaction() {}

  getTransactionForAsset() {}

  getHistory() {}

  interactive() {}
}
