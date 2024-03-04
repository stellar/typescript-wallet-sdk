import StellarSdk, { xdr } from "@stellar/stellar-sdk";

import { CommonTransactionBuilder } from "./CommonTransactionBuilder";
import { AccountKeypair } from "../Account";

/**
 * Used for building transactions that will include a sponsor.
 * Do not create this object directly, use the TransactionBuilder class to create.
 * @class
 */
export class SponsoringBuilder extends CommonTransactionBuilder<SponsoringBuilder> {
  private sponsorAccount: AccountKeypair;

  /**
   * Creates a new instance of the SponsoringBuilder class.
   * @constructor
   * @param {string} sponsoredAddress - The address of the account being sponsored.
   * @param {AccountKeypair} sponsorAccount - The sponsor account keypair.
   * @param {xdr.Operation[]} operations - An array of Stellar operations.
   * @param {(builder: SponsoringBuilder) => SponsoringBuilder} buildingFunction - Function for creating the
   * operations that will be sponsored.
   */
  constructor(
    sponsoredAddress: string,
    sponsorAccount: AccountKeypair,
    operations: Array<xdr.Operation>,
    buildingFunction: (builder: SponsoringBuilder) => SponsoringBuilder,
  ) {
    super(sponsoredAddress, operations);
    this.sponsorAccount = sponsorAccount;

    this.startSponsoring();
    buildingFunction(this);
    this.stopSponsoring();
  }

  /**
   * Creates a Stellar account with sponsored reserves.
   * @param {AccountKeypair} newAccount - The new account's keypair.
   * @param {number} [startingBalance=0] - The starting balance for the new account (default is 0 XLM).
   * @returns {SponsoringBuilder} The SponsoringBuilder instance.
   */
  createAccount(
    newAccount: AccountKeypair,
    startingBalance: number = 0,
  ): SponsoringBuilder {
    this.operations.push(
      StellarSdk.Operation.createAccount({
        destination: newAccount.publicKey,
        startingBalance: startingBalance.toString(),
        source: this.sponsorAccount.publicKey,
      }),
    );
    return this;
  }

  /**
   * Start sponsoring the future reserves of an account.
   * @returns {void}
   */
  startSponsoring() {
    this.operations.push(
      StellarSdk.Operation.beginSponsoringFutureReserves({
        sponsoredId: this.sourceAddress,
        source: this.sponsorAccount.publicKey,
      }),
    );
  }

  /**
   * Stop sponsoring the future reserves of an account.
   * @returns {void}
   */
  stopSponsoring() {
    this.operations.push(
      StellarSdk.Operation.endSponsoringFutureReserves({
        source: this.sourceAddress,
      }),
    );
  }
}
