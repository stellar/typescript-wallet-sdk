import { AxiosInstance } from "axios";
import { Anchor } from "../Anchor";

export interface Sep6EndpointInfo {
  enabled: boolean;
  authentication_required?: boolean;
  description?: string;
}

export interface Sep6DepositInfo {
  enabled: boolean;
  authentication_required?: boolean;
  fee_fixed?: number;
  fee_percent?: number;
  min_amount?: number;
  max_amount?: number;
  fields?: {
    [key: string]: {
      description: string;
      optional?: boolean;
      choices?: string[];
    };
  };
}

export interface Sep6WithdrawInfo {
  enabled: boolean;
  authentication_required?: boolean;
  fee_fixed?: number;
  fee_percent?: number;
  min_amount?: number;
  max_amount?: number;
  types?: {
    [key: string]: {
      fields?: {
        [key: string]: {
          description: string;
          optional?: boolean;
          choices?: string[];
        };
      };
    };
  };
}

export interface Sep6Info {
  deposit: { [key: string]: Sep6DepositInfo };
  "deposit-exchange": { [key: string]: Sep6DepositInfo };
  withdraw: { [key: string]: Sep6WithdrawInfo };
  "withdraw-exchange": { [key: string]: Sep6WithdrawInfo };
  fee: {
    enabled: boolean;
    description: string;
  };
  transactions: Sep6EndpointInfo;
  transaction: Sep6EndpointInfo;
  features: {
    account_creation: boolean;
    claimable_balances: boolean;
  };
}

export type Sep6Params = {
  anchor: Anchor;
  httpClient: AxiosInstance;
};

export interface Sep6DepositParams {
  asset_code: string;
  account: string;
  memo_type?: string;
  memo?: string;
  email_address?: string;
  type?: string;
  lang?: string;
  on_change_callback?: string;
  amount?: string;
  country_code?: string;
  claimable_balance_supported?: string;
  customer_id?: string;
}

export interface Sep6WithdrawParams {
  asset_code: string;
  type: string;
  dest?: string;
  dest_extra?: string;
  account?: string;
  memo?: string;
  lang?: string;
  on_change_callback?: string;
  amount?: string;
  country_code?: string;
  refund_memo?: string;
  refund_memo_type?: string;
  customer_id?: string;
}

export interface Sep6DepositResponse {
  how?: string;
  instructions?: {
    [key: string]: {
      value: string;
      description: string;
    };
  };
  id?: string;
  eta?: number;
  min_amoun?: number;
  max_amount?: number;
  fee_fixed?: number;
  fee_percent?: number;
  extra_info?: { message?: string };
}

export interface Sep6WithdrawResponse {
  account_id?: string;
  memo_type?: string;
  memo?: string;
  id?: string;
  eta?: number;
  min_amount?: number;
  max_amount?: number;
  fee_fixed?: number;
  fee_percent?: number;
  extra_info?: { message?: string };
}
