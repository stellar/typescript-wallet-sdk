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
