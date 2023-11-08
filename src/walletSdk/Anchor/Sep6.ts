import { AxiosInstance } from "axios";
import queryString from "query-string";

import { Anchor } from "../Anchor";
import { ServerRequestFailedError } from "../Exceptions";
import {
  Sep6Info,
  Sep6Params,
  Sep6DepositParams,
  Sep6WithdrawParams,
  Sep6DepositResponse,
  Sep6WithdrawResponse,
} from "../Types";

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

  /**
   * Deposits funds using the SEP-6 protocol. Next steps by
   * the anchor are given in the response.
   *
   * @param {object} options - The options for the deposit.
   * @param {string} options.authToken - The authentication token.
   * @param {Sep6DepositParams} options.params - The parameters for the deposit request.
   *
   * @returns {Promise<Sep6DepositResponse>} Sep6 deposit response, containing next steps if needed
   * to complete the deposit.
   *
   * @throws {Error} If an unexpected error occurs during the deposit operation.
   */
  async deposit({
    authToken,
    params,
  }: {
    authToken: string;
    params: Sep6DepositParams;
  }): Promise<Sep6DepositResponse> {
    return this.flow({ type: "deposit", authToken, params });
  }

  /**
   * Initiates a withdrawal using SEP-6.
   *
   * @param {object} options - The options for the withdrawal operation.
   * @param {string} options.authToken - The authentication token.
   * @param {Sep6WithdrawParams} options.params - The parameters for the withdrawal request.
   *
   * @returns {Promise<Sep6WithdrawResponse>} Sep6 withdraw response.
   */
  async withdraw({
    authToken,
    params,
  }: {
    authToken: string;
    params: Sep6WithdrawParams;
  }): Promise<Sep6WithdrawResponse> {
    return this.flow({ type: "withdraw", authToken, params });
  }

  private async flow({
    type,
    authToken,
    params,
  }: {
    type: "deposit" | "withdraw";
    authToken: string;
    params: Sep6DepositParams | Sep6WithdrawParams;
  }) {
    const { transferServer } = await this.anchor.sep1();

    try {
      const resp = await this.httpClient.get(
        `${transferServer}/${type}?${queryString.stringify(params)}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        },
      );
      return resp.data;
    } catch (e) {
      if (e.response?.data?.type === "non_interactive_customer_info_needed") {
        return e.response?.data;
      } else if (e.response?.data?.type === "customer_info_status") {
        return e.response?.data;
      }
      throw e;
    }
  }
}
