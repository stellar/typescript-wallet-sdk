import { AxiosInstance } from "axios";

import { Anchor } from "../Anchor";
import { ServerRequestFailedError } from "../Exceptions";

type Sep6Params = {
  anchor: Anchor;
  httpClient: AxiosInstance;
};

export class Sep6 {
  private anchor: Anchor;
  private httpClient: AxiosInstance;

  // ALEC TODO - types
  constructor(params: Sep6Params) {
    const { anchor, httpClient } = params;

    this.anchor = anchor;
    this.httpClient = httpClient;
  }

  // ALEC tODO - types
  async info() {
    const { transferServer } = await this.anchor.sep1();

    console.log({ transferServer }); // ALEC TODO - remove

    try {
      const resp = await this.httpClient.get(`${transferServer}/info`);
      console.log(resp.data); // ALEC TODO - remove
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}
