export const WEB_STELLAR_SCHEME = "web+stellar:";

export enum Sep7OperationType {
  tx = "tx",
  pay = "pay",
}

export const URI_MSG_MAX_LENGTH = 300;

export type Sep7Replacement = {
  id: string;
  path: string;
  hint: string;
};

export type IsValidSep7UriResult = {
  result: boolean;
  reason?: string;
};
