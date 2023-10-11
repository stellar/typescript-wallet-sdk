import { AxiosInstance } from "axios";
import queryString from "query-string";
import { Sep9InfoRequiredError, CustomerNotFoundError } from "../Exceptions";
import {
  CustomerInfoMap,
  Sep12Status,
  Sep12Type,
  Field,
  ProvidedField,
  GetCustomerParams,
  GetCustomerResponse,
  AddCustomerResponse,
  AddCustomerParams,
} from "../Types";

export class Sep12 {
  private token;
  private baseUrl;
  private httpClient;
  private headers;

  constructor(token: string, baseUrl: string, httpClient: AxiosInstance) {
    this.token = token;
    this.baseUrl = baseUrl;
    this.httpClient = httpClient;
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
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
   * @return {Promise<GetCustomerResponse>} The customer information.
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
    return resp;
  }

  /**
   * Add a new customer. Customer info is given in sep9Info param. If it
   * is binary type (eg. Buffer of an image) include it in sep9BinaryInfo.
   * @param {AddCustomerParams} params - The parameters for adding a customer.
   * @param {CustomerInfoMap} params.sep9Info - Customer information. What fields you should
   * give is indicated by the anchor.
   * @param {CustomerInfoMap} params.sep9BinaryInfo - Customer information that is in binary
   * format (eg. Buffer of an image).
   * @param {string} [params.type] - The type of the customer.
   * @param {string} [params.memo] - A memo associated with the customer.
   * @return {Promise<AddCustomerResponse>} Add customer response.
   */
  async add({
    sep9Info,
    sep9BinaryInfo,
    type,
    memo,
  }: AddCustomerParams): Promise<AddCustomerResponse> {
    let customerMap: CustomerInfoMap = {};
    if (type) {
      customerMap["type"] = type;
    }
    if (Object.keys({ ...sep9Info, ...sep9BinaryInfo }).length) {
      customerMap = { ...customerMap, ...sep9Info, ...sep9BinaryInfo };
    }

    // Check if binary data given so can adjust headers
    let includesBinary = sep9BinaryInfo && Object.keys(sep9BinaryInfo).length;
    const resp = await this.httpClient.put(
      `${this.baseUrl}/customer`,
      customerMap,
      {
        headers: includesBinary
          ? { ...this.headers, "Content-Type": "multipart/form-data" }
          : this.headers,
      },
    );
    return resp;
  }

  /**
   * Updates an existing customer. Customer info is given in sep9Info param. If it
   * is binary type (eg. Buffer of an image) include it in sep9BinaryInfo.
   * @param {AddCustomerParams} params - The parameters for adding a customer.
   * @param {CustomerInfoMap} params.sep9Info - Customer information. What fields you should
   * give is indicated by the anchor.
   * @param {CustomerInfoMap} params.sep9BinaryInfo - Customer information that is in binary
   * format (eg. Buffer of an image).
   * @param {string} [params.id] - The id of the customer.
   * @param {string} [params.type] - The type of the customer.
   * @param {string} [params.memo] - A memo associated with the customer.
   * @return {Promise<AddCustomerResponse>} Add customer response.
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
    let includesBinary = sep9BinaryInfo && Object.keys(sep9BinaryInfo).length;
    const resp = await this.httpClient.put(
      `${this.baseUrl}/customer`,
      customerMap,
      {
        headers: includesBinary
          ? { ...this.headers, "Content-Type": "multipart/form-data" }
          : this.headers,
      },
    );
    return resp;
  }

  async delete(accountAddress: string, memo?: string) {
    await this.httpClient.delete(`${this.baseUrl}/customer/${accountAddress}`, {
      data: { memo },
      headers: this.headers,
    });
  }
}
