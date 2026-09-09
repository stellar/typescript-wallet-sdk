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
    // would throw. This is the only sanctioned Buffer use in the SDK, and it
    // resolves to the bundled npm polyfill rather than a host global —
    // webpack's ProvidePlugin injects it into this module (see
    // webpack.config.js), which is why the React Native sandbox test can load
    // this bundle with no Buffer global present.
    //
    // React Native does load this module: keyManager.ts imports ledgerHandler
    // unconditionally and Metro resolves the browser bundle. What is
    // browser-specific is *using* the handler, since it rides
    // hw-transport-u2f.
    // eslint-disable-next-line no-restricted-globals
    const signatureBase = Buffer.from(transaction.signatureBase());
    const result = await ledgerApi.signTransaction(key.path, signatureBase);

    // Pass the signature across as base64 rather than constructing an
    // xdr.DecoratedSignature here: this package bundles its own stellar-sdk
    // copy, and a wrapper class built by it is rejected by the consumer's copy.
    // See the note in Handlers/plaintextKey.ts.
    transaction.addSignature(
      key.publicKey,
      xdr.encodeBytes(result.signature, "base64"),
    );

    return Promise.resolve(transaction);
  },
};
