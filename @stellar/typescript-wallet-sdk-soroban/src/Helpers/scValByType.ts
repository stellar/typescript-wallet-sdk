import { Address, scValToNative, xdr } from "@stellar/stellar-sdk";

/* eslint-disable jsdoc/require-returns-type */
/**
 * This function attempts to convert smart contract (complex) value types
 * to common/simpler types like string, array, hex string, JSON string, etc.
 *
 * @param {xdr.ScVal} scVal  the smart contract (complex) value
 *
 *
 * @returns the smart contract value converted to a common/simpler
 *     value like string, array, hex string, JSON string, etc.
 *
 * @example
 *   const accountAddress = xdr.ScVal.scvAddress(
 *     new Address("GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB").toScAddress(),
 *   ); ===> complex object
 *
 *   scValByType(accountAddress) returns "GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB"
 */
export const scValByType = (scVal: xdr.ScVal) => {
  switch (scVal.type) {
    case "scvAddress":
      // Address.fromScAddress covers all five ScAddress variants, so no
      // per-variant branching is needed here.
      return Address.fromScAddress(scVal.address).toString();

    case "scvBool":
      return scVal.b;

    case "scvBytes":
      return xdr.encodeBytes(scVal.bytes.toBytes(), "hex");

    case "scvContractInstance": {
      const { executable } = scVal.instance;
      // Only a wasm executable carries a hash; SAC and CAP-85 external-ref
      // executables do not.
      return executable.type === "contractExecutableWasm"
        ? xdr.encodeBytes(executable.wasmHash.toBytes(), "hex")
        : null;
    }

    case "scvError":
      return scVal.error.value;

    case "scvTimepoint":
    case "scvDuration":
    case "scvI128":
    case "scvI256":
    case "scvI32":
    case "scvI64":
    case "scvU128":
    case "scvU256":
    case "scvU32":
    case "scvU64":
      return scValToNative(scVal).toString();

    case "scvLedgerKeyNonce":
      return scVal.nonceKey.nonce.toString();

    case "scvLedgerKeyContractInstance":
      // Void arm — carries no payload.
      return scVal.value;

    case "scvVec":
    case "scvMap":
      return JSON.stringify(
        scValToNative(scVal),
        (_, val) => (typeof val === "bigint" ? val.toString() : val),
        2,
      );

    case "scvString":
    case "scvSymbol": {
      const native = scValToNative(scVal);
      // scValToNative returns a string for well-formed UTF-8 but falls back to
      // raw bytes otherwise. (The previous check compared a constructor to the
      // string "Uint8Array" and was therefore always false.)
      if (native instanceof Uint8Array) {
        return xdr.encodeBytes(native, "hex");
      }
      return native;
    }

    case "scvExecutableTag":
      return scVal.executableTag.toString();

    default:
      return null;
  }
};
