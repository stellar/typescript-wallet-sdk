import { Memo, Server, xdr } from "stellar-sdk";
import { AccountKeypair, SigningKeypair } from "../Horizon/Account";

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

export type SubmitWithFeeIncreaseParams = {
  sourceAddress: SigningKeypair;
  timeout: number;
  baseFeeIncrease: number;
  operations: Array<xdr.Operation>;
  signingAddresses?: Array<SigningKeypair>;
  baseFee?: number;
  memo?: Memo;
  maxFee?: number;
};
