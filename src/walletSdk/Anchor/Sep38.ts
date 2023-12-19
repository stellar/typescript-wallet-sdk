// ALEC TODO - change file name?
import { AxiosInstance } from "axios";

import { Anchor } from "../Anchor";
import { ServerRequestFailedError } from "../Exceptions";
import { AuthToken } from "../Types";

// ALEC TODO - move
interface Sep38DeliveryMethod {
  name: string;
  description: string;
}
interface Sep38Info {
  assets: Array<Sep38AssetInfo>;
}
interface Sep38AssetInfo {
  asset: string;
  sell_delivery_methods?: Array<Sep38DeliveryMethod>;
  buy_delivery_methods?: Array<Sep38DeliveryMethod>;
  country_codes?: Array<string>;
}
export type Sep38Params = {
  anchor: Anchor;
  httpClient: AxiosInstance;
};

export class Sep38 {
  private anchor: Anchor;
  private httpClient: AxiosInstance;
  private sep38Info: Sep38Info;

  /**
   * Creates a new instance of the Sep38 class.
   * @constructor
   * @param {Sep38Params} params - Parameters to initialize the Sep38 instance.
   */
  constructor(params: Sep38Params) {
    const { anchor, httpClient } = params;

    this.anchor = anchor;
    this.httpClient = httpClient;
  }

  /**
   * Get SEP-38 anchor information.
   * If `shouldRefresh` is set to `true`, it fetches fresh values; otherwise, it returns cached values if available.
   * @param {boolean} [shouldRefresh=false] - Flag to force a refresh of TOML values.
   * @param {boolean} [authToken] - Optional Auth Token for a personal response (if supported by anchor).
   * @returns {Promise<Sep38Info>} - SEP-38 information about the anchor.
   */
  async info(
    shouldRefresh?: boolean,
    authToken?: AuthToken,
  ): Promise<Sep38Info> {
    if (this.sep38Info && !shouldRefresh) {
      return this.sep38Info;
    }

    const { anchorQuoteServer } = await this.anchor.sep1();
    let headers;
    if (authToken) {
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken.token}`,
      };
    }
    try {
      const resp = await this.httpClient.get(`${anchorQuoteServer}/info`, {
        headers,
      });
      this.sep38Info = resp.data;
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}
