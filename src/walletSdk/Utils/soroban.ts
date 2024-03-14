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

  const parsed = wholeValue.shiftedBy(decimals).plus(fractionValue);

  return BigInt(parsed.toString());
};
