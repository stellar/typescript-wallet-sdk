import { Anchor } from "../Anchor";
import { AssetNotSupportedError, ServerRequestFailedError } from "../Exception";

// Extra fields should be sent as snake_case keys
// since the SEP api spec uses that format for all params
type ExtraFields = {
  [api_key: string]: string;
};

type InteractiveParams = {
  accountAddress: string;
  assetCode: string;
  authToken: string;
  lang?: string;
  extraFields?: ExtraFields;
  fundsAccountAddress?: string;
};

export enum FLOW_TYPE {
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
}

// Do not create this object directly, use the Wallet class.
export class Interactive {
  private homeDomain: string;
  private anchor: Anchor;
  private httpClient;

  constructor(homeDomain, anchor, httpClient) {
    this.homeDomain = homeDomain;
    this.anchor = anchor;
    this.httpClient = httpClient;
  }

  async deposit(params: InteractiveParams) {
    return await this.flow({ ...params, type: FLOW_TYPE.DEPOSIT });
  }

  async withdraw(params: InteractiveParams) {
    return await this.flow({ ...params, type: FLOW_TYPE.WITHDRAW });
  }

  async flow(params: InteractiveParams & { type: FLOW_TYPE }) {
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

    let assets;
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

      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}
