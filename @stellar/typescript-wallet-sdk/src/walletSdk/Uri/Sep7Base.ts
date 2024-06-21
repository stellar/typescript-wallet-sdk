import { Keypair, Networks, StellarToml } from "@stellar/stellar-sdk";
import { Sep7OperationType, URI_MSG_MAX_LENGTH } from "../Types";
import { Sep7LongMsgError } from "../Exceptions";

/**
 * A base abstract class containing common functions that should be used by both
 * Sep7Tx and Sep7Pay classes for parsing or constructing SEP-0007 Stellar URIs.
 *
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md#specification
 */
export abstract class Sep7Base {
  protected uri: URL;

  /**
   * Creates a new instance of the Sep7 class.
   *
   * @constructor
   * @param {URL | string} uri - uri to initialize the Sep7 instance.
   */
  constructor(uri: URL | string) {
    this.uri = new URL(uri.toString());

    if (this.msg?.length > URI_MSG_MAX_LENGTH) {
      throw new Sep7LongMsgError(URI_MSG_MAX_LENGTH);
    }
  }

  /**
   * Should return a deep clone of this instance.
   *
   * @returns {Sep7Base} a deep clone of the Sep7Base extended instance.
   */
  abstract clone(): Sep7Base;

  /**
   * Returns a stringfied URL-decoded version of the 'uri' object.
   *
   * @returns {string} the uri decoded string value.
   */
  toString(): string {
    return this.uri.toString();
  }

  /**
   * Returns uri's pathname as the operation type.
   *
   * @returns {Sep7OperationType} the operation type, either "tx" or "pay".
   */
  get operationType(): Sep7OperationType {
    return this.uri.pathname as Sep7OperationType;
  }

  /**
   * Returns a URL-decoded version of the uri 'callback' param without
   * the 'url:' prefix.
   *
   * The URI handler should send the signed XDR to this callback url, if this
   * value is omitted then the URI handler should submit it to the network.
   *
   * @returns {string | undefined} URL-decoded 'callback' param if present.
   */
  get callback(): string | undefined {
    const callback = this.getParam("callback");

    if (callback?.startsWith("url:")) {
      return callback.replace("url:", "");
    }

    return callback;
  }

  /**
   * Sets and URL-encodes the uri 'callback' param, appends the 'url:'
   * prefix to it if not yet present.
   *
   * Deletes the uri 'callback' param if set as 'undefined'.
   *
   * The URI handler should send the signed XDR to this callback url, if this
   * value is omitted then the URI handler should submit it to the network.
   *
   * @param {string | undefined} callback the uri 'callback' param to be set.
   */
  set callback(callback: string | undefined) {
    if (!callback) {
      this.setParam("callback", undefined);
      return;
    }

    if (callback.startsWith("url:")) {
      this.setParam("callback", callback);
      return;
    }

    this.setParam("callback", `url:${callback}`);
  }

  /**
   * Returns a URL-decoded version of the uri 'msg' param.
   *
   * This message should indicate any additional information that the website
   * or application wants to show the user in her wallet.
   *
   * @returns {string | undefined} URL-decoded 'msg' param if present.
   */
  get msg(): string | undefined {
    return this.getParam("msg");
  }

  /**
   * Sets and URL-encodes the uri 'msg' param, the 'msg' param can't
   * be larger than 300 characters.
   *
   * Deletes the uri 'msg' param if set as 'undefined'.
   *
   * This message should indicate any additional information that the website
   * or application wants to show the user in her wallet.
   *
   * @param {string | undefined} msg the uri 'msg' param to be set.
   * @throws {Sep7LongMsgError} if 'msg' length is bigger than 300.
   */
  set msg(msg: string | undefined) {
    if (msg?.length > URI_MSG_MAX_LENGTH) {
      throw new Sep7LongMsgError(URI_MSG_MAX_LENGTH);
    }

    this.setParam("msg", msg);
  }

  /**
   * Returns uri 'network_passphrase' param, if not present returns
   * the PUBLIC Network value by default: 'Public Global Stellar Network ; September 2015'.
   *
   * @returns {Networks} the Stellar network passphrase considered for this uri.
   */
  get networkPassphrase(): Networks {
    return (this.getParam("network_passphrase") ?? Networks.PUBLIC) as Networks;
  }

  /**
   * Sets the uri 'network_passphrase' param.
   *
   * Deletes the uri 'network_passphrase' param if set as 'undefined'.
   *
   * Only need to set it if this transaction is for a network other than
   * the public network.
   *
   * @param {Networks | undefined} networkPassphrase the uri 'network_passphrase'
   * param to be set.
   */
  set networkPassphrase(networkPassphrase: Networks | undefined) {
    this.setParam("network_passphrase", networkPassphrase);
  }

  /**
   * Returns a URL-decoded version of the uri 'origin_domain' param.
   *
   * This should be a fully qualified domain name that specifies the originating
   * domain of the URI request.
   *
   * @returns {string | undefined} URL-decoded 'origin_domain' param if present.
   */
  get originDomain(): string | undefined {
    return this.getParam("origin_domain");
  }

  /**
   * Sets and URL-encodes the uri 'origin_domain' param.
   *
   * Deletes the uri 'origin_domain' param if set as 'undefined'.
   *
   * This should be a fully qualified domain name that specifies the originating
   * domain of the URI request.
   *
   * @param {string | undefined} originDomain the uri 'origin_domain' param
   * to be set.
   */
  set originDomain(originDomain: string | undefined) {
    this.setParam("origin_domain", originDomain);
  }

  /**
   * Returns a URL-decoded version of the uri 'signature' param.
   *
   * This should be a signature of the hash of the URI request (excluding the
   * 'signature' field and value itself).
   *
   * Wallets should use the URI_REQUEST_SIGNING_KEY specified in the
   * origin_domain's stellar.toml file to validate this signature.
   * If the verification fails, wallets must alert the user.
   *
   * @returns {string | undefined} URL-decoded 'signature' param if present.
   */
  get signature(): string | undefined {
    return this.getParam("signature");
  }

  /**
   * Signs the URI with the given keypair, which means it sets the 'signature' param.
   *
   * This should be the last step done before generating the URI string,
   * otherwise the signature will be invalid for the URI.
   *
   * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md#request-signing
   *
   * @param {Keypair} keypair The keypair (including secret key), used to sign the request.
   * This should be the keypair found in the URI_REQUEST_SIGNING_KEY field of the
   * origin_domains' stellar.toml.
   *
   * @returns {string} the generated 'signature' param.
   */
  addSignature(keypair: Keypair): string {
    const payload = this.createSignaturePayload();
    const signature = keypair.sign(payload).toString("base64");
    this.setParam("signature", signature);
    return signature;
  }

  /**
   * Verifies that the signature added to the URI is valid.
   *
   * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md#request-signing
   *
   * @returns {Promise<boolean>} returns 'true' if the signature is valid for
   * the current URI and origin_domain. Returns 'false' if signature verification
   * fails, or if there is a problem looking up the stellar.toml associated with
   * the origin_domain.
   */
  async verifySignature(): Promise<boolean> {
    const originDomain = this.originDomain;
    const signature = this.signature;

    // we can fail fast if neither of them are set since we can't verify without both
    if (!originDomain || !signature) {
      return false;
    }

    try {
      const toml = await StellarToml.Resolver.resolve(originDomain);
      const signingKey = toml.URI_REQUEST_SIGNING_KEY;

      if (!signingKey) {
        return false;
      }
      const keypair = Keypair.fromPublicKey(signingKey);
      const payload = this.createSignaturePayload();
      return keypair.verify(payload, Buffer.from(signature, "base64"));
    } catch (e) {
      // if something fails we assume signature verification failed
      return false;
    }
  }

  /**
   * Finds the uri param related to the inputted 'key', if any, and returns
   * a URL-decoded version of it. Returns 'undefined' if key param not found.
   *
   * @param {string} key the uri param key.
   *
   * @returns {string | undefined} URL-decoded value of the uri param if found.
   */
  protected getParam(key: string): string | undefined {
    // the searchParams.get() function automatically applies URL dencoding.
    return this.uri.searchParams.get(key) || undefined;
  }

  /**
   * Sets and URL-encodes a 'key=value' uri param.
   *
   * Deletes the uri param if 'value' set as 'undefined'.
   *
   * @param {string} key the uri param key.
   * @param {string | undefined} value the uri param value to be set.
   */
  protected setParam(key: string, value: string | undefined) {
    if (!value) {
      this.uri.searchParams.delete(key);
      return;
    }

    // the searchParams.set() function automatically applies URL encoding.
    this.uri.searchParams.set(key, value);
  }

  /**
   * Converts the URI request into the payload that will be signed by
   * the 'addSignature' method.
   *
   * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md#request-signing
   *
   * @returns {Buffer} array of bytes to be signed with given keypair on
   * the 'addSignature' method.
   */
  private createSignaturePayload(): Buffer {
    let data = this.toString();

    const signature = this.signature;
    if (signature) {
      // the payload must be created without the signature on it
      data = data.replace(`&signature=${encodeURIComponent(signature)}`, "");
    }

    // The first 35 bytes of the payload are all 0, the 36th byte is 4.
    // Then we concatenate the URI request with the prefix 'stellar.sep.7 - URI Scheme'
    // (no delimiter) and convert that to bytes to give use the final payload to be signed.
    return Buffer.concat([
      Buffer.alloc(35, 0),
      Buffer.alloc(1, 4),
      Buffer.from(`stellar.sep.7 - URI Scheme${data}`),
    ]);
  }
}
