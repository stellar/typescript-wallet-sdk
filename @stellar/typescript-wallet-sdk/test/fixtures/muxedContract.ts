import { Address, Operation, Transaction } from "@stellar/stellar-sdk";

// Protocol 30 (CAP-84) muxed contract addresses: a contract ID plus a uint64
// mux ID, encoded as a "W..." strkey.

// SEP-23's test vector: this contract with mux ID 0.
export const SEP23_CONTRACT =
  "CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUWDA";
export const SEP23_MUXED_CONTRACT =
  "WA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAAAAAAWWC";

// The same contract with the largest mux ID, 2^64 - 1, which a JS number
// can't hold exactly.
export const MUXED_CONTRACT_MAX_ID =
  "WA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJV7777777777777GMO";

// SEP23_MUXED_CONTRACT with its last character changed, so the checksum
// doesn't match.
export const MUXED_CONTRACT_BAD_CHECKSUM =
  "WA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAAAAAAWWA";

export const TRANSFER_SOURCE =
  "GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57";

// The native XLM Stellar Asset Contract on testnet.
export const TESTNET_NATIVE_SAC =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// An unsigned testnet transaction with one operation: TESTNET_NATIVE_SAC's
// transfer(TRANSFER_SOURCE, MUXED_CONTRACT_MAX_ID, 12345). Its only Protocol 30
// part is the `to` argument, an ScAddress of type SC_ADDRESS_TYPE_MUXED_CONTRACT.
export const TRANSFER_TO_MUXED_CONTRACT_XDR =
  "AAAAAgAAAADqSmxj4pxSCr71UHsTLsX5lUd2rr6+e5JCHuppFEbSLAAAAGQAAAAAAAAAZAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAAB15KLcsJwPM/q9+uf9O9NUEpVqLl5/JtFDqLIQrTRzmEAAAAIdHJhbnNmZXIAAAADAAAAEgAAAAAAAAAA6kpsY+KcUgq+9VB7Ey7F+ZVHdq6+vnuSQh7qaRRG0iwAAAASAAAABf//////////Pww0v5OtDZlx0EzMkPcFURyDiq2XNKSi+w16A/x/6JoAAAAKAAAAAAAAAAAAAAAAAAAwOQAAAAAAAAAAAAAAAA==";

// Reads the `to` argument of the transfer in a transaction like
// TRANSFER_TO_MUXED_CONTRACT_XDR, as a strkey.
export const transferRecipient = (tx: Transaction): string => {
  const { func } = tx.operations[0] as Operation.InvokeHostFunction;
  if (func.type !== "hostFunctionTypeInvokeContract") {
    throw new Error(`expected a contract invocation, not ${func.type}`);
  }
  const to = func.invokeContract.args[1];
  if (to.type !== "scvAddress") {
    throw new Error(`expected an address, not ${to.type}`);
  }
  return Address.fromScAddress(to.address).toString();
};
