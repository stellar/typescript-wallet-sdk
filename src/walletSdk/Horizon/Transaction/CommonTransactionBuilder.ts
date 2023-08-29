import StellarSdk, { xdr } from "stellar-sdk";
import { IssuedAssetId } from "../../Asset";

export abstract class CommonTransactionBuilder<T> {
  sourceAddress: string;
  operations: Array<xdr.Operation>;

  constructor(sourceAddress: string) {
    this.sourceAddress = sourceAddress;
    this.operations = [];
  }

  addAssetSupport(asset: IssuedAssetId, trustLimit?: string) {
    this.operations.push(
      StellarSdk.Operation.changeTrust({
        asset: asset.toAsset(),
        limit: trustLimit,
        source: this.sourceAddress,
      }),
    );
  }

  removeAssetSupport(asset: IssuedAssetId) {
    this.addAssetSupport(asset, "0");
  }
}
