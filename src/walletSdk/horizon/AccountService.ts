import { Keypair } from "stellar-sdk";

import { SigningKeypair } from "./Account";
import { Config } from "walletSdk";

// Do not create this object directly, use the Wallet class.
export class AccountService {
  private server;
  private network;

  constructor(cfg: Config) {
    this.server = cfg.stellar.server;
    this.network = cfg.stellar.network;
  }

  createKeypair(): SigningKeypair {
    return new SigningKeypair(Keypair.random());
  }
}
