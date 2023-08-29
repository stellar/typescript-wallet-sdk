import StellarSdk, {
  TransactionBuilder as StellarTransactionBuilder,
  Transaction,
} from "stellar-sdk";
import { IssuedAssetId } from "../../Asset";

import { CommonTransactionBuilder } from "./CommonTransactionBuilder";
import { AccountKeypair } from "../Account";

export class SponsoringBuilder extends CommonTransactionBuilder<SponsoringBuilder> {
  private sponsorAccount: AccountKeypair;
  private builder: StellarTransactionBuilder;

  constructor(
    sponsoredAddress: string,
    sponsorAccount: AccountKeypair,
    builder: StellarTransactionBuilder,
  ) {
    super(sponsoredAddress);
    this.sponsorAccount = sponsorAccount;
    this.builder = builder;

    this.startSponsoring();
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

  addAssetSupport(
    asset: IssuedAssetId,
    trustLimit?: string,
  ): SponsoringBuilder {
    super.addAssetSupport(asset, trustLimit);
    return this;
  }

  removeAssetSupport(asset: IssuedAssetId): SponsoringBuilder {
    super.removeAssetSupport(asset);
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

  build(): Transaction {
    this.stopSponsoring();
    this.operations.forEach((op) => {
      this.builder.addOperation(op);
    });
    return this.builder.build();
  }
}
