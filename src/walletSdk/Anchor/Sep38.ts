import { AxiosInstance } from "axios";
import queryString from "query-string";

import { Anchor } from "../Anchor";
import { ServerRequestFailedError } from "../Exceptions";
import {
  AuthToken,
  Sep38Info,
  Sep38Params,
  Sep38PricesParams,
  Sep38PriceParams,
  Sep38PricesResponse,
  Sep38PriceResponse,
  Sep38PostQuoteParams,
  Sep38PostQuoteResponse,
  HttpHeaders,
} from "../Types";
import { camelToSnakeCaseObject } from "../Utils";

/**
 * Quote service using SEP-38. It can be used for getting price quotes from an anchor
 * for exchanging assets.
 * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md}
 * Do not create this object directly, use the Anchor class.
 * @class
 */
export class Sep38 {
  private anchor: Anchor;
  private httpClient: AxiosInstance;
  private authToken: AuthToken;
  private headers: HttpHeaders;
  private sep38Info: Sep38Info;

  /**
   * Creates a new instance of the Sep38 class.
   * @constructor
   * @param {Sep38Params} params - Parameters to initialize the Sep38 instance.
   */
  constructor(params: Sep38Params) {
    const { anchor, httpClient, authToken } = params;

    this.anchor = anchor;
    this.httpClient = httpClient;
    this.authToken = authToken;
    if (authToken) {
      this.headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.authToken.token}`,
      };
    }
  }

  /**
   * Get SEP-38 anchor information.
   * If `shouldRefresh` is set to `true`, it fetches fresh values; otherwise, it returns cached values if available.
   * @param {boolean} [shouldRefresh=false] - Flag to force a refresh of TOML values.
   * @returns {Promise<Sep38Info>} - SEP-38 information about the anchor.
   */
  async info(shouldRefresh?: boolean): Promise<Sep38Info> {
    if (this.sep38Info && !shouldRefresh) {
      return this.sep38Info;
    }

    const { anchorQuoteServer } = await this.anchor.sep1();

    try {
      const resp = await this.httpClient.get(`${anchorQuoteServer}/info`, {
        headers: this.headers,
      });
      this.sep38Info = resp.data;
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
   * Get indicative prices of off-chain assets in exchange for a Stellar asset, or vice versa,
   * from an anchor using Sep-38.
   * @param {Sep38PricesParams} params - The parameters for the GET prices request.
   * if the anchor does not require it.
   * @returns {Promise<Sep38PricesResponse>} - SEP-38 /prices response.
   */
  async prices(params: Sep38PricesParams): Promise<Sep38PricesResponse> {
    const { anchorQuoteServer } = await this.anchor.sep1();

    try {
      const resp = await this.httpClient.get(
        `${anchorQuoteServer}/prices?${queryString.stringify(
          camelToSnakeCaseObject(params),
        )}`,
        {
          headers: this.headers,
        },
      );
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
   * Get an indicative price for an an asset pair from and anchor using SEP-38.
   * @param {Sep38PriceParams} params - The parameters for the GET price request.
   * if the anchor does not require it.
   * @returns {Promise<Sep38PriceResponse>} - SEP-38 /price response.
   */
  async price(params: Sep38PriceParams): Promise<Sep38PriceResponse> {
    const { anchorQuoteServer } = await this.anchor.sep1();

    try {
      const resp = await this.httpClient.get(
        `${anchorQuoteServer}/price?${queryString.stringify(
          camelToSnakeCaseObject(params),
        )}`,
        {
          headers: this.headers,
        },
      );
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
   * Request a firm quote from the anchor.
   * @param {Sep38PostQuoteParams} params - The parameters for the quote request.
   * @returns {Promise<Sep38PostQuoteResponse>} - SEP-38 quote response.
   */
  async requestQuote(
    params: Sep38PostQuoteParams,
  ): Promise<Sep38PostQuoteResponse> {
    const { anchorQuoteServer } = await this.anchor.sep1();

    try {
      const resp = await this.httpClient.post(
        `${anchorQuoteServer}/quote`,
        params,
        {
          headers: this.headers,
        },
      );
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
   * Get a previously-provided quote from the anchor.
   * @param {string} quoteId - The id of the quote to fetch.
   * @returns {Promise<Sep38PostQuoteResponse>} - SEP-38 quote response.
   */
  async getQuote(quoteId: string): Promise<Sep38PostQuoteResponse> {
    const { anchorQuoteServer } = await this.anchor.sep1();

    try {
      const resp = await this.httpClient.get(
        `${anchorQuoteServer}/quote/${quoteId}`,
        {
          headers: this.headers,
        },
      );
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}
