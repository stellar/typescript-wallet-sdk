import StellarSdk, { xdr } from "stellar-sdk";
import { IssuedAssetId } from "../../Asset";

export abstract class CommonTransactionBuilder<T> {
  protected sourceAddress: string;
  protected operations: Array<xdr.Operation>;

  constructor(sourceAddress: string, operations: Array<xdr.Operation>) {
    this.sourceAddress = sourceAddress;
    this.operations = operations;
  }

  addAssetSupport(asset: IssuedAssetId, trustLimit?: string): T {
    this.operations.push(
      StellarSdk.Operation.changeTrust({
        asset: asset.toAsset(),
        limit: trustLimit,
        source: this.sourceAddress,
      }),
    );
    return this as any as T;
  }

  removeAssetSupport(asset: IssuedAssetId): T {
    return this.addAssetSupport(asset, "0");
  }
}
