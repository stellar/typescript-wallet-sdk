import { MemoType } from "@stellar/stellar-sdk";
import { Sep7Base } from "../Uri";
import { WEB_STELLAR_PAY_SCHEME } from "../Types";

/**
 *
 */
export class Sep7Pay extends Sep7Base {
  /**
   * Creates a Sep7Pay instance with given destination.
   *
   * @param {string} destination a valid stellar address to receive the payment.
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
   * @param {URL | string} uri - uri to initialize the Sep7 instance.
   */
  constructor(uri?: URL | string) {
    super(uri ?? new URL(WEB_STELLAR_PAY_SCHEME));
  }

  get destination(): string | undefined {
    return this.getParam("destination");
  }

  set destination(destination: string | undefined) {
    this.setParam("destination", destination);
  }

  get amount(): string | undefined {
    return this.getParam("amount");
  }

  set amount(amount: string | undefined) {
    this.setParam("amount", amount);
  }

  get assetCode(): string | undefined {
    return this.getParam("asset_code");
  }

  set assetCode(assetCode: string | undefined) {
    this.setParam("asset_code", assetCode);
  }

  get assetIssuer(): string | undefined {
    return this.getParam("asset_issuer");
  }

  set assetIssuer(assetIssuer: string | undefined) {
    this.setParam("asset_issuer", assetIssuer);
  }

  get memo(): string | undefined {
    return this.getParam("memo");
  }

  set memo(memo: string | undefined) {
    this.setParam("memo", memo);
  }

  get memoType(): MemoType | undefined {
    return this.getParam("memo_type") as MemoType | undefined;
  }

  set memoType(memoType: MemoType | undefined) {
    this.setParam("memo_type", memoType);
  }

  clone(): Sep7Pay {
    return new Sep7Pay(this.uri);
  }
}
