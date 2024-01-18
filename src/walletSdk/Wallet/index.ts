import FreighterApi from "@stellar/freighter-api";
import { Account, SorobanRpc } from "@stellar/stellar-sdk";

export const NULL_ACCOUNT =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export class Wallet {
  private isConnected: () => Promise<boolean>;
  private isAllowed: () => Promise<boolean>;
  private getUserInfo: () => Promise<{ publicKey: string }>;

  private server: SorobanRpc.Server;

  /**
   * Creates a new Wallet instance.
   * @constructor
   */
  constructor() {
    this.isConnected = FreighterApi.isConnected;
    this.isAllowed = FreighterApi.isAllowed;
    this.getUserInfo = FreighterApi.getUserInfo;
  }

  getPublicKey = async (): Promise<string | undefined> => {
    if (!(await this.isConnected()) || !(await this.isAllowed())) {
      return undefined;
    }
    return (await this.getUserInfo()).publicKey;
  };

  getAccount = async (): Promise<Account> => {
    const publicKey = await this.getPublicKey();
    return publicKey
      ? await this.server.getAccount(publicKey)
      : new Account(NULL_ACCOUNT, "0");
  };
}
