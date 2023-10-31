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
  private anchorInfo: Sep6Info;

  /**
   * Creates a new instance of the Sep6 class.
   * @constructor
   * @param {Sep6Params} params - Parameters to initialize the Sep6 instance.
   */
  constructor(params: Sep6Params) {
    const { anchor, httpClient } = params;

    this.anchor = anchor;
    this.httpClient = httpClient;
  }

  /**
   * Get SEP-6 anchor information.
   * If `shouldRefresh` is set to `true`, it fetches fresh values; otherwise, it returns cached values if available.
   * @param {boolean} [shouldRefresh=false] - Flag to force a refresh of TOML values.
   * @returns {Promise<Sep6Info>} - SEP-6 information about the anchor.
   */
  async info(shouldRefresh?: boolean): Promise<Sep6Info> {
    if (this.anchorInfo && !shouldRefresh) {
      return this.anchorInfo;
    }

    const { transferServer } = await this.anchor.sep1();
    try {
      const resp = await this.httpClient.get(`${transferServer}/info`);
      this.anchorInfo = resp.data;
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}
