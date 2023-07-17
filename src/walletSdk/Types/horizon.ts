import { Memo, Server } from "stellar-sdk";
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
