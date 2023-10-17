import {
  Transaction,
  TransactionBuilder as StellarTransactionBuilder,
} from "stellar-sdk";
import { AxiosInstance } from "axios";

import {
  SignWithClientAccountParams,
  SignWithDomainAccountParams,
  HttpHeaders,
} from "../Types";
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
  // eslint-disable-next-line @typescript-eslint/require-await
  signWithDomainAccount: async () => {
    throw new Error(
      "The DefaultSigner can't sign transactions with domain account",
    );
  },
};

/**
 * Represents a Domain Signer used for signing Stellar transactions with a domain server.
 *
 * @class
 * @implements {WalletSigner}
 */
export class DomainSigner implements WalletSigner {
  private url: string;
  private client: AxiosInstance;
  private headers: HttpHeaders;

  /**
   * Create a new instance of the DomainSigner class.
   *
   * @constructor
   * @param {string} url - The URL of the domain server.
   * @param {HttpHeaders} headers - The HTTP headers for requests to the domain server.
   * These headers can be used for authentication purposes.
   */
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
