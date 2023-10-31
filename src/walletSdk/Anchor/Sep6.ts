import { AxiosInstance } from "axios";

import { Anchor } from "../Anchor";
import { ServerRequestFailedError } from "../Exceptions";
import { Sep6Info } from "../Types";

type Sep6Params = {
  anchor: Anchor;
  httpClient: AxiosInstance;
};

/**
 * Flow for creating deposits and withdrawals with an anchor using SEP-6.
 * For an interactive flow use Sep24 instead.
 * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0006.md}
 * Do not create this object directly, use the Anchor class.
 * @class
 */
export class Sep6 {
  private anchor: Anchor;
  private httpClient: AxiosInstance;

  constructor(params: Sep6Params) {
    const { anchor, httpClient } = params;

    this.anchor = anchor;
    this.httpClient = httpClient;
  }

  async info(): Promise<Sep6Info> {
    const { transferServer } = await this.anchor.sep1();
    try {
      const resp = await this.httpClient.get(`${transferServer}/info`);
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}
