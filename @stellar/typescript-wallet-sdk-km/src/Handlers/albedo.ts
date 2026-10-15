import albedo from "@albedo-link/intent";
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

// Albedo's tx intent takes a network name, and it supports only these two
// networks.
const albedoNetworks = new Map<string, string>([
  [Networks.PUBLIC, "public"],
  [Networks.TESTNET, "testnet"],
]);

export const albedoHandler: KeyTypeHandler = {
  keyType: KeyType.albedo,
  async signTransaction(params: HandlerSignTransactionParams) {
    const { transaction, key, custom } = params;

    if (key.privateKey !== "") {
      throw new Error(
        `Non-ledger key sent to ledger handler: ${JSON.stringify(
          key.publicKey,
        )}`,
      );
    }

    const networkPassphrase =
      (custom && custom.networkPassphrase) || key.network || Networks.PUBLIC;

    // Albedo signs for the network named here, not the one the transaction
    // was built for, so refuse rather than sign for a different network.
    if (networkPassphrase !== transaction.networkPassphrase) {
      throw new Error(
        `Network mismatch: the transaction is for "${transaction.networkPassphrase}", but signing was requested for "${networkPassphrase}"`,
      );
    }

    const network = albedoNetworks.get(networkPassphrase);

    if (!network) {
      throw new Error(
        `Albedo can only sign for Networks.PUBLIC or Networks.TESTNET, not "${networkPassphrase}"`,
      );
    }

    try {
      const xdr = transaction.toXdr();
      const response = await albedo.tx({ xdr, network });

      if (!response.signed_envelope_xdr) {
        throw new Error("We couldn’t sign the transaction with Albedo.");
      }

      if (response.network !== network) {
        throw new Error(
          `Albedo signed for the "${response.network}" network, but "${network}" was requested`,
        );
      }

      // fromXdr() returns type "Transaction | FeeBumpTransaction" and
      // signTransaction() doesn't like "| FeeBumpTransaction" type, so casting
      // to "Transaction" type.
      return TransactionBuilder.fromXdr(
        response.signed_envelope_xdr,
        networkPassphrase,
      ) as Transaction;
    } catch (error) {
      const errorMsg = error.toString();
      throw new Error(
        `We couldn’t sign the transaction with Albedo. ${errorMsg}.`,
      );
    }
  },
};
