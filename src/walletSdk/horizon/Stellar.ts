import { AccountService } from "./AccountService";

// Do not create this object directly, use the Wallet class.
export class Stellar {
  private cfg;
  constructor(cfg) {
    this.cfg = cfg;
  }

  account(): AccountService {
    return new AccountService(this.cfg);
  }
}
