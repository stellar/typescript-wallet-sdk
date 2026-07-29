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

export type InvocationArgs = FnArgsInvoke | FnArgsCreateWasm | FnArgsCreateSac;
