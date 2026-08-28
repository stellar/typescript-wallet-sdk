import { Memo, Horizon, Transaction } from "@stellar/stellar-sdk";
import { AccountKeypair } from "../Horizon/Account";
import { SponsoringBuilder, TransactionBuilder } from "../Horizon";
import { StellarAssetId } from "../Asset";

export enum NETWORK_URLS {
  PUBLIC = "https://horizon.stellar.org",
  TESTNET = "https://horizon-testnet.stellar.org",
}

export type TransactionParams = {
  sourceAddress: AccountKeypair;
  baseFee?: number;
  memo?: Memo;
  timebounds?: Horizon.Server.Timebounds | number;
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
  buildingFunction: (builder: TransactionBuilder) => TransactionBuilder;
  signerFunction?: (transaction: Transaction) => Transaction;
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
} & (
  | {
      // Strict send: spend exactly sendAmount, receive at least destMin
      sendAmount: string;
      destMin: string;
      destAmount?: never;
      sendMax?: never;
    }
  | {
      // Strict receive: deliver exactly destAmount, spend at most sendMax
      destAmount: string;
      sendMax: string;
      sendAmount?: never;
      destMin?: never;
    }
);

export type CommonBuilder = TransactionBuilder | SponsoringBuilder;
