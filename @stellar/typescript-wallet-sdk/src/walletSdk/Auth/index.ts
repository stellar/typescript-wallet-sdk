import { AxiosInstance } from "axios";
import {
  TransactionBuilder,
  Transaction,
  FeeBumpTransaction,
  WebAuth,
} from "@stellar/stellar-sdk";
import { decode } from "jws";

import { Config } from "../";
import {
  InvalidMemoError,
  ClientDomainWithMemoError,
  ServerRequestFailedError,
  InvalidTokenError,
  MissingTokenError,
  ExpiredTokenError,
  ChallengeValidationFailedError,
  NetworkPassphraseMismatchError,
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
  serverSigningKey?: string;
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
  private serverSigningKey?: string;

  /**
   * Creates a new instance of the Sep10 class.
   *
   * @constructor
   * @param {Sep10Params} params - Parameters to initialize the Sep10 instance.
   */
  constructor(params: Sep10Params) {
    const { cfg, webAuthEndpoint, homeDomain, httpClient, serverSigningKey } =
      params;

    this.cfg = cfg;
    this.webAuthEndpoint = webAuthEndpoint;
    this.homeDomain = homeDomain;
    this.httpClient = httpClient;
    this.serverSigningKey = serverSigningKey;
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
    const networkPassphrase = this.cfg.stellar.network;

    if (
      challengeResponse.network_passphrase &&
      challengeResponse.network_passphrase !== (networkPassphrase as string)
    ) {
      throw new NetworkPassphraseMismatchError(
        networkPassphrase,
        challengeResponse.network_passphrase,
      );
    }

    try {
      const webAuthDomain = new URL(this.webAuthEndpoint).hostname;

      if (this.serverSigningKey) {
        WebAuth.readChallengeTx(
          challengeResponse.transaction,
          this.serverSigningKey,
          networkPassphrase,
          this.homeDomain,
          webAuthDomain,
        );
      } else {
        readChallengeTx(
          challengeResponse.transaction,
          networkPassphrase,
          this.homeDomain,
          webAuthDomain,
        );
      }
    } catch (e) {
      throw new ChallengeValidationFailedError(
        e instanceof Error ? e : new Error(String(e)),
      );
    }

    let transaction: Transaction = TransactionBuilder.fromXDR(
      challengeResponse.transaction,
      networkPassphrase,
    ) as Transaction;

    // check if verifying client domain as well
    for (const op of transaction.operations) {
      if (op.type === "manageData" && op.name === "client_domain") {
        transaction = await walletSigner.signWithDomainAccount({
          transactionXDR: challengeResponse.transaction,
          networkPassphrase,
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

/**
 * @internal
 * @param {string} token - The JWT token to validate.
 */
export const validateToken = (token: string) => {
  const parsedToken = decode(token);
  if (!parsedToken) {
    throw new InvalidTokenError();
  }
  const payload =
    typeof parsedToken.payload === "string"
      ? JSON.parse(parsedToken.payload)
      : parsedToken.payload;
  const exp = payload?.exp;
  if (typeof exp === "number" && exp < Math.floor(Date.now() / 1000)) {
    throw new ExpiredTokenError(exp);
  }
};

/*
 * Validates a SEP-10 challenge transaction without requiring the server's
 * signing key. This performs all structural validations from the SEP-10 spec
 * (sequence number, operation types, timebounds, home domain, web_auth_domain,
 * nonce format) but skips the server account and signature checks.
 *
 * Used as a fallback when the anchor's stellar.toml does not publish a
 * SIGNING_KEY, providing strong protection against malformed or malicious
 * challenge transactions.
 *
 * @internal
 * @see {@link https://github.com/stellar/js-stellar-sdk/blob/v13.0.0-beta.1/src/webauth/utils.ts#L188 | WebAuth.readChallengeTx}
 */
const readChallengeTx = (
  challengeTx: string,
  networkPassphrase: string,
  homeDomain: string,
  webAuthDomain: string,
): { tx: Transaction; clientAccountID: string } => {
  let transaction: Transaction;
  try {
    transaction = new Transaction(challengeTx, networkPassphrase);
  } catch {
    try {
      // eslint-disable-next-line no-new
      new FeeBumpTransaction(challengeTx, networkPassphrase);
    } catch {
      throw new Error(
        "Invalid challenge: unable to deserialize challengeTx transaction string",
      );
    }
    throw new Error(
      "Invalid challenge: expected a Transaction but received a FeeBumpTransaction",
    );
  }

  // verify sequence number
  const sequence = Number.parseInt(transaction.sequence, 10);
  if (sequence !== 0) {
    throw new Error("The transaction sequence number should be zero");
  }

  // verify operations
  if (transaction.operations.length < 1) {
    throw new Error("The transaction should contain at least one operation");
  }

  const [operation, ...subsequentOperations] = transaction.operations;

  if (!operation.source) {
    throw new Error(
      "The transaction's operation should contain a source account",
    );
  }
  const clientAccountID: string = operation.source;

  // verify memo
  if (transaction.memo.type !== "none") {
    if (clientAccountID.startsWith("M")) {
      throw new Error(
        "The transaction has a memo but the client account ID is a muxed account",
      );
    }
    if (transaction.memo.type !== "id") {
      throw new Error("The transaction's memo must be of type `id`");
    }
  }

  if (operation.type !== "manageData") {
    throw new Error("The transaction's operation type should be 'manageData'");
  }

  // verify timebounds
  if (!transaction.timeBounds) {
    throw new Error("The transaction requires timebounds");
  }

  if (Number.parseInt(transaction.timeBounds.maxTime, 10) === 0) {
    throw new Error("The transaction requires non-infinite timebounds");
  }

  const now = Math.floor(Date.now() / 1000);
  const gracePeriod = 60 * 5;
  const minTime = Number.parseInt(transaction.timeBounds.minTime, 10) || 0;
  const maxTime = Number.parseInt(transaction.timeBounds.maxTime, 10) || 0;
  if (now < minTime - gracePeriod || now > maxTime + gracePeriod) {
    throw new Error("The transaction has expired");
  }

  // verify nonce value
  if (operation.value === undefined || !operation.value) {
    throw new Error("The transaction's operation value should not be null");
  }

  if (Buffer.from(operation.value.toString(), "base64").length !== 48) {
    throw new Error(
      "The transaction's operation value should be a 64 bytes base64 random string",
    );
  }

  // verify home domain
  if (`${homeDomain} auth` !== operation.name) {
    throw new Error(
      "Invalid homeDomains: the transaction's operation key name " +
        "does not match the expected home domain",
    );
  }

  // verify subsequent operations are all manageData
  for (const op of subsequentOperations) {
    if (op.type !== "manageData") {
      throw new Error(
        "The transaction has operations that are not of type 'manageData'",
      );
    }
    if (op.name === "web_auth_domain") {
      if (op.value === undefined) {
        throw new Error("'web_auth_domain' operation value should not be null");
      }
      if (op.value.compare(Buffer.from(webAuthDomain)) !== 0) {
        throw new Error(
          `'web_auth_domain' operation value does not match ${webAuthDomain}`,
        );
      }
    }
  }

  return { tx: transaction, clientAccountID };
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
