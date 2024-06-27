import {
  Transaction,
  TransactionBuilder as StellarTransactionBuilder,
} from "@stellar/stellar-sdk";
import { AxiosInstance } from "axios";

import {
  SignWithClientAccountParams,
  SignWithDomainAccountParams,
  HttpHeaders,
} from "../Types";
import { DefaultClient } from "../";
import { DefaultSignerDomainAccountError } from "../Exceptions";

/**
 * A Wallet Signer for signing Stellar transactions.
 */
export interface WalletSigner {
  /**
   * Sign a transaction with a client keypair.
   * @param {Transaction} params.transaction - The transaction to sign.
   * @param {AccountKeypair} params.accountKp - The keypair to sign with.
   * @returns {Transaction} The signed transaction.
   */
  signWithClientAccount({
    transaction,
    accountKp,
  }: SignWithClientAccountParams): Transaction;

  /**
   * Sign a transaction using the domain account's keypair. This method is async in the
   * case of signing with a different server.
   * @param {XdrEncodedTransaction} params.transactionXDR - The XDR representation of the transaction to sign.
   * @param {NetworkPassphrase} params.networkPassphrase - The network passphrase for the Stellar network.
   * @param {AccountKeypair} params.accountKp - The keypair of the domain account.
   * @returns {Promise<Transaction>} The signed transaction.
   */
  signWithDomainAccount({
    transactionXDR,
    networkPassphrase,
    accountKp,
  }: SignWithDomainAccountParams): Promise<Transaction>;
}

/**
 * A Default signer used if no signer is given.
 */
export const DefaultSigner: WalletSigner = {
  signWithClientAccount: ({ transaction, accountKp }) => {
    transaction.sign(accountKp.keypair);
    return transaction;
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  signWithDomainAccount: async () => {
    // The DefaultSigner can't sign transactions with domain account
    throw new DefaultSignerDomainAccountError();
  },
};

/**
 * A Domain Signer used for signing Stellar transactions with a domain server.
 * @class
 * @implements {WalletSigner}
 */
export class DomainSigner implements WalletSigner {
  private url: string;
  private client: AxiosInstance;
  private headers: HttpHeaders;

  /**
   * Create a new instance of the DomainSigner class.
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
