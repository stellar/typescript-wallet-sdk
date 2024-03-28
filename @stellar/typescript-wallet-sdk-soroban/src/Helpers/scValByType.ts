import { StrKey, scValToNative, xdr } from "@stellar/stellar-sdk";

/**
 * This function attempts to convert smart contract (complex) value types
 * to common/simpler types like string, array, buffer, JSON string, etc.
 *
 * @param {xdr.ScVal} scVal  the smart contract (complex) value
 *
 * @returns {any}  the smart contract value converted to a common/simpler
 *     value like string, array, buffer, JSON string, etc.
 *
 * @example
 *   const accountAddress = xdr.ScVal.scvAddress(
 *     xdr.ScAddress.scAddressTypeAccount(
 *       xdr.PublicKey.publicKeyTypeEd25519(
 *         StrKey.decodeEd25519PublicKey("GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB"),
 *       ),
 *     )
 *   ); ===> complex object
 *
 *   scValByType(accountAddress) returns "GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB"
 */
export const scValByType = (scVal: xdr.ScVal) => {
  switch (scVal.switch()) {
    case xdr.ScValType.scvAddress(): {
      const address = scVal.address();
      const addressType = address.switch();
      if (addressType.name === "scAddressTypeAccount") {
        return StrKey.encodeEd25519PublicKey(address.accountId().ed25519());
      }
      return StrKey.encodeContract(address.contractId());
    }

    case xdr.ScValType.scvBool(): {
      return scVal.b();
    }

    case xdr.ScValType.scvBytes(): {
      return JSON.stringify(scVal.bytes().toJSON().data);
    }

    case xdr.ScValType.scvContractInstance(): {
      const instance = scVal.instance();
      return instance.executable().wasmHash()?.toString();
    }

    case xdr.ScValType.scvError(): {
      const error = scVal.error();
      return error.value();
    }

    case xdr.ScValType.scvTimepoint():
    case xdr.ScValType.scvDuration():
    case xdr.ScValType.scvI128():
    case xdr.ScValType.scvI256():
    case xdr.ScValType.scvI32():
    case xdr.ScValType.scvI64():
    case xdr.ScValType.scvU128():
    case xdr.ScValType.scvU256():
    case xdr.ScValType.scvU32():
    case xdr.ScValType.scvU64(): {
      return scValToNative(scVal).toString();
    }

    case xdr.ScValType.scvLedgerKeyNonce():
    case xdr.ScValType.scvLedgerKeyContractInstance(): {
      if (scVal.switch().name === "scvLedgerKeyNonce") {
        const val = scVal.nonceKey().nonce();
        return val.toString();
      }
      return scVal.value();
    }

    case xdr.ScValType.scvVec():
    case xdr.ScValType.scvMap(): {
      return JSON.stringify(
        scValToNative(scVal),
        (_, val) => (typeof val === "bigint" ? val.toString() : val),
        2,
      );
    }

    case xdr.ScValType.scvString():
    case xdr.ScValType.scvSymbol(): {
      const native = scValToNative(scVal);
      if (native.constructor === "Uint8Array") {
        return native.toString();
      }
      return native;
    }

    case xdr.ScValType.scvVoid(): {
      return null;
    }

    default:
      return null;
  }
};
