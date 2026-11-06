import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Operation,
  Transaction,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk";

// A Protocol 30 (CAP-84) muxed contract address: SEP-23's test vector
// contract with the largest mux ID, 2^64 - 1.
export const MUXED_CONTRACT_MAX_ID =
  "WA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJV7777777777777GMO";

// A native XLM Stellar Asset Contract transfer from `source` to
// MUXED_CONTRACT_MAX_ID.
export function buildTransferToMuxedContract(
  source: string,
  networkPassphrase: string,
): Transaction {
  return new TransactionBuilder(new Account(source, "100"), {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: Asset.native().contractId(networkPassphrase),
        function: "transfer",
        args: [
          new Address(source).toScVal(),
          new Address(MUXED_CONTRACT_MAX_ID).toScVal(),
          nativeToScVal(BigInt(12345), { type: "i128" }),
        ],
      }),
    )
    .setTimeout(30)
    .build();
}

// Reads the `to` argument of a transaction built by
// buildTransferToMuxedContract, as a strkey.
export function transferRecipient(tx: Transaction): string {
  const { func } = tx.operations[0] as Operation.InvokeHostFunction;
  if (func.type !== "hostFunctionTypeInvokeContract") {
    throw new Error(`expected a contract invocation, not ${func.type}`);
  }
  const to = func.invokeContract.args[1];
  if (to.type !== "scvAddress") {
    throw new Error(`expected an address, not ${to.type}`);
  }
  return Address.fromScAddress(to.address).toString();
}
