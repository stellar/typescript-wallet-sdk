import StellarSdk, { xdr } from "stellar-sdk";
import { IssuedAssetId } from "../../Asset";
import { AccountKeypair } from "../Account";

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
    return this as unknown as T;
  }

  removeAssetSupport(asset: IssuedAssetId): T {
    return this.addAssetSupport(asset, "0");
  }

  addAccountSigner(signerAddress: AccountKeypair, signerWeight: number): T {
    this.operations.push(
      StellarSdk.Operation.setOptions({
        source: this.sourceAddress,
        signer: {
          ed25519PublicKey: signerAddress.publicKey,
          weight: signerWeight,
        },
      }),
    );
    return this as unknown as T;
  }

  removeAccountSigner(signerAddress: AccountKeypair): T {
    return this.addAccountSigner(signerAddress, 0);
  }

  lockAccountMasterKey(): T {
    this.operations.push(
      StellarSdk.Operation.setOptions({
        source: this.sourceAddress,
        masterWeight: 0,
      }),
    );
    return this as unknown as T;
  }

  setThreshold({
    low,
    medium,
    high,
  }: {
    low?: number;
    medium?: number;
    high?: number;
  }): T {
    this.operations.push(
      StellarSdk.Operation.setOptions({
        source: this.sourceAddress,
        lowThreshold: low,
        medThreshold: medium,
        highThreshold: high,
      }),
    );
    return this as unknown as T;
  }
}
