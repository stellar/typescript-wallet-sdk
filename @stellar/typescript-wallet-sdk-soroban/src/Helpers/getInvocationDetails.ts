import { Address, Asset, StrKey, xdr } from "@stellar/stellar-sdk";

import { InvocationArgs } from "Types";

// TODO: add jsdoc description
export function getInvocationDetails(
  invocation: xdr.SorobanAuthorizedInvocation,
): InvocationArgs[] {
  const invocations = [
    getInvocationArgs(invocation),
    ...invocation.subInvocations().map(getInvocationArgs),
  ];
  return invocations.filter(isInvocationArg);
}

const isInvocationArg = (
  invocation: InvocationArgs | undefined,
): invocation is InvocationArgs => !!invocation;

function getInvocationArgs(
  invocation: xdr.SorobanAuthorizedInvocation,
): InvocationArgs | undefined {
  const fn = invocation.function();

  switch (fn.switch().value) {
    // sorobanAuthorizedFunctionTypeContractFn
    case 0: {
      const _invocation = fn.contractFn();
      const contractId = StrKey.encodeContract(
        _invocation.contractAddress().contractId(),
      );
      const fnName = _invocation.functionName().toString();
      const args = _invocation.args();
      return { fnName, contractId, args, type: "invoke" };
    }

    // sorobanAuthorizedFunctionTypeCreateContractHostFn
    case 1: {
      const _invocation = fn.createContractHostFn();
      const [exec, preimage] = [
        _invocation.executable(),
        _invocation.contractIdPreimage(),
      ];

      switch (exec.switch().value) {
        // contractExecutableWasm
        case 0: {
          const details = preimage.fromAddress();

          return {
            type: "wasm",
            salt: details.salt().toString("hex"),
            hash: exec.wasmHash().toString("hex"),
            address: Address.fromScAddress(details.address()).toString(),
          };
        }

        // contractExecutableStellarAsset
        case 1:
          return {
            type: "sac",
            asset: Asset.fromOperation(preimage.fromAsset()).toString(),
          };

        default:
          throw new Error(`unknown creation type: ${JSON.stringify(exec)}`);
      }
    }

    default: {
      return undefined;
    }
  }
}
