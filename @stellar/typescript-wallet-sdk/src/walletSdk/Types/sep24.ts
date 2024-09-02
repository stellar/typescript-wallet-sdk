import { Memo } from "@stellar/stellar-sdk";

import { AuthToken } from "./auth";

export interface Sep24Info {
  deposit: Sep24AssetInfoMap;
  withdraw: Sep24AssetInfoMap;
  fee: { enabled: boolean };
  features: { account_creation: boolean; claimable_balances: boolean };
}

export interface Sep24AssetInfoMap {
  [asset_code: string]: Sep24AssetInfo;
}

export interface Sep24AssetInfo {
  enabled: boolean;
  min_amount: number;
  max_amount: number;
  fee_fixed: number;
  fee_percent: number;
}

export enum FLOW_TYPE {
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
}

// Extra fields should be sent as snake_case keys
// since the SEP api spec uses that format for all params
export type ExtraFields = {
  [api_key: string]: string;
};

export type Sep24PostParams = {
  authToken: AuthToken;
  assetCode: string;
  lang?: string;
  extraFields?: ExtraFields;
  destinationMemo?: Memo;
  destinationAccount?: string;
  withdrawalAccount?: string;
  account?: string;
};

export enum Sep24ResponseType {
  authentication_required = "authentication_required",
  interactive_customer_info_needed = "interactive_customer_info_needed",
  error = "error",
}

export interface Sep24PostResponse {
  type:
    | Sep24ResponseType.authentication_required
    | Sep24ResponseType.interactive_customer_info_needed
    | Sep24ResponseType.error;
  id?: string;
  url?: string;
  error?: string;
}
