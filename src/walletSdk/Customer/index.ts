import { AxiosInstance } from "axios";
import { Sep9InfoRequiredError, CustomerNotFoundError } from "../Exceptions";
import {
  CustomerInfoMap,
  GetCustomerResponse,
  AddCustomerResponse,
} from "../Types";

/**
 * KYC management with Sep-12.
 * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md}
 * Do not create this object directly, use the Anchor class.
 * @class
 */
export class Sep12 {
  private authToken;
  private baseUrl;
  private httpClient;
  private headers;

  /**
   * Creates a new instance of the Sep12 class.
   * @constructor
   * @param {string} authToken - The authentication token for authenticating with the server.
   * @param {string} baseUrl - The KYC url.
   * @param {AxiosInstance} httpClient - An Axios instance for making HTTP requests.
   */
  constructor(authToken: string, baseUrl: string, httpClient: AxiosInstance) {
    this.authToken = authToken;
    this.baseUrl = baseUrl;
    this.httpClient = httpClient;
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.authToken}`,
    };
  }

  /**
   * Retrieves customer information by ID and type.
   * @param {string} id - The customer ID to retrieve.
   * @param {string} type - The customer type.
   * @returns {Promise<GetCustomerResponse>} The customer information.
   * @throws {CustomerNotFoundError} If the customer with the specified ID is not found.
   */
  async getByIdAndType(id: string, type: string): Promise<GetCustomerResponse> {
    const resp = await this.httpClient.get(
      `${this.baseUrl}/customer?id=${id}&type=${type}`,
      {
        headers: this.headers,
      },
    );

    if (!resp.data.id) {
      throw new CustomerNotFoundError(id);
    }
    return resp;
  }

  /**
   * Adds a new customer.
   * @param {CustomerInfoMap} sep9Info - Customer information to add, described in sep-9.
   * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0009.md}
   * @param {string} [type] - The type of the customer. See the Type Specification on SEP-12 definition.
   * @returns {Promise<AddCustomerResponse>} Returned data on the added customer.
   */
  async add(
    sep9Info: CustomerInfoMap,
    type?: string,
  ): Promise<AddCustomerResponse> {
    let customerMap: CustomerInfoMap = {};
    if (type) {
      customerMap["type"] = type;
    }
    if (Object.keys(sep9Info).length) {
      customerMap = { ...customerMap, ...sep9Info };
    }

    const resp = await this.httpClient.put(
      `${this.baseUrl}/customer`,
      customerMap,
      {
        headers: this.headers,
      },
    );
    return resp;
  }

  /**
   * Update existing customer information.
   * @param {CustomerInfoMap} sep9Info - Customer information to update, described in sep-9.
   * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0009.md}
   * @param {string} id - The ID of the customer to update.
   * @param {string} [type] - The type of the customer. See the Type Specification on SEP-12 definition.
   * @returns {Promise<AddCustomerResponse>} Returned data on the updated customer.
   * @throws {Sep9InfoRequiredError} If no customer information is provided for the update.
   */
  async update(
    sep9Info: CustomerInfoMap,
    id: string,
    type?: string,
  ): Promise<AddCustomerResponse> {
    let customerMap: CustomerInfoMap = {};
    customerMap["id"] = id;
    if (type) {
      customerMap["type"] = type;
    }
    if (!Object.keys(sep9Info).length) {
      throw new Sep9InfoRequiredError();
    }
    customerMap = { ...customerMap, ...sep9Info };

    const resp = await this.httpClient.put(
      `${this.baseUrl}/customer`,
      customerMap,
      {
        headers: this.headers,
      },
    );
    return resp;
  }

  /**
   * Deletes a customer.
   * @param {string} accountAddress - The account address of the customer to delete.
   * @param {string} [memo] - An optional memo for customer identification.
   */
  async delete(accountAddress: string, memo?: string) {
    await this.httpClient.delete(`${this.baseUrl}/customer/${accountAddress}`, {
      data: { memo },
      headers: this.headers,
    });
  }
}
