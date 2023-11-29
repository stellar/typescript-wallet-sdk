import { AxiosInstance } from "axios";
import queryString from "query-string";

import {
  ServerRequestFailedError,
  InvalidTransactionsResponseError,
  InvalidTransactionResponseError,
} from "../Exceptions";

export const _getTransactionsForAsset = async <T>(
  authToken: string,
  params: { [key: string]: string | number },
  endpoint: string,
  client: AxiosInstance,
): Promise<T[]> => {
  try {
    const resp = await client.get(
      `${endpoint}/transactions?${queryString.stringify(params)}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    const transactions: T[] = resp.data.transactions;

    if (!transactions || !Array.isArray(transactions)) {
      throw new InvalidTransactionsResponseError(transactions);
    }

    return transactions;
  } catch (e) {
    throw new ServerRequestFailedError(e);
  }
};

export const _getTransactionBy = async <T>(
  authToken: string,
  params: { [key: string]: string | number },
  endpoint: string,
  client: AxiosInstance,
): Promise<T> => {
  try {
    const resp = await client.get(
      `${endpoint}/transaction?${queryString.stringify(params)}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    const transaction: T = resp.data.transaction;

    if (!transaction || Object.keys(transaction).length === 0) {
      throw new InvalidTransactionResponseError(transaction);
    }

    return transaction;
  } catch (e) {
    throw new ServerRequestFailedError(e);
  }
};
