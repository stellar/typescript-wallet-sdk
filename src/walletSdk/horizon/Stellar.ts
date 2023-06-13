// TODO - https://stellarorg.atlassian.net/browse/WAL-814?atlOrigin=eyJpIjoiMWY5MjBkZTE4MTg3NDA3N2E0MjYwMmQ2ZmRhOGFiODUiLCJwIjoiaiJ9

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
