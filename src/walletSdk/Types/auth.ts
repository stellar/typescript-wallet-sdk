import { Transaction } from "@stellar/stellar-sdk";
import { decode } from "jws";

import { WalletSigner } from "../Auth/WalletSigner";
import { AccountKeypair } from "../Horizon/Account";

export type AuthenticateParams = {
  accountKp: AccountKeypair;
  walletSigner?: WalletSigner;
  memoId?: string;
  clientDomain?: string;
};

export class AuthToken {
  public token: string;
  public issuer: string;
  public issuedAt: string;
  public expiresAt: string;
  public clientDomain: string;
  private principalAccount: string;

  get account(): string {
    return this.principalAccount.split(":")[0];
  }

  get memo(): string {
    const split = this.principalAccount.split(":");
    if (split.length !== 2) {
      return null;
    }
    return split[1];
  }

  static from = (str: string): AuthToken => {
    const authToken = new AuthToken();

    const decoded = decode(str);
    authToken.issuer = decoded.payload.iss;
    authToken.principalAccount = decoded.payload.sub;
    authToken.issuedAt = decoded.payload.iat;
    authToken.expiresAt = decoded.payload.exp;
    authToken.clientDomain = decoded.payload.client_domain;
    authToken.token = str;
    return authToken;
  };
}

export type ChallengeParams = {
  accountKp: AccountKeypair;
  memoId?: string;
  clientDomain?: string;
};

export type XdrEncodedTransaction = string;
export type NetworkPassphrase = string;

export type ChallengeResponse = {
  transaction: XdrEncodedTransaction;
  network_passphrase: NetworkPassphrase;
};

export type SignParams = {
  accountKp: AccountKeypair;
  challengeResponse: ChallengeResponse;
  walletSigner: WalletSigner;
};

export type SignWithClientAccountParams = {
  transaction: Transaction;
  accountKp: AccountKeypair;
};

export type SignWithDomainAccountParams = {
  transactionXDR: XdrEncodedTransaction;
  networkPassphrase: NetworkPassphrase;
  accountKp: AccountKeypair;
};

export type HttpHeaders = {
  [key: string]: string;
};
