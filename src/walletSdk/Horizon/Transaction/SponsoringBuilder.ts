import StellarSdk, {
  TransactionBuilder as StellarTransactionBuilder,
  Transaction,
  xdr,
} from "stellar-sdk";
import { IssuedAssetId } from "../../Asset";

import { CommonTransactionBuilder } from "./CommonTransactionBuilder";
import { AccountKeypair } from "../Account";

export class SponsoringBuilder extends CommonTransactionBuilder<SponsoringBuilder> {
  private sponsorAccount: AccountKeypair;

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

  startSponsoring() {
    this.operations.push(
      StellarSdk.Operation.beginSponsoringFutureReserves({
        sponsoredId: this.sourceAddress,
        source: this.sponsorAccount.publicKey,
      }),
    );
  }

  stopSponsoring() {
    this.operations.push(
      StellarSdk.Operation.endSponsoringFutureReserves({
        source: this.sourceAddress,
      }),
    );
  }
}
