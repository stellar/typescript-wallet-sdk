import { Address, Asset, xdr } from "@stellar/stellar-sdk";

import { InvocationArgs } from "Types";

/**
 * Extract invocation args and params from a Soroban authorized invocation
 * tree, walking every sub invocation at any depth.
 *
 * An invocation arm that cannot be decoded — an unrecognised authorized
 * function type, an unrecognised contract executable, or a contract-id
 * preimage that does not match its executable — is never silently omitted:
 * it is surfaced as an `FnArgsUnknown` entry in the returned list instead, so
 * a caller (such as a wallet's transaction-review screen) can fail closed on
 * its own terms rather than display a list that looks complete but omits an
 * action awaiting approval.
 *
 * @param {xdr.SorobanAuthorizedInvocation} invocationTree - The invocation tree.
 *
 * @returns {InvocationArgs[]} A depth-first list of user friendly invocation
 * args and params for the root invocation and all of its nested sub
 * invocations. Undecodable arms are included as `FnArgsUnknown` entries
 * rather than omitted.
 */
export const getInvocationDetails = (
  invocationTree: xdr.SorobanAuthorizedInvocation,
): InvocationArgs[] => [
  getInvocationArgs(invocationTree),
  ...invocationTree.subInvocations.flatMap((subInvocation) =>
    getInvocationDetails(subInvocation),
  ),
];

const getCreateContractArgs = (
  functionType: string,
  executable: xdr.ContractExecutable,
  preimage: xdr.ContractIdPreimage,
  constructorArgs?: xdr.ScVal[],
): InvocationArgs => {
  // constructorArgs is a sibling of `executable` in CreateContractV2, so it can
  // accompany any executable variant and is surfaced on all of them.
  const extra = constructorArgs ? { constructorArgs } : {};
  // Captured up front: the switch below narrows `executable` to `never` in
  // its default arm (an exhaustive switch over a closed union), so `.type`
  // is no longer readable there once TypeScript has narrowed it away.
  const executableType = executable.type;
  const preimageType = preimage.type;

  switch (executable.type) {
    case "contractExecutableWasm": {
      if (preimage.type !== "contractIdPreimageFromAddress") {
        return {
          type: "unknown",
          reason: "executablePreimageMismatch",
          functionType,
          executableType,
          preimageType,
        };
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
        return {
          type: "unknown",
          reason: "executablePreimageMismatch",
          functionType,
          executableType,
          preimageType,
        };
      }
      return {
        type: "sac",
        asset: Asset.fromOperation(preimage.fromAsset).toString(),
        ...extra,
      };
    }

    case "contractExecutableExternalRef": {
      // A wasm or external-ref executable derives its contract ID from a
      // deployer address plus salt, so its preimage MUST be an address —
      // same guard as the wasm arm above. Only a token/SAC pairs with an
      // asset preimage.
      if (preimage.type !== "contractIdPreimageFromAddress") {
        return {
          type: "unknown",
          reason: "executablePreimageMismatch",
          functionType,
          executableType,
          preimageType,
        };
      }
      const details = preimage.fromAddress;
      const ref = executable.externalRef;

      // CAP-85: the referenced code can change after signing, so deliberately
      // surface the owner and tag but no hash.
      return {
        type: "externalRef",
        executableOwner: Address.fromScAddress(ref.executableOwner).toString(),
        // asStringOrBytes(), not toString(): the tag is an unbounded SCString
        // and toString() is a lenient UTF-8 decode that substitutes U+FFFD,
        // so two distinct binary tags could otherwise render identically.
        tag: ref.tag.asStringOrBytes(),
        salt: xdr.encodeBytes(details.salt.toBytes(), "hex"),
        address: Address.fromScAddress(details.address).toString(),
        ...extra,
      };
    }

    default:
      // Degrade instead of throwing: an unrecognised future executable must not
      // crash a wallet's transaction-review screen.
      return {
        type: "unknown",
        reason: "unsupportedExecutable",
        functionType,
        executableType,
        preimageType,
      };
  }
};

export const getInvocationArgs = (
  invocation: xdr.SorobanAuthorizedInvocation,
): InvocationArgs => {
  const fn = invocation.function;
  // Captured up front: the switch below narrows `fn` to `never` in its
  // default arm (an exhaustive switch over a closed union), so `.type` is
  // no longer readable there once TypeScript has narrowed it away.
  const functionType = fn.type;

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
        fn.type,
        _invocation.executable,
        _invocation.contractIdPreimage,
      );
    }

    case "sorobanAuthorizedFunctionTypeCreateContractV2HostFn": {
      const _invocation = fn.createContractV2HostFn;
      return getCreateContractArgs(
        fn.type,
        _invocation.executable,
        _invocation.contractIdPreimage,
        _invocation.constructorArgs,
      );
    }

    default:
      // Degrade instead of throwing: an unrecognised future authorized
      // function type must not crash a wallet's transaction-review screen.
      return {
        type: "unknown",
        reason: "unsupportedFunction",
        functionType,
      };
  }
};
