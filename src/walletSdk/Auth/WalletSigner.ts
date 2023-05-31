import StellarSdk, { Keypair, Transaction } from "stellar-sdk";

export interface WalletSigner {
  signWithClientAccount(txn: Transaction, account: Keypair): Transaction;
  signWithDomainAccount(
    transactionXDR: string,
    networkPassPhrase: string,
    account: Keypair
  ): Transaction;
}
export const DefaultSigner: WalletSigner = {
  signWithClientAccount: (txn, account) => {
    txn.sign(account);
    return txn;
  },
  signWithDomainAccount: (transactionXDR, networkPassPhrase, account) => {
    throw new Error("The DefaultSigner can't sign transactions with domain");
  },
};
