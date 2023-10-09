import { AxiosInstance } from "axios";
import { Sep9InfoRequiredError, CustomerNotFoundError } from "../Exceptions";
import {
  CustomerInfoMap,
  Sep12Status,
  Sep12Type,
  Field,
  ProvidedField,
  GetCustomerResponse,
  AddCustomerResponse,
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

  async delete(accountAddress: string, memo?: string) {
    await this.httpClient.delete(`${this.baseUrl}/customer/${accountAddress}`, {
      data: { memo },
      headers: this.headers,
    });
  }
}
