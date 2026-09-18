import { Transaction } from "@stellar/stellar-sdk";

import { WalletSigner } from "../Auth";
import { AccountKeypair, PublicKeypair } from "../Horizon";
import { AuthToken } from "./auth";
import { CommonBuilder } from "./horizon";

/**
 * Configuration for recoverable wallet
 * @param accountAddress Stellar address of the account that is registering
 * @param deviceAddress Stellar address of the device that is added as a primary signer. It will
 * replace the master key of [accountAddress]
 * @param accountThreshold Low, medium, and high thresholds to set on the account
 * @param accountIdentity A list of account identities to be registered with the recovery servers
 * @param signerWeight Signer weight of the device and recovery keys to set
 * @param sponsorAddress optional Stellar address of the account sponsoring this transaction
 */
export type RecoverableWalletConfig = {
  accountAddress: AccountKeypair;
  deviceAddress: AccountKeypair;
  accountThreshold: AccountThreshold;
  accountIdentity: RecoveryIdentityMap;
  signerWeight: SignerWeight;
  sponsorAddress?: AccountKeypair;
  builderExtra?: (builder: CommonBuilder) => CommonBuilder;
};

/**
 * The result of registering an account with SEP-30 recovery servers.
 * @property {Transaction} transaction - The **unsigned** registration transaction. The SDK builds
 * it but neither signs nor submits it.
 *
 * It sets signers and thresholds, which Stellar authorizes against the account's **high**
 * threshold — not against the master key specifically:
 *
 * - For an account that already exists, whichever of its current signers together reach `high`
 *   can authorize it. The master key is neither automatically sufficient (it may carry less
 *   weight than `high`) nor necessarily required (an account whose master key is already locked
 *   is enrolled by its other signers alone).
 * - For an account created within this same transaction, i.e. the sponsored path where the
 *   account does not exist yet, the new account's own key suffices: a new account starts with
 *   master weight 1 and zeroed thresholds.
 * - When `sponsorAddress` is supplied the sponsor must sign as well, being the source of the
 *   `beginSponsoringFutureReserves` operation and of `createAccount`.
 *
 * For a newly funded account whose master key is still its only signer, that is just
 * `transaction.sign(accountKp.keypair)` followed by `stellar.submitTransaction(transaction)`.
 *
 * Once submitted the master key is locked, so inspect the transaction before signing if you want
 * to verify the signer set it installs.
 * @property {string[]} signers - Public keys of the recovery server signers added to the account,
 * one per configured server. These are the addresses to pass to `signWithRecoveryServers` when
 * recovering the account later.
 */
export type RecoverableWallet = {
  transaction: Transaction;
  signers: string[];
};

export type AccountSigner = {
  address: AccountKeypair;
  weight: number;
};

/**
 * Account weights threshold
 * @param low Low threshold weight
 * @param medium Medium threshold weight
 * @param high High threshold weight
 */
export type AccountThreshold = {
  low: number;
  medium: number;
  high: number;
};

/**
 * Weights assigned to the device signer and to each recovery server signer.
 *
 * These values only mean something relative to {@link AccountThreshold}. Together they decide
 * three separate properties, and it is possible to satisfy some and silently lose the others:
 *
 * 1. The device can operate the account on its own — `device >= high`.
 * 2. The recovery servers can recover the account without the device —
 *    `recoveryServer * serverCount >= high`.
 * 3. No single recovery server can act alone — `recoveryServer < low`. This is a choice, not a
 *    protocol guarantee: SEP-30 supports both postures. Two or more servers weighted this way
 *    means no individual server controls the account, but the spec equally supports a
 *    single-server custodial setup where one deliberately does.
 *
 * With two servers, `{ device: 10, recoveryServer: 5 }` against thresholds `{ low: 10, medium: 10,
 * high: 10 }` satisfies all three: the device alone reaches `high`, the two servers together reach
 * `high`, and one server alone reaches nothing.
 *
 * Note that whether the device can act alone is decided by `device` against `high`, per property 1
 * above — not by how `device` compares to `recoveryServer`. A device weighing less than a single
 * recovery server still operates the account independently as long as it meets `high`.
 * @property {number} device - Weight of the device signer, which replaces the master key.
 * @property {number} recoveryServer - Weight given to each recovery server signer.
 */
export type SignerWeight = {
  device: number;
  recoveryServer: number;
};

/**
 * Recovery server configuration
 * @property {string} endpoint - Main endpoint (root domain) of SEP-30 recovery server. E.g. `https://testanchor.stellar.org`
 * @property {string} authEndpoint - SEP-10 auth endpoint to be used. Should be in the format `<https://domain/auth>`. E.g. `https://testanchor.stellar.org/auth`
 * @property {string} homeDomain - SEP-10 home domain. E.g. `testanchor.stellar.org`
 * @property {WalletSigner} [walletSigner] - WalletSigner used to sign authentication
 */
export type RecoveryServer = {
  endpoint: string;
  authEndpoint: string;
  homeDomain: string;
  signingKey: string;
  walletSigner?: WalletSigner;
  clientDomain?: string;
};

export type RecoveryServerKey = string;

export type RecoveryServerSigning = {
  signerAddress: string;
  authToken: AuthToken;
};

export type RecoveryServerSigningMap = {
  [key: RecoveryServerKey]: RecoveryServerSigning;
};

export type RecoveryServerMap = {
  [key: RecoveryServerKey]: RecoveryServer;
};

export type RecoveryAuthMap = {
  [key: RecoveryServerKey]: AuthToken;
};

/**
 * The role of the identity. This value is not used by the server and is stored and echoed back in
 * responses as a way for a client to know conceptually who each identity represents
 */
export enum RecoveryRole {
  OWNER = "owner",
  SENDER = "sender",
  RECEIVER = "receiver",
}

export enum RecoveryType {
  STELLAR_ADDRESS = "stellar_address",
  PHONE_NUMBER = "phone_number",
  EMAIL = "email",
}

export type RecoveryAccountAuthMethod = {
  type: RecoveryType;
  value: string;
};

export type RecoveryAccountIdentity = {
  role: RecoveryRole;
  authMethods: RecoveryAccountAuthMethod[];
};

export type RecoveryIdentityMap = {
  [key: RecoveryServerKey]: RecoveryAccountIdentity[];
};

export type RecoveryAccountRole = {
  role: RecoveryRole;
  authenticated?: boolean;
};

export type RecoveryAccountSigner = {
  key: string;
};

export type RecoveryAccount = {
  address: string;
  identities: RecoveryAccountRole[];
  signers: RecoveryAccountSigner[];
};

export type RecoverableIdentity = {
  role: string;
  authenticated?: boolean;
};

export type RecoverableSigner = {
  key: PublicKeypair;
  addedAt?: Date;
};

export type RecoverableAccountInfo = {
  address: PublicKeypair;
  identities: RecoverableIdentity[];
  signers: RecoverableSigner[];
};

export type RecoveryAccountInfoMap = {
  [key: RecoveryServerKey]: RecoverableAccountInfo;
};
