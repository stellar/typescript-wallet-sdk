import StellarSdk, { xdr } from "@stellar/stellar-sdk";
import { IssuedAssetId } from "../../Asset";
import { AccountKeypair } from "../Account";

export abstract class CommonTransactionBuilder<T> {
  protected sourceAddress: string;
  protected operations: Array<xdr.Operation>;

  constructor(sourceAddress: string, operations: Array<xdr.Operation>) {
    this.sourceAddress = sourceAddress;
    this.operations = operations;
  }

  /**
   * Add a trustline for an asset so can receive or send it.
   * @param {IssuedAssetId} asset - The asset for which support is added.
   * @param {string} [trustLimit] - The trust limit for the asset.
   * @returns {T} The builder class instance called with.
   */
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

  /**
   * Remove a trustline for an asset.
   * @param {IssuedAssetId} asset - The asset for which support is added.
   * @returns {T} The builder class instance called with.
   */
  removeAssetSupport(asset: IssuedAssetId): T {
    return this.addAssetSupport(asset, "0");
  }

  /**
   * Add a signer to the account.
   * @see {@link https://developers.stellar.org/docs/encyclopedia/signatures-multisig}
   * @param {AccountKeypair} signerAddress - The new account being added
   * @param {number} signerWeight - The weight given to the new signer.
   * @returns {T} The builder class instance called with.
   */
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

  /**
   * Removes a signer from an account.
   * @see {@link https://developers.stellar.org/docs/encyclopedia/signatures-multisig}
   * @param {AccountKeypair} signerAddress - The new account being added
   * @returns {T} The builder class instance called with.
   */
  removeAccountSigner(signerAddress: AccountKeypair): T {
    return this.addAccountSigner(signerAddress, 0);
  }

  /**
   * Locking an account by setting the master key weight to 0.
   * Be careful, if no other signers then the account will be locked and unable to
   * sign new transactions permanently.
   * @returns {T} The builder class instance called with.
   */
  lockAccountMasterKey(): T {
    this.operations.push(
      StellarSdk.Operation.setOptions({
        source: this.sourceAddress,
        masterWeight: 0,
      }),
    );
    return this as unknown as T;
  }

  /**
   * Set thesholds for an account.
   * @see {@link https://developers.stellar.org/docs/encyclopedia/signatures-multisig#thresholds}
   * @param {object} options - The threshold options.
   * @param {number} [options.low] - The low theshold level.
   * @param {number} [options.medium] - The medium theshold level.
   * @param {number} [options.high] - The high theshold level.
   * @returns {T} The builder class instance called with.
   */
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
