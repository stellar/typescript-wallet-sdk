import { Memo, Server, xdr, Transaction } from "stellar-sdk";
import { AccountKeypair } from "../Horizon/Account";

export enum NETWORK_URLS {
  PUBLIC = "https://horizon.stellar.org",
  TESTNET = "https://horizon-testnet.stellar.org",
}

export type TransactionParams = {
  sourceAddress: AccountKeypair;
  baseFee: number;
  memo?: Memo;
  timebounds?: Server.Timebounds | number;
};

export type FeeBumpTransactionParams = {
  feeAddress: AccountKeypair;
  transaction: Transaction;
  baseFee?: number;
};

export type SubmitWithFeeIncreaseParams = {
  sourceAddress: AccountKeypair;
  timeout: number;
  baseFeeIncrease: number;
  operations: Array<xdr.Operation>;
  signerFunction?: (Transaction) => Transaction;
  baseFee?: number;
  memo?: Memo;
  maxFee?: number;
};

export const HORIZON_LIMIT_MAX = 200;
export const HORIZON_LIMIT_DEFAULT = 10;

export enum HORIZON_ORDER {
  ASC = "asc",
  DESC = "desc",
}
