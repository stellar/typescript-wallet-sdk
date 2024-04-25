import {
  Contract,
  Keypair,
  StrKey,
  hash,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";

// Returns random public key
export const randomKey = (): string => {
  return Keypair.random().publicKey();
};

// Creates a 'n' number of contracts with random ids
export const randomContracts = (n: number) => {
  return Array.from(Array(n).keys()).map(() => {
    // ezpz method to generate random contract IDs
    const buf = hash(Buffer.from(randomKey()));
    const contractId = StrKey.encodeContract(buf);
    return new Contract(contractId);
  });
};

// Returns a SorobanAuthorizedFunction invocation with given args
export const makeInvocation = (
  contract: Contract,
  name: string,
  ...args: any[]
): xdr.SorobanAuthorizedFunction => {
  return xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
    new xdr.InvokeContractArgs({
      contractAddress: contract.address().toScAddress(),
      functionName: name,
      args: args.map((arg) => nativeToScVal(arg)),
    }),
  );
};
