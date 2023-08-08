import { Keypair, Networks, Server } from "stellar-sdk";

import { Config } from "walletSdk";
import { SigningKeypair } from "./Account";

// ALEC TODO - name
import { getRandomBytes } from "../Utils/sdk-crypto";

// Do not create this object directly, use the Wallet class.
export class AccountService {
  private server: Server;
  private network: Networks;

  constructor(cfg: Config) {
    this.server = cfg.stellar.server;
    this.network = cfg.stellar.network;
  }

  createKeypair(): SigningKeypair {
    const kp = Keypair.fromRawEd25519Seed(getRandomBytes());
    console.log({ kp }); // ALEC TODO - remove
    return new SigningKeypair(Keypair.random());
  }
}
