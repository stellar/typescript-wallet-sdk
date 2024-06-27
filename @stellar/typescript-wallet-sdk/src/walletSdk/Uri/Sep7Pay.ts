import { MemoType } from "@stellar/stellar-sdk";
import { Sep7Base } from "../Uri";
import { Sep7OperationType, WEB_STELLAR_SCHEME } from "../Types";

/**
 * The Sep-7 'pay' operation represents a request to pay a specific address
 * with a specific asset, regardless of the source asset used by the payer.
 *
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md#operation-pay
 */
export class Sep7Pay extends Sep7Base {
  /**
   * Creates a Sep7Pay instance with given destination.
   *
   * @param {string} destination a valid Stellar address to receive the payment.
   *
   * @returns {Sep7Pay} the Sep7Pay instance.
   */
  static forDestination(destination: string): Sep7Pay {
    const uri = new Sep7Pay();
    uri.destination = destination;
    return uri;
  }

  /**
   * Creates a new instance of the Sep7Pay class.
   *
   * @constructor
   * @param {URL | string} [uri] - uri to initialize the Sep7 instance.
   */
  constructor(uri?: URL | string) {
    super(uri ?? new URL(`${WEB_STELLAR_SCHEME}${Sep7OperationType.pay}`));
  }

  /**
   * Returns a deep clone of this instance.
   *
   * @returns {Sep7Pay} a deep clone of this Sep7Pay instance.
   */
  clone(): Sep7Pay {
    return new Sep7Pay(this.uri);
  }

  /**
   * Gets the destination of the payment request, which should be a valid
   * Stellar address.
   *
   * @returns {string | undefined} the 'destination' uri param if present.
   */
  get destination(): string | undefined {
    return this.getParam("destination");
  }

  /**
   * Sets the destination of the payment request, which should be a valid
   * Stellar address.
   *
   * Deletes the uri 'destination' param if set as 'undefined'.
   *
   * @param {string | undefined} destination the uri 'destination' param to be set.
   */
  set destination(destination: string | undefined) {
    this.setParam("destination", destination);
  }

  /**
   * Gets the amount that destination should receive.
   *
   * @returns {string | undefined} the 'amount' uri param if present.
   */
  get amount(): string | undefined {
    return this.getParam("amount");
  }

  /**
   * Sets the amount that destination should receive.
   *
   * Deletes the uri 'amount' param if set as 'undefined'.
   *
   * @param {string | undefined} amount the uri 'amount' param to be set.
   */
  set amount(amount: string | undefined) {
    this.setParam("amount", amount);
  }

  /**
   * Gets the code from the asset that destination should receive.
   *
   * @returns {string | undefined} the 'asset_code' uri param if present.
   */
  get assetCode(): string | undefined {
    return this.getParam("asset_code");
  }

  /**
   * Sets the code from the asset that destination should receive.
   *
   * Deletes the uri 'asset_code' param if set as 'undefined'.
   *
   * @param {string | undefined} assetCode the uri 'asset_code' param to be set.
   */
  set assetCode(assetCode: string | undefined) {
    this.setParam("asset_code", assetCode);
  }

  /**
   * Gets the account ID of asset issuer the destination should receive.
   *
   * @returns {string | undefined} the 'asset_issuer' uri param if present.
   */
  get assetIssuer(): string | undefined {
    return this.getParam("asset_issuer");
  }

  /**
   * Sets the account ID of asset issuer the destination should receive.
   *
   * Deletes the uri 'asset_issuer' param if set as 'undefined'.
   *
   * @param {string | undefined} assetIssuer the uri 'asset_issuer' param to be set.
   */
  set assetIssuer(assetIssuer: string | undefined) {
    this.setParam("asset_issuer", assetIssuer);
  }

  /**
   * Gets the memo to be included in the payment / path payment.
   * Memos of type MEMO_HASH and MEMO_RETURN should be base64-decoded
   * after returned from this function.
   *
   * @returns {string | undefined} the 'memo' uri param if present.
   */
  get memo(): string | undefined {
    return this.getParam("memo");
  }

  /**
   * Sets the memo to be included in the payment / path payment.
   * Memos of type MEMO_HASH and MEMO_RETURN should be base64-encoded
   * prior to being passed on this function.
   *
   * Deletes the uri 'memo' param if set as 'undefined'.
   *
   * @param {string | undefined} memo the uri 'memo' param to be set.
   */
  set memo(memo: string | undefined) {
    this.setParam("memo", memo);
  }

  /**
   * Gets the type of the memo.
   *
   * @returns {MemoType | undefined} the 'memo_type' uri param if present.
   */
  get memoType(): MemoType | undefined {
    return this.getParam("memo_type") as MemoType | undefined;
  }

  /**
   * Sets the type of the memo.
   *
   * Deletes the uri 'memo_type' param if set as 'undefined'.
   *
   * @param {MemoType | undefined} memoType the uri 'memo_type' param to be set.
   */
  set memoType(memoType: MemoType | undefined) {
    this.setParam("memo_type", memoType);
  }
}
