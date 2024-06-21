export enum Sep7OperationType {
  tx = "tx",
  pay = "pay",
}

export const WEB_STELLAR_SCHEME = "web+stellar:";
export const WEB_STELLAR_TX_SCHEME = `${WEB_STELLAR_SCHEME}${Sep7OperationType.tx}`;
export const WEB_STELLAR_PAY_SCHEME = `${WEB_STELLAR_SCHEME}${Sep7OperationType.pay}`;

export const URI_MSG_MAX_LENGTH = 300;

export type Sep7Replacement = {
  id: string;
  path: string;
  hint: string;
};
