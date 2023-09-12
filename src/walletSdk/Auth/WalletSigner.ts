import {
  Transaction,
  TransactionBuilder as StellarTransactionBuilder,
  FeeBumpTransaction,
} from "stellar-sdk";
import { AxiosInstance } from "axios";

import {
  SignWithClientAccountParams,
  SignWithDomainAccountParams,
  HttpHeaders,
} from "../Types";
import { AccountKeypair } from "../Horizon/Account";
import { DefaultClient } from "../";

export interface WalletSigner {
  signWithClientAccount({
    transaction,
    accountKp,
  }: SignWithClientAccountParams): Transaction;

  signWithDomainAccount({
    transactionXDR,
    networkPassphrase,
    accountKp,
  }: SignWithDomainAccountParams): Promise<Transaction>;
}

export const DefaultSigner: WalletSigner = {
  signWithClientAccount: ({ transaction, accountKp }) => {
    transaction.sign(accountKp.keypair);
    return transaction;
  },
  signWithDomainAccount: async () => {
    throw new Error(
      "The DefaultSigner can't sign transactions with domain account",
    );
  },
};

export class DomainSigner implements WalletSigner {
  private url: string;
  private client: AxiosInstance;
  private headers: HttpHeaders;
  constructor(url: string, headers: HttpHeaders) {
    this.url = url;
    this.client = DefaultClient;
    this.headers = headers;
  }

  signWithClientAccount({
    transaction,
    accountKp,
  }: SignWithClientAccountParams): Transaction {
    transaction.sign(accountKp.keypair);
    return transaction;
  }

  async signWithDomainAccount({
    transactionXDR,
    networkPassphrase,
    accountKp,
  }: SignWithDomainAccountParams): Promise<Transaction> {
    const response = await this.client.post(
      this.url,
      {
        transactionXDR,
        networkPassphrase,
      },
      { headers: this.headers },
    );

    return StellarTransactionBuilder.fromXDR(
      response.data.transaction,
      networkPassphrase,
    ) as Transaction;
  }
}
