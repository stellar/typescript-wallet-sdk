import { Keypair, Transaction } from "stellar-sdk";
import { WalletSigner } from "../Auth/WalletSigner";

export type AuthenticateParams = {
  accountKp: Keypair;
  walletSigner?: WalletSigner;
  memoId?: string;
  clientDomain?: string;
}

export type AuthToken = string;

export type ChallengeParams = {
  accountKp: Keypair;
  memoId?: string;
  clientDomain?: string;
}

export type XdrEncodedTransaction = string;
export type NetworkPassphrase = string;

export type ChallengeResponse = {
  transaction: XdrEncodedTransaction;
  network_passphrase: NetworkPassphrase;
}

export type SignParams = {
  accountKp: Keypair;
  challengeResponse: ChallengeResponse;
  walletSigner: WalletSigner;
}

export type SignWithClientAccountParams = {
  transaction: Transaction;
  accountKp: Keypair;
}

export type SignWithDomainAccountParams = {
  transactionXDR: XdrEncodedTransaction;
  networkPassphrase: NetworkPassphrase;
  accountKp: Keypair;
}
