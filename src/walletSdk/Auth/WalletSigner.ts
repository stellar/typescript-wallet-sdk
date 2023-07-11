import { Transaction } from "stellar-sdk";
import { 
  SignWithClientAccountParams, 
  SignWithDomainAccountParams 
} from "../Types";

export interface WalletSigner {
  signWithClientAccount({ 
    transaction, 
    accountKp 
  }: SignWithClientAccountParams): Transaction;

  signWithDomainAccount({
    transactionXDR,
    networkPassphrase,
    accountKp
  }: SignWithDomainAccountParams): Transaction;
}

export const DefaultSigner: WalletSigner = {
  signWithClientAccount: ({ transaction, accountKp }) => {
    transaction.sign(accountKp.keypair);
    return transaction;
  },
  signWithDomainAccount: () => {
    throw new Error("The DefaultSigner can't sign transactions with domain account");
  },
};
