import LedgerStr from "@ledgerhq/hw-app-str";
import LedgerTransport from "@ledgerhq/hw-transport-u2f";
import { xdr } from "@stellar/stellar-sdk";

import {
  HandlerSignTransactionParams,
  KeyTypeHandler,
  KeyType,
} from "../Types";

export const ledgerHandler: KeyTypeHandler = {
  keyType: KeyType.ledger,
  async signTransaction(params: HandlerSignTransactionParams) {
    const { transaction, key } = params;

    if (key.privateKey !== "") {
      throw new Error(
        `Non-ledger key sent to ledger handler: ${JSON.stringify(
          key.publicKey,
        )}`,
      );
    }

    /*
      There's a naive way to do this (to keep all functions stateless and
      make the connection anew each time), and there's some way of weaving state
      into this.

      Gonna do the naive thing first and then figure out how to do this right.
    */
    const transport = await LedgerTransport.create(60 * 1000);
    const ledgerApi = new LedgerStr(transport);
    // @ledgerhq/hw-app-str calls Buffer#copy on this argument, which does not
    // exist on Uint8Array, so transactions spanning more than one APDU chunk
    // would throw. This is the only sanctioned Buffer use in the SDK; Ledger
    // here rides hw-transport-u2f, which is browser-only, so React Native is
    // unaffected.
    // eslint-disable-next-line no-restricted-globals
    const signatureBase = Buffer.from(transaction.signatureBase());
    const result = await ledgerApi.signTransaction(key.path, signatureBase);

    // Pass the signature across as base64 rather than constructing an
    // xdr.DecoratedSignature here: this package bundles its own stellar-sdk
    // copy, and a wrapper class built by it is rejected by the consumer's copy.
    // See the note in Handlers/plaintextKey.ts.
    //
    // result.signature is typed as Node's Buffer by @ledgerhq/hw-app-str.
    // The @types/node version resolved in this workspace predates
    // TypeScript's generic typed arrays, so its Buffer type fails structural
    // assignability against encodeBytes' Uint8Array parameter. Uint8Array.from
    // copies the same bytes into a plain Uint8Array to sidestep that; it does
    // not change the encoded value.
    transaction.addSignature(
      key.publicKey,
      xdr.encodeBytes(Uint8Array.from(result.signature), "base64"),
    );

    return Promise.resolve(transaction);
  },
};
