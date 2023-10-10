import { AxiosInstance } from "axios";
import {
  Sep9InfoRequiredError,
  CustomerNotFoundError,
  NoGetCustomerParamError,
} from "../Exceptions";
import {
  CustomerInfoMap,
  Sep12Status,
  Sep12Type,
  Field,
  ProvidedField,
  GetCustomerParams,
  GetCustomerResponse,
  AddCustomerResponse,
} from "../Types";

// Used for identifying binary fields.
// https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0009.md
const Sep9BinaryFields = [
  "photo_id_front",
  "photo_id_back",
  "notary_approval_of_photo_id",
  "photo_proof_residence",
  "proof_of_income",
  "proof_of_liveness",
  "organization.photo_incorporation_doc",
  "organization.photo_proof_address",
];

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
   * @throws {NoGetCustomerParamError} If none of the parameters are provided.
   * @throws {CustomerNotFoundError} If the customer is not found.
   */
  async getCustomer({
    id,
    type,
    memo,
    lang,
  }: GetCustomerParams): Promise<GetCustomerResponse> {
    if (!id && !type && !memo) {
      throw new NoGetCustomerParamError();
    }
    const queryParams: string[] = [];
    if (type) {
      queryParams.push(`type=${type}`);
    }
    if (id) {
      queryParams.push(`id=${id}`);
    }
    if (memo) {
      queryParams.push(`memo=${memo}`);
    }
    if (lang) {
      queryParams.push(`lang=${lang}`);
    }
    const queryString = queryParams.join("&");

    const resp = await this.httpClient.get(
      `${this.baseUrl}/customer?${queryString}`,
      {
        headers: this.headers,
      },
    );
    if (!resp.data.id) {
      throw new CustomerNotFoundError(id);
    }
    return resp;
  }

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

    // Check if binary data given so can adjust headers
    let includesBinary = false;
    for (const key of Object.keys(customerMap)) {
      if (Sep9BinaryFields.includes(key)) {
        includesBinary = true;
      }
    }

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

    // Check if binary data given so can adjust headers
    let includesBinary = false;
    for (const key of Object.keys(customerMap)) {
      if (Sep9BinaryFields.includes(key)) {
        includesBinary = true;
      }
    }

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
