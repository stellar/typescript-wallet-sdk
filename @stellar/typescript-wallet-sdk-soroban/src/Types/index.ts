import { xdr } from "@stellar/stellar-sdk";

// https://github.com/stellar/soroban-examples/blob/main/token/src/contract.rs
export enum SorobanTokenInterface {
  transfer = "transfer",
  mint = "mint",
}

export type ArgsForTokenInvocation = {
  from: string;
  to: string;
  amount: bigint | number;
};

export type TokenInvocationArgs = ArgsForTokenInvocation & {
  fnName: SorobanTokenInterface;
  contractId: string;
};

export interface FnArgsInvoke {
  type: "invoke";
  fnName: string;
  contractId: string;
  args: xdr.ScVal[];
}

export interface FnArgsCreateWasm {
  type: "wasm";
  salt: string;
  hash: string;
  address: string;
  // Present (possibly empty) for CreateContractV2 host functions; absent for
  // the legacy CreateContractHostFn.
  constructorArgs?: xdr.ScVal[];
}

export interface FnArgsCreateSac {
  type: "sac";
  asset: string;
  // Present (possibly empty) for CreateContractV2 host functions; absent for
  // the legacy CreateContractHostFn.
  constructorArgs?: xdr.ScVal[];
}

export interface FnArgsCreateExternalRef {
  type: "externalRef";
  // Contract that owns the referenced executable.
  executableOwner: string;
  // CAP-85 tag naming the executable within the owner contract. It is an
  // unbounded SCString, so it is not always text: a lenient UTF-8 decode
  // would render two distinct tags identically, and the tag is half of what
  // identifies the code being deployed. Binary tags come back as raw bytes
  // instead, matching scValToNative's own fallback behaviour.
  tag: string | Uint8Array;
  // Deployer address and salt, which together derive the new contract's ID
  // (same pairing FnArgsCreateWasm surfaces for a wasm executable).
  address: string;
  salt: string;
  // Present (possibly empty) for CreateContractV2 host functions; absent for
  // the legacy CreateContractHostFn.
  constructorArgs?: xdr.ScVal[];
}

export interface FnArgsUnknown {
  type: "unknown";
  // Why this invocation could not be decoded.
  reason:
    | "unsupportedFunction"
    | "unsupportedExecutable"
    | "executablePreimageMismatch";
  // XDR variant names involved, for diagnostics and for display in a
  // transaction-review screen.
  functionType: string;
  executableType?: string;
  preimageType?: string;
}

export type InvocationArgs =
  | FnArgsInvoke
  | FnArgsCreateWasm
  | FnArgsCreateSac
  | FnArgsCreateExternalRef
  | FnArgsUnknown;
