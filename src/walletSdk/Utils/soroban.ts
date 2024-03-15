import { Operation, StrKey, scValToNative, xdr } from "@stellar/stellar-sdk";
import BigNumber from "bignumber.js";

import {
  ArgsForTokenInvocation,
  SorobanTokenInterface,
  TokenInvocationArgs,
} from "../Types";

export const getArgsForTokenInvocation = (
  fnName: string,
  args: xdr.ScVal[],
): ArgsForTokenInvocation => {
  let amount: bigint | number;
  let from = "";
  let to = "";

  switch (fnName) {
    case SorobanTokenInterface.transfer:
      from = StrKey.encodeEd25519PublicKey(
        args[0].address().accountId().ed25519(),
      );
      to = StrKey.encodeEd25519PublicKey(
        args[1].address().accountId().ed25519(),
      );
      amount = scValToNative(args[2]);
      break;
    case SorobanTokenInterface.mint:
      to = StrKey.encodeEd25519PublicKey(
        args[0].address().accountId().ed25519(),
      );
      amount = scValToNative(args[1]);
      break;
    default:
      amount = BigInt(0);
  }

  return { from, to, amount };
};

export const getTokenInvocationArgs = (
  hostFn: Operation.InvokeHostFunction,
): TokenInvocationArgs | null => {
  if (!hostFn?.func?.invokeContract) {
    return null;
  }

  let invokedContract: xdr.InvokeContractArgs;

  try {
    invokedContract = hostFn.func.invokeContract();
  } catch (e) {
    return null;
  }

  const contractId = StrKey.encodeContract(
    invokedContract.contractAddress().contractId(),
  );
  const fnName = invokedContract
    .functionName()
    .toString() as SorobanTokenInterface;
  const args = invokedContract.args();

  if (
    ![SorobanTokenInterface.transfer, SorobanTokenInterface.mint].includes(
      fnName,
    )
  ) {
    return null;
  }

  let opArgs: ArgsForTokenInvocation;

  try {
    opArgs = getArgsForTokenInvocation(fnName, args);
  } catch (e) {
    return null;
  }

  return {
    fnName,
    contractId,
    ...opArgs,
  };
};

// Adopted from https://github.com/ethers-io/ethers.js/blob/master/packages/bignumber/src.ts/fixednumber.ts#L27
/*
  This function formats an integer amount (e.g. a bigint value which is broadly
  used in the soroban env) to a stringfied floating amount. This function is
  basically the counterpart of the 'parseTokenAmount' function below.

  E.g: formatTokenAmount(BigInt(10000001234567), 7) => "1000000.1234567"  
*/
export const formatTokenAmount = (
  amount: bigint | BigNumber | number | string,
  decimals: number,
): string => {
  const bigNumberAmount = new BigNumber(amount.toString());

  let formatted = bigNumberAmount.toString();

  if (decimals > 0) {
    formatted = bigNumberAmount
      .shiftedBy(-decimals)
      .toFixed(decimals)
      .toString();

    // Trim trailing zeros
    while (formatted[formatted.length - 1] === "0") {
      formatted = formatted.substring(0, formatted.length - 1);
    }

    if (formatted.endsWith(".")) {
      formatted = formatted.substring(0, formatted.length - 1);
    }
  }

  return formatted;
};

/*
  This function parses a floating amount to a bigint amount, which is broadly
  used in the soroban env. This function is basically the counterpart of the
  'formatTokenAmount' function above.

  E.g: parseTokenAmount("1000000.1234567", 7) => BigInt(10000001234567)
*/
export const parseTokenAmount = (
  amount: string | number | BigNumber | bigint,
  decimals: number,
): bigint => {
  const comps = amount.toString().split(".");

  let whole = comps[0];
  let fraction = comps[1];
  if (!whole) {
    whole = "0";
  }
  if (!fraction) {
    fraction = "0";
  }

  // Trim trailing zeros
  while (fraction[fraction.length - 1] === "0") {
    fraction = fraction.substring(0, fraction.length - 1);
  }

  // If decimals is 0, we have an empty string for fraction
  if (fraction === "") {
    fraction = "0";
  }

  // Fully pad the string with zeros to get to value
  while (fraction.length < decimals) {
    fraction += "0";
  }

  const wholeValue = new BigNumber(whole);
  const fractionValue = new BigNumber(fraction);

  // This basically appends the 'whole' and 'fraction' values into
  // an integer value
  const parsed = wholeValue.shiftedBy(decimals).plus(fractionValue);

  return BigInt(parsed.toString());
};

// This function attempt to convert soroban contract values
// to common types like string, array, buffer, JSON string, etc.
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
