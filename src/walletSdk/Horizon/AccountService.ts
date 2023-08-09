import { Keypair, Networks, Server } from "stellar-sdk";

import { Config } from "walletSdk";
import { SigningKeypair } from "./Account";

// Do not create this object directly, use the Wallet class.
export class AccountService {
  private server: Server;
  private network: Networks;

  constructor(cfg: Config) {
    this.server = cfg.stellar.server;
    this.network = cfg.stellar.network;
  }

  createKeypair(): SigningKeypair {
    return new SigningKeypair(Keypair.random());
  }

  createKeypairFromRandom(randomBytes: Buffer): SigningKeypair {
    return new SigningKeypair(Keypair.fromRawEd25519Seed(randomBytes));
  }
}
