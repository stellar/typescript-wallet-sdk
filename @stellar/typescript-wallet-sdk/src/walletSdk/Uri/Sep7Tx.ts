import { Networks, Transaction } from "@stellar/stellar-sdk";
import {
  Sep7Base,
  sep7ReplacementsFromString,
  sep7ReplacementsToString,
} from "../Uri";
import { Sep7Replacement, WEB_STELLAR_TX_SCHEME } from "../Types";

/**
 * The Sep-7 'tx' operation represents a request to sign
 * a specific XDR TransactionEnvelope.
 *
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md#operation-tx
 */
export class Sep7Tx extends Sep7Base {
  /**
   * Creates a Sep7Tx instance with given transaction.
   *
   * Sets the 'xdr' param as a Stellar TransactionEnvelope in XDR format that
   * is base64 encoded and then URL-encoded.
   *
   * @param {Transaction} transaction a transaction which will be used to set the
   * URI 'xdr' and 'network_passphrase' query params.
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

  /**
   * Returns a deep clone of this instance.
   *
   * @returns {Sep7Tx} a deep clone of this Sep7Tx instance.
   */
  clone(): Sep7Tx {
    return new Sep7Tx(this.uri);
  }

  /**
   * Returns a URL-decoded version of the uri 'xdr' param.
   *
   * @returns {string | undefined} URL-decoded 'xdr' param if present.
   */
  get xdr(): string | undefined {
    return this.getParam("xdr");
  }

  /**
   * Sets and URL-encodes the uri 'xdr' param.
   *
   * Deletes the uri 'xdr' param if set as 'undefined'.
   *
   * @param {string | undefined} xdr the uri 'xdr' param to be set.
   */
  set xdr(xdr: string | undefined) {
    this.setParam("xdr", xdr);
  }

  /**
   * Returns the uri 'pubkey' param.
   *
   * This param specifies which public key the URI handler should sign for.
   *
   * @returns {string | undefined} URL-decoded 'pubkey' param if present.
   */
  get pubkey(): string | undefined {
    return this.getParam("pubkey");
  }

  /**
   * Sets the uri 'pubkey' param.
   *
   * Deletes the uri 'pubkey' param if set as 'undefined'.
   *
   * This param should specify which public key you want the URI handler
   * to sign for.
   *
   * @param {string | undefined} pubkey the uri 'pubkey' param to be set.
   */
  set pubkey(pubkey: string | undefined) {
    this.setParam("pubkey", pubkey);
  }

  /**
   * Returns a URL-decoded version of the uri 'chain' param.
   *
   * There can be an optional chain query param to include a single SEP-0007
   * request that spawned or triggered the creation of this SEP-0007 request.
   * This will be a URL-encoded value. The goal of this field is to be
   * informational only and can be used to forward SEP-0007 requests.
   *
   * @returns {string | undefined} URL-decoded 'chain' param if present.
   */
  get chain(): string | undefined {
    return this.getParam("chain");
  }

  /**
   * Sets and URL-encodes the uri 'chain' param.
   *
   * Deletes the uri 'chain' param if set as 'undefined'.
   *
   * There can be an optional chain query param to include a single SEP-0007
   * request that spawned or triggered the creation of this SEP-0007 request.
   * This will be a URL-encoded value. The goal of this field is to be
   * informational only and can be used to forward SEP-0007 requests.
   *
   * @param {string | undefined} chain the 'chain' param to be set.
   */
  set chain(chain: string | undefined) {
    this.setParam("chain", chain);
  }

  /**
   * Gets a list of fields in the transaction that need to be replaced.
   *
   * @returns {Sep7Replacement[]} list of fields that need to be replaced.
   */
  getReplacements(): Sep7Replacement[] {
    return sep7ReplacementsFromString(this.getParam("replace"));
  }

  /**
   * Sets and URL-encodes the uri 'replace' param, which is a list of fields in
   * the transaction that needs to be replaced.
   *
   * Deletes the uri 'replace' param if set as empty array '[]' or 'undefined'.
   *
   * This 'replace' param should be a URL-encoded value that identifies the
   * fields to be replaced in the XDR using the 'Txrep (SEP-0011)' representation.
   * This will be specified in the format of:
   * txrep_tx_field_name_1:reference_identifier_1,txrep_tx_field_name_2:reference_identifier_2;reference_identifier_1:hint_1,reference_identifier_2:hint_2
   *
   * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0011.md
   *
   * @param {Sep7Replacement[]} replacements a list of replacements to set.
   */
  setReplacements(replacements: Sep7Replacement[] | undefined) {
    if (!replacements || replacements.length === 0) {
      this.setParam("replace", undefined);
      return;
    }
    this.setParam("replace", sep7ReplacementsToString(replacements));
  }

  /**
   * Adds an additional replacement.
   *
   * @param {Sep7Replacement} replacement the replacement to add.
   */
  addReplacement(replacement: Sep7Replacement) {
    const replacements = this.getReplacements();
    replacements.push(replacement);
    this.setReplacements(replacements);
  }

  /**
   * Removes all replacements with the given identifier.
   *
   * @param {string} id the identifier to remove.
   */
  removeReplacement(id: string) {
    const replacements = this.getReplacements().filter((r) => r.id !== id);
    this.setReplacements(replacements);
  }

  /**
   * Creates a Stellar Transaction from the URI's XDR and networkPassphrase.
   *
   * @returns {Transaction} the Stellar Transaction.
   */
  getTransaction(): Transaction {
    return new Transaction(this.xdr, this.networkPassphrase || Networks.PUBLIC);
  }
}
