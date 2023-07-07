import { AxiosInstance } from "axios";

import { Anchor } from "../Anchor";
import { 
  AssetNotSupportedError, 
  ServerRequestFailedError 
} from "../Exceptions";
import { 
  FLOW_TYPE, 
  InteractivePostParams, 
  InteractivePostResponse 
} from "../Types";

// Let's prevent exporting this constructor type as
// we should not create this Interactive class directly.
type InteractiveParams = {
  anchor: Anchor;
  httpClient: AxiosInstance;
};

// Do not create this object directly, use the Wallet class.
export class Interactive {
  private anchor: Anchor;
  private httpClient: AxiosInstance;

  constructor(params: InteractiveParams) {
    const {
      anchor,
      httpClient,
    } = params;

    this.anchor = anchor;
    this.httpClient = httpClient;
  }

  async deposit({
    accountAddress,
    assetCode,
    authToken,
    lang,
    extraFields,
    fundsAccountAddress,
  }: InteractivePostParams): Promise<InteractivePostResponse> {
    return this.flow({
      accountAddress,
      assetCode,
      authToken,
      lang,
      extraFields,
      fundsAccountAddress,
      type: FLOW_TYPE.DEPOSIT,
    });
  }

  async withdraw({
    accountAddress,
    assetCode,
    authToken,
    lang,
    extraFields,
    fundsAccountAddress,
  }: InteractivePostParams): Promise<InteractivePostResponse> {
    return this.flow({
      accountAddress,
      assetCode,
      authToken,
      lang,
      extraFields,
      fundsAccountAddress,
      type: FLOW_TYPE.WITHDRAW,
    });
  }

  private async flow(
    params: InteractivePostParams & { type: FLOW_TYPE }
  ): Promise<InteractivePostResponse> {
    const {
      accountAddress,
      assetCode,
      authToken,
      lang = this.anchor.language,
      extraFields,
      fundsAccountAddress = accountAddress,
      type,
    } = params;

    const toml = await this.anchor.getInfo();
    const transferServerEndpoint = toml.transferServerSep24;

    const serviceInfo = await this.anchor.getServicesInfo();

    let assets: string[];
    if (type === FLOW_TYPE.DEPOSIT) {
      assets = Object.keys(serviceInfo.deposit);
    } else {
      assets = Object.keys(serviceInfo.withdraw);
    }
    if (!assets.includes(assetCode)) {
      throw new AssetNotSupportedError(type, assetCode);
    }

    try {
      const resp = await this.httpClient.post(
        `${transferServerEndpoint}/transactions/${type}/interactive`,
        {
          asset_code: assetCode,
          lang,
          account: fundsAccountAddress,
          ...extraFields,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const interactiveResponse: InteractivePostResponse = resp.data;

      return interactiveResponse;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}
