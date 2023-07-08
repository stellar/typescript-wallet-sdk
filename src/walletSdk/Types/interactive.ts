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

export type InteractivePostParams = {
  authToken: AuthToken;
  accountAddress: string;
  assetCode: string;
  lang?: string;
  extraFields?: ExtraFields;
  fundsAccountAddress?: string;
};

export enum InteractiveResponseType {
  authentication_required = "authentication_required",
  interactive_customer_info_needed = "interactive_customer_info_needed",
  error = "error"
}

export interface InteractivePostResponse {
  type: InteractiveResponseType.authentication_required 
    | InteractiveResponseType.interactive_customer_info_needed 
    | InteractiveResponseType.error;
  id?: string;
  url?: string;
  error?: string;
}