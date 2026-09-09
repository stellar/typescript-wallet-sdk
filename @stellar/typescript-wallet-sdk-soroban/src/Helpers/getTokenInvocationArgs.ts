import { Address, Operation, scValToNative, xdr } from "@stellar/stellar-sdk";

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

  // Address.fromScAddress handles every ScAddress variant, so muxed senders and
  // recipients resolve instead of throwing.
  const addressAt = (index: number): string => {
    const scVal = args[index];
    if (scVal.type !== "scvAddress") {
      throw new TypeError(`expected an address at arg ${index}`);
    }
    return Address.fromScAddress(scVal.address).toString();
  };

  switch (fnName) {
    case SorobanTokenInterface.transfer:
      from = addressAt(0);
      to = addressAt(1);
      amount = scValToNative(args[2]);
      break;
    case SorobanTokenInterface.mint:
      to = addressAt(0);
      amount = scValToNative(args[1]);
      break;
    default:
      amount = BigInt(0);
  }

  return { from, to, amount };
};

/**
 * Get params and args related to the invoked contract. It must use a valid
 * "transfer" or "mint" invocation otherwise it will return 'null'.
 *
 * @param {Operation.InvokeHostFunction} hostFn - The invoke host function.
 *
 * @returns {TokenInvocationArgs | null} Params and args related to the
 * "transfer" or "mint" invocation like function name, contract id, from/to
 * addresses and amount.
 */
export const getTokenInvocationArgs = (
  hostFn: Operation.InvokeHostFunction,
): TokenInvocationArgs | null => {
  if (hostFn?.func?.type !== "hostFunctionTypeInvokeContract") {
    return null;
  }

  const invokedContract: xdr.InvokeContractArgs = hostFn.func.invokeContract;

  const contractId = Address.fromScAddress(
    invokedContract.contractAddress,
  ).toString();
  const fnName =
    invokedContract.functionName.toString() as SorobanTokenInterface;
  const args = invokedContract.args;

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
