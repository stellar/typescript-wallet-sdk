import { Config } from "walletSdk";
import { AccountService } from "./AccountService";

// Do not create this object directly, use the Wallet class.
export class Stellar {
  private cfg: Config;
  
  constructor(cfg: Config) {
    this.cfg = cfg;
  }

  account(): AccountService {
    return new AccountService(this.cfg);
  }
}
