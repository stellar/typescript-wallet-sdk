import { Transaction } from "stellar-sdk";

import { WalletSigner } from "walletSdk/Auth";
import { AccountKeypair, PublicKeypair } from "walletSdk/Horizon";
import { AuthToken } from "./auth";
import { CommonBuilder } from "./horizon";

/**
 * Configuration for recoverable wallet
 *
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
 *
 * @param low Low threshold weight
 * @param medium Medium threshold weight
 * @param high High threshold weight
 */
export type AccountThreshold = {
  low: number;
  medium: number;
  high: number;
};

export type SignerWeight = {
  device: number;
  recoveryServer: number;
};

/**
 * Recovery server configuration
 *
 * @property endpoint main endpoint (root domain) of SEP-30 recovery server. E.g.
 * `https://testanchor.stellar.org`
 * @property authEndpoint SEP-10 auth endpoint to be used. Should be in format
 * `<https://domain/auth>`. E.g. `https://testanchor.stellar.org/auth`)
 * @property homeDomain is a SEP-10 home domain. E.g. `testanchor.stellar.org`
 * @property walletSigner optional [WalletSigner] used to sign authentication
 */
export type RecoveryServer = {
  endpoint: string;
  authEndpoint: string;
  homeDomain: string;
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
