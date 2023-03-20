import { Anchor } from "./anchor";

export enum NETWORKS {
  PUBLIC = "PUBLIC",
  TESTNET = "TESTNET",
}

export class Wallet {
  network: NETWORKS = NETWORKS.TESTNET;

  constructor(network) {
    this.network = network;
  }

  anchor(domain) {
    return new Anchor(domain);
  }
}
