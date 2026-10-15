import freighterApi from "@stellar/freighter-api";
import {
  Networks,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

import {
  HandlerSignTransactionParams,
  KeyTypeHandler,
  KeyType,
} from "../Types";

export const freighterHandler: KeyTypeHandler = {
  keyType: KeyType.freighter,
  async signTransaction(params: HandlerSignTransactionParams) {
    const { transaction, key, custom } = params;

    if (key.privateKey !== "") {
      throw new Error(
        `Non-Freighter key sent to Freighter handler: ${key.publicKey}`,
      );
    }

    const networkPassphrase =
      (custom && custom.networkPassphrase) || key.network || Networks.PUBLIC;

    // Freighter signs for the network named here, not the one the transaction
    // was built for, so refuse rather than sign for a different network.
    if (networkPassphrase !== transaction.networkPassphrase) {
      throw new Error(
        `Network mismatch: the transaction is for "${transaction.networkPassphrase}", but signing was requested for "${networkPassphrase}"`,
      );
    }

    try {
      const response = await freighterApi.signTransaction(transaction.toXdr(), {
        networkPassphrase,
        address: custom && custom.address ? custom.address : undefined,
      });

      if (response.error) {
        const { message, code } = response.error;
        throw new Error(
          message
            ? `Freighter signTransaction failed: ${message} (code ${code})`
            : `Freighter signTransaction failed with code ${code}`,
        );
      }

      // fromXdr() returns type "Transaction | FeeBumpTransaction" and
      // signTransaction() doesn't like "| FeeBumpTransaction" type, so casting
      // to "Transaction" type.
      return TransactionBuilder.fromXdr(
        response.signedTxXdr,
        networkPassphrase,
      ) as Transaction;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      const errorMsg = String(error);
      throw new Error(
        `We couldn't sign the transaction with Freighter. ${errorMsg}.`,
      );
    }
  },
};
