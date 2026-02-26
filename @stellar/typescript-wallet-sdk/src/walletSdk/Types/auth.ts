import { Transaction } from "@stellar/stellar-sdk";
import { decode } from "jws";

import { WalletSigner } from "../Auth/WalletSigner";
import { AccountKeypair, SigningKeypair } from "../Horizon/Account";
import { AuthHeaderSigner } from "../Auth/AuthHeaderSigner";

export type AuthenticateParams = {
  accountKp: AccountKeypair;
  walletSigner?: WalletSigner;
  memoId?: string;
  clientDomain?: string;
  authHeaderSigner?: AuthHeaderSigner;
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
    // jws.decode only auto-parses payload as JSON when header contains
    // typ:"JWT". Some anchors omit typ, returning a raw JSON string instead.
    const payload =
      typeof decoded.payload === "string"
        ? JSON.parse(decoded.payload)
        : decoded.payload;
    authToken.issuer = payload.iss;
    authToken.principalAccount = payload.sub;
    authToken.issuedAt = payload.iat;
    authToken.expiresAt = payload.exp;
    authToken.clientDomain = payload.client_domain;
    authToken.token = str;
    return authToken;
  };
}

export type ChallengeParams = {
  accountKp: AccountKeypair;
  memoId?: string;
  clientDomain?: string;
  authHeaderSigner?: AuthHeaderSigner;
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

export type SignChallengeTxnParams = {
  accountKp: SigningKeypair;
  challengeTx: string;
  networkPassphrase: string;
  anchorDomain: string;
};

export type SignChallengeTxnResponse = {
  transaction: XdrEncodedTransaction;
  networkPassphrase: NetworkPassphrase;
};

export type AuthHeaderClaims = {
  account: string;
  home_domain: string;
  web_auth_endpoint: string;
  memo?: string;
  client_domain?: string;
  exp?: number;
  iat?: number;
};

export type AuthHeaderCreateTokenParams = {
  claims: AuthHeaderClaims;
  clientDomain?: string;
  issuer?: AccountKeypair;
};
