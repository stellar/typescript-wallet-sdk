// import StellarSdk from "stellar-sdk";
import { Anchor } from "./Anchor";

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
