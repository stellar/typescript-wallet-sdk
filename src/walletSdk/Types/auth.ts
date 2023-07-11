import { Keypair, Transaction } from "stellar-sdk";
import { WalletSigner } from "../Auth/WalletSigner";
import { AccountKeypair } from "../Horizon/Account";

export type AuthenticateParams = {
  accountKp: AccountKeypair;
  walletSigner?: WalletSigner;
  memoId?: string;
  clientDomain?: string;
};

export type AuthToken = string;

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
