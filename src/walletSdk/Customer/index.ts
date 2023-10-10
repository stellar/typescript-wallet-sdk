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
