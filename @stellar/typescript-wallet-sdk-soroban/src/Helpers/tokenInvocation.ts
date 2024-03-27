import { Operation, StrKey, scValToNative, xdr } from "@stellar/stellar-sdk";

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
