import { Asset as StellarAsset } from "stellar-sdk";

const STELLAR_SCHEME = "stellar";

const FIAT_SCHEME = "iso4217";

class AssetId {
  id: string;
  scheme: string;
  get sep38() {
    return `${this.scheme}:${this.id}`;
  }
}

export class StellarAssetId extends AssetId {
  id: string;
  code: string;
  issuer: string;
  scheme = STELLAR_SCHEME;

  toAsset(): StellarAsset {
    if (this.id === "native") {
      return new StellarAsset("XLM");
    }
    return new StellarAsset(this.code, this.issuer);
  }
}

export class IssuedAssetId extends StellarAssetId {
  constructor(code: string, issuer: string) {
    super();
    this.code = code;
    this.issuer = issuer;
    this.id = `${this.code}:${this.issuer}`;
  }

  toString() {
    return this.sep38;
  }
}

export type XLM = NativeAssetId;

export class NativeAssetId extends StellarAssetId {
  id = "native";
  code = "XLM";
}

export class FiatAssetId extends AssetId {
  id: string;
  scheme = FIAT_SCHEME;
  constructor(code: string) {
    super();
    this.id = code;
  }

  toString() {
    return this.sep38;
  }
}
