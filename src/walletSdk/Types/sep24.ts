import { Memo } from "stellar-sdk";

import { AuthToken } from "./auth";

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
