/**
 * Code in the Server module is written to be used by server side
 * applications.
 */

import {
  Transaction,
  TransactionBuilder,
  Keypair,
  StellarToml,
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
  ChallengeTxnInvalidSignatureError,
  UnknownAnchorTransactionError,
} from "../Exceptions";

/**
 * Helper method for signing a SEP-10 challenge transaction if valid.
 * @param {SignChallengeTxnParams} params - The Authentication params.
 * @param {AccountKeypair} params.accountKp - Keypair for the Stellar account signing the transaction.
 * @param {string} [params.challengeTx] - The challenge transaction given by an anchor for authentication.
 * @param {string} [params.networkPassphrase] - The network passphrase for the network authenticating on.
 * @param {string} [params.anchorDomain] - Domain hosting stellar.toml file containing `SIGNING_KEY`.
 * @returns {Promise<SignChallengeTxnResponse>} The signed transaction.
 */
export const signChallengeTransaction = async ({
  accountKp,
  challengeTx,
  networkPassphrase,
  anchorDomain,
}: SignChallengeTxnParams): Promise<SignChallengeTxnResponse> => {
  const tx = TransactionBuilder.fromXDR(
    challengeTx,
    networkPassphrase,
  ) as Transaction;

  if (parseInt(tx.sequence) !== 0) {
    throw new ChallengeTxnIncorrectSequenceError();
  }

  const tomlResp = await StellarToml.Resolver.resolve(anchorDomain);
  const parsedToml = parseToml(tomlResp);
  const anchorKp = Keypair.fromPublicKey(parsedToml.signingKey);

  const isValid =
    tx.signatures.length &&
    anchorKp.verify(tx.hash(), tx.signatures[0].signature());
  if (!isValid) {
    throw new ChallengeTxnInvalidSignatureError();
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
  const parsed = JSON.parse(transaction);
  if (
    "withdraw_memo_type" in parsed ||
    "withdraw_memo" in parsed ||
    "withdraw_anchor_account" in parsed
  ) {
    return parsed as WithdrawTransaction;
  } else if (
    "deposit_memo" in parsed ||
    "deposit_memo_type" in parsed ||
    "claimable_balance_id" in parsed
  ) {
    return parsed as DepositTransaction;
  } else if (parsed.status === "error") {
    return parsed as ErrorTransaction;
  } else {
    throw new UnknownAnchorTransactionError();
  }
};
