// ALEC TODO - remove axios
import axios, { AxiosInstance } from "axios";

// ALEC TODO - move, rename?
type Sep9Info = {
  [key: string]: string;
};

export class Sep12 {
  private token;
  private baseUrl;
  // ALEC TODO - cant we grab this from the config or something? If not, use AxiosInstance
  private httpClient;

  constructor(token: string, baseUrl: string, httpClient: AxiosInstance) {
    this.token = token;
    this.baseUrl = baseUrl;
    this.httpClient = httpClient;
  }

  // ALEC TODO - add these:
  // GetCustomerResponse

  async getByIdAndType(id: string, type: string): Promise<any> {
    // ALEC TODO - should use some sort of URL builder?
    const url = `${this.baseUrl}/customer?id=${id}&type=${type}`;

    const resp = await this.httpClient.get(url, {
      // ALEC TODO - we should probably standardize this
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!resp.data.id) {
      // ALEC TODO - error that user not found?
      throw new Error("ALEC TODO");
    }
    return resp;
  }

  // ALEC TODO - AddCustomerResponse
  // ALEC TODO - make custom type for sep9info
  async add(sep9Info: Sep9Info, type?: string): Promise<any> {
    // ALEC TODO - type
    let customerMap: { [key: string]: string } = {};
    if (type) {
      customerMap["type"] = type;
    }

    if (Object.keys(sep9Info).length) {
      customerMap = { ...customerMap, ...sep9Info };
    }

    console.log({ customerMap }); // ALEC TODO - remove

    // ALEC TODO - url builder?
    const url = `${this.baseUrl}/customer`;

    const axiosInstance = axios.create();

    // ALEC TODO - remove
    axiosInstance.interceptors.response.use(
      function (response) {
        // Any status code that lie within the range of 2xx cause this function to trigger
        // Do something with response data
        return response;
      },
      function (error) {
        console.log(error.response?.data); // ALEC TODO - remove
        // Any status codes that falls outside the range of 2xx cause this function to trigger
        // Do something with response error
        return Promise.reject(error.response);
      },
    );

    // alec todo - use this.httpclient
    const resp = await axiosInstance.put(
      url,
      customerMap,
      // ALEC TODO - we should probably standardize this
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
      },
    );
    return resp;
  }

  async update(
    // ALEC TODO - type
    sep9Info: { [key: string]: string },
    id: string,
    type?: string,
    // ALEC TODO - any
  ): Promise<any> {
    // ALEC TODO - type
    let customerMap: { [key: string]: string } = {};

    customerMap["id"] = id;
    if (type) {
      customerMap["type"] = type;
    }

    if (!Object.keys(sep9Info).length) {
      // ALEC TODO -
      throw new Error("Sep 9 Info requried");
    }

    customerMap = { ...customerMap, ...sep9Info };

    // ALEC TODO - url builder?
    const url = `${this.baseUrl}/customer`;

    try {
      const resp = await this.httpClient.put(
        url,
        customerMap,
        // ALEC TODO - we should probably standardize this
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
        },
      );
      return resp;
    } catch (e) {
      // ALEC TODO - handle
      console.log({ e }); // ALEC TODO - remove
      throw e;
    }
  }

  async delete(accountAddress?: string, memo?: string) {
    // ALEC TODO - kotlin sdk uses authToken type tied to account? do here too?
    const customerAccount = accountAddress;
    const url = `${this.baseUrl}/customer/${customerAccount}`;

    await this.httpClient.delete(url, {
      // ALEC TODO - does the anchor handle putting the data here?
      data: { memo },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
    });
  }
}
