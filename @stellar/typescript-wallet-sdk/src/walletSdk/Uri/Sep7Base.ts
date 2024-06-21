import { Keypair, Networks, StellarToml } from "@stellar/stellar-sdk";
import { Sep7OperationType, URI_MSG_MAX_LENGTH } from "../Types";
import { Sep7LongMsgError } from "../Exceptions";

/**
 *
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

  abstract clone(): Sep7Base;

  get operationType(): Sep7OperationType {
    return this.uri.pathname as Sep7OperationType;
  }

  get callback(): string | undefined {
    const callback = this.getParam("callback");

    if (callback?.startsWith("url:")) {
      return callback.replace("url:", "");
    }

    return callback;
  }

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

  get msg(): string | undefined {
    return this.getParam("msg");
  }

  set msg(msg: string | undefined) {
    if (msg?.length > URI_MSG_MAX_LENGTH) {
      throw new Sep7LongMsgError(URI_MSG_MAX_LENGTH);
    }

    this.setParam("msg", msg);
  }

  get networkPassphrase(): Networks {
    return (this.getParam("network_passphrase") ?? Networks.PUBLIC) as Networks;
  }

  set networkPassphrase(networkPassphrase: Networks | undefined) {
    this.setParam("network_passphrase", networkPassphrase);
  }

  get originDomain(): string | undefined {
    return this.getParam("origin_domain");
  }

  set originDomain(domain: string | undefined) {
    this.setParam("origin_domain", domain);
  }

  get signature(): string | undefined {
    return this.getParam("signature");
  }

  addSignature(keypair: Keypair): string {
    const payload = this.createSignaturePayload();
    const signature = keypair.sign(payload).toString("base64");
    this.setParam("signature", signature);
    return signature;
  }

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

  toString(): string {
    return this.uri.toString();
  }

  protected getParam(key: string): string | undefined {
    return this.uri.searchParams.get(key) || undefined;
  }

  protected setParam(key: string, value: string | undefined) {
    if (!value) {
      this.uri.searchParams.delete(key);
      return;
    }

    // this searchParams.set() function automatically applies URL encoding
    this.uri.searchParams.set(key, value);
  }

  private createSignaturePayload(): Buffer {
    let data = this.toString();

    const signature = this.signature;
    if (signature) {
      // the payload must be created without the signature on it
      data = data.replace(`&signature=${encodeURIComponent(signature)}`, "");
    }

    // https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md#request-signing
    return Buffer.concat([
      Buffer.alloc(35, 0),
      Buffer.alloc(1, 4),
      Buffer.from(`stellar.sep.7 - URI Scheme${data}`),
    ]);
  }
}
