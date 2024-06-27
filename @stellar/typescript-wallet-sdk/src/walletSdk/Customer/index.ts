import { AxiosInstance } from "axios";
import queryString from "query-string";
import { Sep9InfoRequiredError, CustomerNotFoundError } from "../Exceptions";
import {
  CustomerInfoMap,
  GetCustomerParams,
  GetCustomerResponse,
  AddCustomerResponse,
  AddCustomerParams,
  AuthToken,
} from "../Types";

/**
 * KYC management with Sep-12.
 * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md}
 * Do not create this object directly, use the Anchor class.
 * @class
 */
export class Sep12 {
  private authToken: AuthToken;
  private baseUrl: string;
  private httpClient: AxiosInstance;
  private headers: { [key: string]: string };

  /**
   * Creates a new instance of the Sep12 class.
   * @constructor
   * @param {AuthToken} authToken - The authentication token for authenticating with the server.
   * @param {string} baseUrl - The KYC url.
   * @param {AxiosInstance} httpClient - An Axios instance for making HTTP requests.
   */
  constructor(
    authToken: AuthToken,
    baseUrl: string,
    httpClient: AxiosInstance,
  ) {
    this.authToken = authToken;
    this.baseUrl = baseUrl;
    this.httpClient = httpClient;
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.authToken.token}`,
    };
  }

  /**
   * Retrieve customer information. All arguments are optional, but at least one
   * must be given. For more information:
   * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md#request}
   * @param {object} params - The parameters for retrieving customer information.
   * @param {string} [params.id] - The id of the customer .
   * @param {string} [params.type] - The type of action the customer is being KYCd for.
   * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md#type-specification}
   * @param {string} [params.memo] - A memo associated with the customer.
   * @param {string} [params.lang] - The desired language. Defaults to "en".
   * @returns {Promise<GetCustomerResponse>} The customer information.
   * @throws {CustomerNotFoundError} If the customer is not found.
   */
  async getCustomer(params: GetCustomerParams): Promise<GetCustomerResponse> {
    const qs = queryString.stringify(params);
    const resp = await this.httpClient.get(`${this.baseUrl}/customer?${qs}`, {
      headers: this.headers,
    });
    if (!resp.data.id) {
      throw new CustomerNotFoundError(params);
    }
    return resp.data;
  }

  /**
   * Add a new customer. Customer info is given in sep9Info param. If it
   * is binary type (eg. Buffer of an image) include it in sep9BinaryInfo.
   * @param {AddCustomerParams} params - The parameters for adding a customer.
   * @param {CustomerInfoMap} [params.sep9Info] - Customer information. What fields you should
   * give is indicated by the anchor.
   * @param {CustomerInfoMap} [params.sep9BinaryInfo] - Customer information that is in binary
   * format (eg. Buffer of an image).
   * @param {string} [params.type] - The type of the customer.
   * @param {string} [params.memo] - A memo associated with the customer.
   * @returns {Promise<AddCustomerResponse>} Add customer response.
   */
  async add({
    sep9Info,
    sep9BinaryInfo,
    type,
    memo,
  }: AddCustomerParams): Promise<AddCustomerResponse> {
    let customerMap: CustomerInfoMap = { ...sep9Info, ...sep9BinaryInfo };
    if (type) {
      customerMap = { type, ...customerMap };
    }
    if (memo) {
      customerMap["memo"] = memo;
    }

    // Check if binary data given so can adjust headers
    const includesBinary = sep9BinaryInfo && Object.keys(sep9BinaryInfo).length;
    const resp = await this.httpClient.put(
      `${this.baseUrl}/customer`,
      customerMap,
      {
        headers: includesBinary
          ? { ...this.headers, "Content-Type": "multipart/form-data" }
          : this.headers,
      },
    );
    return resp.data;
  }

  /**
   * Updates an existing customer. Customer info is given in sep9Info param. If it
   * is binary type (eg. Buffer of an image) include it in sep9BinaryInfo.
   * @param {AddCustomerParams} params - The parameters for adding a customer.
   * @param {CustomerInfoMap} [params.sep9Info] - Customer information. What fields you should
   * give is indicated by the anchor.
   * @param {CustomerInfoMap} [params.sep9BinaryInfo] - Customer information that is in binary
   * format (eg. Buffer of an image).
   * @param {string} [params.id] - The id of the customer.
   * @param {string} [params.type] - The type of the customer.
   * @param {string} [params.memo] - A memo associated with the customer.
   * @returns {Promise<AddCustomerResponse>} Add customer response.
   * @throws {Sep9InfoRequiredError} If no SEP-9 info is given.
   */
  async update({
    sep9Info,
    sep9BinaryInfo,
    id,
    type,
    memo,
  }: AddCustomerParams): Promise<AddCustomerResponse> {
    let customerMap: CustomerInfoMap = {};
    if (id) {
      customerMap["id"] = id;
    }
    if (type) {
      customerMap["type"] = type;
    }
    if (memo) {
      customerMap["memo"] = memo;
    }
    if (!Object.keys({ ...sep9Info, ...sep9BinaryInfo }).length) {
      throw new Sep9InfoRequiredError();
    }
    customerMap = { ...customerMap, ...sep9Info, ...sep9BinaryInfo };

    // Check if binary data given so can adjust headers
    const includesBinary = sep9BinaryInfo && Object.keys(sep9BinaryInfo).length;
    const resp = await this.httpClient.put(
      `${this.baseUrl}/customer`,
      customerMap,
      {
        headers: includesBinary
          ? { ...this.headers, "Content-Type": "multipart/form-data" }
          : this.headers,
      },
    );
    return resp.data;
  }

  /**
   * Deletes a customer.
   * @param {string} accountAddress - The account address of the customer to delete.
   * @param {string} [memo] - An optional memo for customer identification.
   */
  async delete(accountAddress?: string, memo?: string) {
    await this.httpClient.delete(
      `${this.baseUrl}/customer/${accountAddress || this.authToken.account}`,
      {
        data: { memo },
        headers: this.headers,
      },
    );
  }
}
