/**
 * Code in the Server module is written to be used by server side
 * applications.
 */

import {
  Transaction,
  TransactionBuilder,
  StellarToml,
  WebAuth,
  extractBaseAddress,
} from "@stellar/stellar-sdk";

import { parseToml } from "../Utils";
import {
  SignChallengeTxnParams,
  SignChallengeTxnResponse,
  AnchorTransaction,
  WithdrawTransaction,
  DepositTransaction,
  ErrorTransaction,
} from "../Types";
import {
  ChallengeTxnIncorrectSequenceError,
  ChallengeTxnClientAccountMismatchError,
  ChallengeValidationFailedError,
  UnknownAnchorTransactionError,
  InvalidJsonError,
} from "../Exceptions";

/**
 * Helper method for signing a SEP-10 challenge transaction if valid.
 *
 * The challenge is validated with `WebAuth.readChallengeTx` from
 * `@stellar/stellar-sdk` — the same validator used by `Sep10.sign()` — which
 * checks the full SEP-10 structure and binds the challenge to the expected
 * anchor: the transaction source must be the anchor's `SIGNING_KEY`, the
 * `<home domain> auth` operation must match the expected home domain, and any
 * `web_auth_domain` operation must match the host of the anchor's
 * `WEB_AUTH_ENDPOINT` (falling back to `anchorDomain` when the TOML omits it).
 * The client account the challenge was issued for is then checked against
 * `accountKp`, so this helper only signs challenges meant for it. Muxed client
 * accounts are supported: the comparison is made on the underlying `G...`
 * address, since that is the key that signs. The muxed id itself is not pinned
 * — a caller that needs to bind a specific subaccount should check the
 * challenge's client account itself.
 *
 * @param {SignChallengeTxnParams} params - The Authentication params.
 * @param {AccountKeypair} params.accountKp - Keypair for the Stellar account signing the transaction.
 * @param {string} [params.challengeTx] - The challenge transaction given by an anchor for authentication.
 * @param {string} [params.networkPassphrase] - The network passphrase for the network authenticating on.
 * @param {string} [params.anchorDomain] - Domain hosting stellar.toml file containing `SIGNING_KEY`.
 * @param {string|string[]} [params.homeDomain] - Expected home domain(s) of the challenge. Defaults to `anchorDomain`.
 * @returns {Promise<SignChallengeTxnResponse>} The signed transaction.
 */
export const signChallengeTransaction = async ({
  accountKp,
  challengeTx,
  networkPassphrase,
  anchorDomain,
  homeDomain,
}: SignChallengeTxnParams): Promise<SignChallengeTxnResponse> => {
  const parsedTx = TransactionBuilder.fromXDR(
    challengeTx,
    networkPassphrase,
  ) as Transaction;

  if (parseInt(parsedTx.sequence) !== 0) {
    throw new ChallengeTxnIncorrectSequenceError();
  }

  const tomlResp = await StellarToml.Resolver.resolve(anchorDomain);
  const { signingKey, webAuthEndpoint } = parseToml(tomlResp);

  let tx: Transaction;
  let clientAccountID: string;
  try {
    // Kept inside the try so a malformed WEB_AUTH_ENDPOINT surfaces as a
    // ChallengeValidationFailedError rather than a raw TypeError.
    const webAuthDomain = webAuthEndpoint
      ? new URL(webAuthEndpoint).hostname
      : anchorDomain;

    ({ tx, clientAccountID } = WebAuth.readChallengeTx(
      challengeTx,
      signingKey,
      networkPassphrase,
      homeDomain ?? anchorDomain,
      webAuthDomain,
    ));
  } catch (e) {
    throw new ChallengeValidationFailedError(
      e instanceof Error ? e : new Error(String(e)),
    );
  }

  // readChallengeTx returns the operation source verbatim, which is an `M...`
  // address for a muxed client account. accountKp.publicKey is always the
  // underlying `G...` key, so compare base addresses.
  if (extractBaseAddress(clientAccountID) !== accountKp.publicKey) {
    throw new ChallengeTxnClientAccountMismatchError(
      accountKp.publicKey,
      clientAccountID,
    );
  }

  accountKp.sign(tx);
  return {
    transaction: tx.toXDR(),
    networkPassphrase,
  };
};

/**
 * Helper method for parsing a JSON string into an AnchorTransaction.
 * @param {string} transaction - The json string of an anchor transaction.
 * @returns {AnchorTransaction} The transaction object.
 */
export const parseAnchorTransaction = (
  transaction: string,
): AnchorTransaction => {
  let parsed;
  try {
    parsed = JSON.parse(transaction);
  } catch (e) {
    throw new InvalidJsonError();
  }

  if (parsed.kind === "withdrawal") {
    return parsed as WithdrawTransaction;
  } else if (parsed.kind === "deposit") {
    return parsed as DepositTransaction;
  } else if (parsed.status === "error") {
    return parsed as ErrorTransaction;
  } else {
    throw new UnknownAnchorTransactionError();
  }
};
