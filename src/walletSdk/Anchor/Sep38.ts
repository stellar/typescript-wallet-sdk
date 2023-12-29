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
} from "../Types";
import { camelToSnakeCaseObject } from "../Utils";

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

  /**
   * Get indicative prices of off-chain assets in exchange for a Stellar asset, or vice versa,
   * from an anchor using Sep-38.
   * @param {object} options - The options for the request
   * @param {Sep38PricesParams} options.params - The parameters for the GET prices request.
   * @param {AuthToken} [options.authToken] - The authentication token. This may be optional
   * if the anchor does not require it.
   * @returns {Promise<Sep38PricesResponse>} - SEP-38 /prices response.
   */
  async prices({
    params,
    authToken,
  }: {
    params: Sep38PricesParams;
    authToken?: AuthToken;
  }): Promise<Sep38PricesResponse> {
    const { anchorQuoteServer } = await this.anchor.sep1();
    let headers;
    if (authToken) {
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken.token}`,
      };
    }

    try {
      const resp = await this.httpClient.get(
        `${anchorQuoteServer}/prices?${queryString.stringify(
          camelToSnakeCaseObject(params),
        )}`,
        {
          headers,
        },
      );
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
   * Get an indicative price for an an asset pair from and anchor using SEP-38.
   * @param {object} options - The options for the request
   * @param {Sep38PriceParams} options.params - The parameters for the GET price request.
   * @param {AuthToken} [options.authToken] - The authentication token. This may be optional
   * if the anchor does not require it.
   * @returns {Promise<Sep38PriceResponse>} - SEP-38 /price response.
   */
  async price({
    params,
    authToken,
  }: {
    params: Sep38PriceParams;
    authToken?: AuthToken;
  }): Promise<Sep38PriceResponse> {
    const { anchorQuoteServer } = await this.anchor.sep1();
    let headers;
    if (authToken) {
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken.token}`,
      };
    }

    try {
      const resp = await this.httpClient.get(
        `${anchorQuoteServer}/price?${queryString.stringify(
          camelToSnakeCaseObject(params),
        )}`,
        {
          headers,
        },
      );
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  // ALEC TODO - name?

  /**
   * Request a firm quote from the anchor.
   * @param {object} options - The options for the request
   * @param {Sep38PostQuoteParams} options.params - The parameters for the quote request.
   * @param {AuthToken} options.authToken - The authentication token.
   * @returns {Promise<Sep38PostQuoteResponse>} - SEP-38 quote response.
   */
  async requestQuote({
    params,
    authToken,
  }: {
    params: Sep38PostQuoteParams;
    authToken: AuthToken;
  }): Promise<Sep38PostQuoteResponse> {
    const { anchorQuoteServer } = await this.anchor.sep1();

    try {
      const resp = await this.httpClient.post(
        `${anchorQuoteServer}/quote`,
        params,
        {
          headers: {
            // ALEC TODO - better way of handling these repeated fields?
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken.token}`,
          },
        },
      );
      return resp.data;
    } catch (e) {
      console.log(e.response.status); // ALEC TODO - remove
      console.log(e.response); // ALEC TODO - remove
      throw new ServerRequestFailedError(e);
    }
  }

  /**
   * Get a previously-provided quote from the anchor.
   * @param {object} options - The options for the request
   * @param {string} options.quoteId - The id of the quote to fetch.
   * @param {AuthToken} options.authToken - The authentication token.
   * @returns {Promise<Sep38PostQuoteResponse>} - SEP-38 quote response.
   */
  async getQuote({
    quoteId,
    authToken,
  }: {
    quoteId: string;
    authToken: AuthToken;
  }): Promise<Sep38PostQuoteResponse> {
    const { anchorQuoteServer } = await this.anchor.sep1();

    try {
      const resp = await this.httpClient.get(
        `${anchorQuoteServer}/quote/${quoteId}`,
        {
          headers: {
            // ALEC TODO - better way of handling these repeated fields?
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken.token}`,
          },
        },
      );
      return resp.data;
    } catch (e) {
      console.log(e.response.status); // ALEC TODO - remove
      console.log(e.response); // ALEC TODO - remove
      throw new ServerRequestFailedError(e);
    }
  }
}
