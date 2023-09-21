import { Memo, Server, xdr, Transaction } from "stellar-sdk";
import { AccountKeypair } from "../Horizon/Account";
import { TransactionBuilder } from "../Horizon/Transaction/TransactionBuilder";
import { StellarAssetId } from "../Asset";

export enum NETWORK_URLS {
  PUBLIC = "https://horizon.stellar.org",
  TESTNET = "https://horizon-testnet.stellar.org",
}

export type TransactionParams = {
  sourceAddress: AccountKeypair;
  baseFee?: number;
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
  buildingFunction: (TransactionBuilder) => TransactionBuilder;
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

export type PathPayParams = {
  destinationAddress: string;
  sendAsset: StellarAssetId;
  destAsset: StellarAssetId;
  sendAmount?: string;
  destAmount?: string;
  destMin?: string;
  sendMax?: string;
};
