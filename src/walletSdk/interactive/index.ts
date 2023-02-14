import axios from "axios";

import { Anchor } from "../anchor";
import { AssetNotSupportedError, ServerRequestFailedError } from "../exception";

type ExtraFields = {
  [key: string]: string;
};

export class Interactive {
  private homeDomain = "";
  private anchor: Anchor = null;

  constructor(homeDomain, anchor) {
    this.homeDomain = homeDomain;
    this.anchor = anchor;
  }

  async deposit(
    accountAddress: string,
    assetCode: string,
    token: string,
    extraFields?: ExtraFields,
    fundsAccountAddress?: string
  ) {
    return await this.flow(
      accountAddress,
      assetCode,
      token,
      "deposit",
      extraFields,
      fundsAccountAddress
    );
  }

  async withdraw(
    accountAddress: string,
    assetCode: string,
    token: string,
    extraFields?: ExtraFields,
    fundsAccountAddress?: string
  ) {
    return await this.flow(
      accountAddress,
      assetCode,
      token,
      "withdraw",
      extraFields,
      fundsAccountAddress
    );
  }

  async flow(
    accountAddress: string,
    assetCode: string,
    token: string,
    type: string,
    extraFields?: ExtraFields,
    fundsAccountAddress?: string
  ) {
    const toml = await this.anchor.getInfo();
    const transferServerEndpoint = toml.transferServerSep24;

    const serviceInfo = await this.anchor.getServicesInfo();

    let assets;
    if (type === "deposit") {
      assets = Object.keys(serviceInfo.deposit);
    } else {
      assets = Object.keys(serviceInfo.withdraw);
    }
    if (!assets.includes(assetCode)) {
      throw new AssetNotSupportedError(type, assetCode);
    }

    try {
      const resp = await axios.post(
        `${transferServerEndpoint}/transactions/${type}/interactive`,
        {
          asset_code: assetCode,
          account: fundsAccountAddress ? fundsAccountAddress : accountAddress,
          ...extraFields,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}
