import { AxiosInstance } from "axios";
import { Anchor } from "../Anchor";
import { AuthToken } from "./auth";

export interface Sep38Info {
  assets: Array<Sep38AssetInfo>;
}

export interface Sep38AssetInfo {
  asset: string;
  sell_delivery_methods?: Array<Sep38DeliveryMethod>;
  buy_delivery_methods?: Array<Sep38DeliveryMethod>;
  country_codes?: Array<string>;
}

export interface Sep38DeliveryMethod {
  name: string;
  description: string;
}

export type Sep38Params = {
  anchor: Anchor;
  httpClient: AxiosInstance;
  authToken?: AuthToken;
};

export interface Sep38PricesParams {
  sellAsset: string;
  sellAmount: string;
  sellDeliveryMethod?: string;
  buyDeliveryMethod?: string;
  countryCode?: string;
}

export interface Sep38PricesResponse {
  buy_assets: Array<Sep38BuyAsset>;
}

export interface Sep38BuyAsset {
  asset: string;
  price: string;
  decimals: number;
}

export interface Sep38PriceParams {
  sellAsset: string;
  buyAsset: string;
  sellAmount?: string;
  buyAmount?: string;
  context: Sep38PriceContext;
  sellDeliveryMethod?: string;
  buyDeliveryMethod?: string;
  countryCode?: string;
}

export enum Sep38PriceContext {
  SEP6 = "sep6",
  SEP31 = "sep31",
}

export interface Sep38PriceResponse {
  total_price: string;
  price: string;
  sell_amount: string;
  buy_amount: string;
  fee: {
    total: string;
    asset: string;
    details?: Array<Sep38FeeDetails>;
  };
}

export interface Sep38FeeDetails {
  name: string;
  description?: string;
  amount: string;
}
