import TrezorConnect from "trezor-connect";
import transformTransaction from "@trezor/connect-plugin-stellar";

import {
  HandlerSignTransactionParams,
  KeyTypeHandler,
  KeyType,
} from "../../Types";

export const trezorHandler: KeyTypeHandler = {
  keyType: KeyType.trezor,
  async signTransaction(params: HandlerSignTransactionParams) {
    const { transaction, key, custom } = params;

    if (key.privateKey !== "") {
      throw new Error(
        `Non-ledger key sent to ledger handler: ${JSON.stringify(
          key.publicKey,
        )}`,
      );
    }

    if (!custom || !custom.email || !custom.appUrl) {
      throw new Error(
        `Trezor Connect manifest with "email" and "appUrl" props is required.
        Make sure they are passed through "custom" prop.`,
      );
    }

    try {
      TrezorConnect.manifest({
        email: custom.email,
        appUrl: custom.appUrl,
      });

      const trezorParams = transformTransaction("m/44'/148'/0'", transaction);
      const response = await TrezorConnect.stellarSignTransaction(trezorParams);

      if (response.success) {
        const signature = Buffer.from(
          response.payload.signature,
          "hex",
        ).toString("base64");
        transaction.addSignature(key.publicKey, signature);

        return transaction;
      } else {
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (response.payload as any).error ||
            "We couldn’t sign the transaction with Trezor.",
        );
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMsg = (error ).toString();
      throw new Error(
        `We couldn’t sign the transaction with Trezor. ${errorMsg}.`,
      );
    }
  },
};
