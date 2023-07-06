import { AxiosInstance } from "axios";
import StellarSdk, { Transaction } from "stellar-sdk";

import { Config } from "walletSdk";
import {
  InvalidMemoError,
  ClientDomainWithMemoError,
  ServerRequestFailedError,
} from "../Exception";
import { 
  AuthenticateParams, 
  AuthToken, 
  ChallengeParams, 
  ChallengeResponse, 
  SignParams 
} from "../Types";

// Let's keep this constructor type private as
// we should not create this Anchor class directly.
type AuthParams = {
  cfg: Config;
  webAuthEndpoint: string;
  homeDomain: string;
  httpClient: AxiosInstance;
};

// Do not create this object directly, use the Wallet class.
export class Auth {
  private cfg: Config;
  private webAuthEndpoint: string;
  private homeDomain: string;
  private httpClient: AxiosInstance;

  constructor(params: AuthParams) {
    const {
      cfg,
      webAuthEndpoint,
      homeDomain,
      httpClient,
    } = params;

    this.cfg = cfg;
    this.webAuthEndpoint = webAuthEndpoint;
    this.homeDomain = homeDomain;
    this.httpClient = httpClient;
  }

  async authenticate({
    accountKp,
    walletSigner,
    memoId,
    clientDomain,
  }: AuthenticateParams): Promise<AuthToken> {
    const challengeResponse = await this.challenge({
      accountKp,
      memoId,
      clientDomain
    });
    const signedTx = this.sign({
      accountKp,
      challengeResponse,
      walletSigner: walletSigner ?? this.cfg.app.defaultSigner
    });
    return await this.getToken(signedTx);
  }

  private async challenge({
    accountKp,
    memoId,
    clientDomain,
  }: ChallengeParams): Promise<ChallengeResponse> {
    if (memoId && parseInt(memoId) < 0) {
      throw new InvalidMemoError();
    }
    if (clientDomain && memoId) {
      throw new ClientDomainWithMemoError();
    }
    const url = `${this.webAuthEndpoint}?account=${accountKp.publicKey()}${
      memoId ? `&memo=${memoId}` : ""
    }${clientDomain ? `&client_domain=${clientDomain}` : ""}${
      this.homeDomain ? `&home_domain=${this.homeDomain}` : ""
    }`;
    try {
      const auth = await this.httpClient.get(url);
      return auth.data as ChallengeResponse;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  private sign({
    accountKp,
    challengeResponse,
    walletSigner,
  }: SignParams): Transaction {
    let transaction: Transaction = StellarSdk.TransactionBuilder.fromXDR(
      challengeResponse.transaction,
      challengeResponse.network_passphrase
    );
      
    // check if verifying client domain as well
    for (const op of transaction.operations) {
      if (op.type === "manageData" && op.name === "client_domain") {
        transaction = walletSigner.signWithDomainAccount(
          challengeResponse.transaction,
          challengeResponse.network_passphrase,
          accountKp
        );
      }
    }

    walletSigner.signWithClientAccount(transaction, accountKp);
    return transaction;
  }

  private async getToken(signedTx: Transaction): Promise<AuthToken> {
    try {
      const resp = await this.httpClient.post(this.webAuthEndpoint, {
        transaction: signedTx.toXDR(),
      });
      return resp.data.token as AuthToken;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}
