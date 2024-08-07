import { AxiosInstance } from "axios";
import { TransactionBuilder, Transaction } from "@stellar/stellar-sdk";
import { decode } from "jws";

import { Config } from "../";
import {
  InvalidMemoError,
  ClientDomainWithMemoError,
  ServerRequestFailedError,
  InvalidTokenError,
  MissingTokenError,
  ExpiredTokenError,
} from "../Exceptions";
import {
  AuthenticateParams,
  AuthToken,
  ChallengeParams,
  ChallengeResponse,
  SignParams,
  AuthHeaderClaims,
} from "../Types";
import { AccountKeypair } from "../Horizon/Account";
import { AuthHeaderSigner } from "./AuthHeaderSigner";

export { WalletSigner, DomainSigner, DefaultSigner } from "./WalletSigner";

// Let's prevent exporting this constructor type as
// we should not create this Anchor class directly.
type Sep10Params = {
  cfg: Config;
  webAuthEndpoint: string;
  homeDomain: string;
  httpClient: AxiosInstance;
};

/**
 * @alias Auth alias for Sep10 class.
 */
export type Auth = Sep10;

/**
 * Sep-10 used for authentication to an external server.
 * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md}
 * Do not create this object directly, use the Anchor class.
 * @class
 */
export class Sep10 {
  private cfg: Config;
  private webAuthEndpoint: string;
  private homeDomain: string;
  private httpClient: AxiosInstance;

  /**
   * Creates a new instance of the Sep10 class.
   *
   * @constructor
   * @param {Sep10Params} params - Parameters to initialize the Sep10 instance.
   */
  constructor(params: Sep10Params) {
    const { cfg, webAuthEndpoint, homeDomain, httpClient } = params;

    this.cfg = cfg;
    this.webAuthEndpoint = webAuthEndpoint;
    this.homeDomain = homeDomain;
    this.httpClient = httpClient;
  }

  /**
   * Initiates the authentication process using SEP-10.
   * @param {AuthenticateParams} params - The Authentication params.
   * @param {AccountKeypair} params.accountKp - Keypair for the Stellar account being authenticated.
   * @param {WalletSigner} [params.walletSigner] - Signer for signing transactions (defaults to the configuration default signer).
   * @param {string} [params.memoId] - Memo ID to distinguish the account.
   * @param {string} [params.clientDomain] - Domain hosting stellar.toml file containing `SIGNING_KEY`.
   * @returns {Promise<AuthToken>} The authentication token.
   */
  async authenticate({
    accountKp,
    walletSigner,
    memoId,
    clientDomain,
    authHeaderSigner,
  }: AuthenticateParams): Promise<AuthToken> {
    const challengeResponse = await this.challenge({
      accountKp,
      memoId,
      clientDomain: clientDomain || this.cfg.app.defaultClientDomain,
      authHeaderSigner,
    });
    const signedTransaction = await this.sign({
      accountKp,
      challengeResponse,
      walletSigner: walletSigner ?? this.cfg.app.defaultSigner,
    });

    return this.getToken(signedTransaction);
  }

  private async challenge({
    accountKp,
    memoId,
    clientDomain,
    authHeaderSigner,
  }: ChallengeParams): Promise<ChallengeResponse> {
    if (memoId && parseInt(memoId) < 0) {
      throw new InvalidMemoError();
    }
    if (clientDomain && memoId) {
      throw new ClientDomainWithMemoError();
    }
    const url = `${
      this.webAuthEndpoint
    }?account=${accountKp.keypair.publicKey()}${
      memoId ? `&memo=${memoId}` : ""
    }${clientDomain ? `&client_domain=${clientDomain}` : ""}${
      this.homeDomain ? `&home_domain=${this.homeDomain}` : ""
    }`;

    const claims = {
      account: accountKp.publicKey,
      home_domain: this.homeDomain,
      memo: memoId,
      client_domain: clientDomain,
      web_auth_endpoint: this.webAuthEndpoint,
    };

    const token = await createAuthSignToken(
      accountKp,
      claims,
      clientDomain,
      authHeaderSigner,
    );

    let headers = {};
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    }

    try {
      const resp = await this.httpClient.get(url, { headers });
      const challengeResponse: ChallengeResponse = resp.data;
      return challengeResponse;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  private async sign({
    accountKp,
    challengeResponse,
    walletSigner,
  }: SignParams): Promise<Transaction> {
    let transaction: Transaction = TransactionBuilder.fromXDR(
      challengeResponse.transaction,
      challengeResponse.network_passphrase,
    ) as Transaction;

    // check if verifying client domain as well
    for (const op of transaction.operations) {
      if (op.type === "manageData" && op.name === "client_domain") {
        transaction = await walletSigner.signWithDomainAccount({
          transactionXDR: challengeResponse.transaction,
          networkPassphrase: challengeResponse.network_passphrase,
          accountKp,
        });
      }
    }

    walletSigner.signWithClientAccount({ transaction, accountKp });
    return transaction;
  }

  private async getToken(signedTransaction: Transaction): Promise<AuthToken> {
    try {
      const resp = await this.httpClient.post(this.webAuthEndpoint, {
        transaction: signedTransaction.toXDR(),
      });
      if (!resp.data.token) {
        throw new MissingTokenError();
      }

      validateToken(resp.data.token);

      return AuthToken.from(resp.data.token);
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}

const validateToken = (token: string) => {
  const parsedToken = decode(token);
  if (!parsedToken) {
    throw new InvalidTokenError();
  }
  if (parsedToken.expiresAt < Math.floor(Date.now() / 1000)) {
    throw new ExpiredTokenError(parsedToken.expiresAt);
  }
};

const createAuthSignToken = async (
  account: AccountKeypair,
  claims: AuthHeaderClaims,
  clientDomain?: string,
  authHeaderSigner?: AuthHeaderSigner,
) => {
  if (!authHeaderSigner) {
    return null;
  }

  const issuer = clientDomain ? null : account;

  return authHeaderSigner.createToken({
    claims,
    clientDomain,
    issuer,
  });
};
