import { Networks, Transaction } from "@stellar/stellar-sdk";
import {
  Sep7Base,
  sep7ReplacementsFromString,
  sep7ReplacementsToString,
} from "../Uri";
import { Sep7Replacement, WEB_STELLAR_TX_SCHEME } from "../Types";

/**
 *
 */
export class Sep7Tx extends Sep7Base {
  /**
   * Creates a Sep7Tx instance with given transaction.
   *
   * @param {Transaction} transaction a transaction which will be used to set uri's xdr
   * and network_passphrase query params.
   *
   * @returns {Sep7Tx} the Sep7Tx instance.
   */
  static forTransaction(transaction: Transaction): Sep7Tx {
    const uri = new Sep7Tx();
    uri.xdr = transaction.toEnvelope().toXDR().toString("base64");
    uri.networkPassphrase = transaction.networkPassphrase as Networks;
    return uri;
  }

  /**
   * Creates a new instance of the Sep7Tx class.
   *
   * @constructor
   * @param {URL | string} uri - uri to initialize the Sep7 instance.
   */
  constructor(uri?: URL | string) {
    super(uri ?? new URL(WEB_STELLAR_TX_SCHEME));
  }

  get xdr(): string | undefined {
    return this.getParam("xdr");
  }

  set xdr(xdr: string | undefined) {
    this.setParam("xdr", xdr);
  }

  get pubkey(): string | undefined {
    return this.getParam("pubkey");
  }

  set pubkey(pubkey: string | undefined) {
    this.setParam("pubkey", pubkey);
  }

  get chain(): string | undefined {
    return this.getParam("chain");
  }

  set chain(chain: string | undefined) {
    this.setParam("chain", chain);
  }

  getReplacements(): Sep7Replacement[] {
    return sep7ReplacementsFromString(this.getParam("replace"));
  }

  setReplacements(replacements: Sep7Replacement[] | undefined) {
    if (!replacements || replacements.length === 0) {
      this.setParam("replace", undefined);
      return;
    }
    this.setParam("replace", sep7ReplacementsToString(replacements));
  }

  addReplacement(replacement: Sep7Replacement) {
    const replacements = this.getReplacements();
    replacements.push(replacement);
    this.setReplacements(replacements);
  }

  removeReplacement(id: string) {
    const replacements = this.getReplacements().filter((r) => r.id !== id);
    this.setReplacements(replacements);
  }

  getTransaction(): Transaction {
    return new Transaction(this.xdr, this.networkPassphrase || Networks.PUBLIC);
  }

  clone(): Sep7Tx {
    return new Sep7Tx(this.uri);
  }
}
