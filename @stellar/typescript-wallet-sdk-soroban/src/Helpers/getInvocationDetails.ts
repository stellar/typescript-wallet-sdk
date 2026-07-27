import { Address, Asset, xdr } from "@stellar/stellar-sdk";

import { InvocationArgs } from "Types";

/**
 * Extract invocation args and params from a Soroban authorized invocation
 * tree, walking every sub invocation at any depth.
 *
 * @param {xdr.SorobanAuthorizedInvocation} invocationTree - The invocation tree.
 *
 * @returns {InvocationArgs[]} A depth-first list of user friendly invocation
 * args and params for the root invocation and all of its nested sub
 * invocations.
 */
export const getInvocationDetails = (
  invocationTree: xdr.SorobanAuthorizedInvocation,
): InvocationArgs[] => {
  const invocations = [
    getInvocationArgs(invocationTree),
    ...invocationTree
      .subInvocations()
      .flatMap((subInvocation) => getInvocationDetails(subInvocation)),
  ];
  return invocations.filter(isInvocationArg);
};

const isInvocationArg = (
  invocation: InvocationArgs | undefined,
): invocation is InvocationArgs => !!invocation;

const getCreateContractArgs = (
  executable: xdr.ContractExecutable,
  preimage: xdr.ContractIdPreimage,
  constructorArgs?: xdr.ScVal[],
): InvocationArgs => {
  switch (executable.switch().value) {
    // contractExecutableWasm
    case 0: {
      const details = preimage.fromAddress();

      return {
        type: "wasm",
        salt: details.salt().toString("hex"),
        hash: executable.wasmHash().toString("hex"),
        address: Address.fromScAddress(details.address()).toString(),
        ...(constructorArgs ? { constructorArgs } : {}),
      };
    }

    // contractExecutableStellarAsset
    case 1:
      return {
        type: "sac",
        asset: Asset.fromOperation(preimage.fromAsset()).toString(),
      };

    default:
      throw new Error(`unknown creation type: ${JSON.stringify(executable)}`);
  }
};

export const getInvocationArgs = (
  invocation: xdr.SorobanAuthorizedInvocation,
): InvocationArgs | undefined => {
  const fn = invocation.function();

  switch (fn.switch().value) {
    // sorobanAuthorizedFunctionTypeContractFn
    case 0: {
      const _invocation = fn.contractFn();
      const contractId = Address.fromScAddress(
        _invocation.contractAddress(),
      ).toString();
      const fnName = _invocation.functionName().toString();
      const args = _invocation.args();
      return { fnName, contractId, args, type: "invoke" };
    }

    // sorobanAuthorizedFunctionTypeCreateContractHostFn
    case 1: {
      const _invocation = fn.createContractHostFn();
      return getCreateContractArgs(
        _invocation.executable(),
        _invocation.contractIdPreimage(),
      );
    }

    // sorobanAuthorizedFunctionTypeCreateContractV2HostFn
    case 2: {
      const _invocation = fn.createContractV2HostFn();
      return getCreateContractArgs(
        _invocation.executable(),
        _invocation.contractIdPreimage(),
        _invocation.constructorArgs(),
      );
    }

    default: {
      return undefined;
    }
  }
};
