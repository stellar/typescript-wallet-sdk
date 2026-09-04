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
    ...invocationTree.subInvocations.flatMap((subInvocation) =>
      getInvocationDetails(subInvocation),
    ),
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
): InvocationArgs | undefined => {
  // constructorArgs is a sibling of `executable` in CreateContractV2, so it can
  // accompany any executable variant and is surfaced on all of them.
  const extra = constructorArgs ? { constructorArgs } : {};

  switch (executable.type) {
    case "contractExecutableWasm": {
      if (preimage.type !== "contractIdPreimageFromAddress") {
        return undefined;
      }
      const details = preimage.fromAddress;

      return {
        type: "wasm",
        salt: xdr.encodeBytes(details.salt.toBytes(), "hex"),
        hash: xdr.encodeBytes(executable.wasmHash.toBytes(), "hex"),
        address: Address.fromScAddress(details.address).toString(),
        ...extra,
      };
    }

    case "contractExecutableStellarAsset": {
      if (preimage.type !== "contractIdPreimageFromAsset") {
        return undefined;
      }
      return {
        type: "sac",
        asset: Asset.fromOperation(preimage.fromAsset).toString(),
        ...extra,
      };
    }

    case "contractExecutableExternalRef": {
      // CAP-85: the referenced code can change after signing, so deliberately
      // surface the owner and tag but no hash.
      const ref = executable.externalRef;
      return {
        type: "externalRef",
        executableOwner: Address.fromScAddress(ref.executableOwner).toString(),
        tag: ref.tag.toString(),
        ...extra,
      };
    }

    default:
      // Degrade instead of throwing: an unrecognised future executable must not
      // crash a wallet's transaction-review screen.
      return undefined;
  }
};

export const getInvocationArgs = (
  invocation: xdr.SorobanAuthorizedInvocation,
): InvocationArgs | undefined => {
  const fn = invocation.function;

  switch (fn.type) {
    case "sorobanAuthorizedFunctionTypeContractFn": {
      const _invocation = fn.contractFn;
      return {
        fnName: _invocation.functionName.toString(),
        contractId: Address.fromScAddress(
          _invocation.contractAddress,
        ).toString(),
        args: _invocation.args,
        type: "invoke",
      };
    }

    case "sorobanAuthorizedFunctionTypeCreateContractHostFn": {
      const _invocation = fn.createContractHostFn;
      return getCreateContractArgs(
        _invocation.executable,
        _invocation.contractIdPreimage,
      );
    }

    case "sorobanAuthorizedFunctionTypeCreateContractV2HostFn": {
      const _invocation = fn.createContractV2HostFn;
      return getCreateContractArgs(
        _invocation.executable,
        _invocation.contractIdPreimage,
        _invocation.constructorArgs,
      );
    }

    default:
      return undefined;
  }
};
