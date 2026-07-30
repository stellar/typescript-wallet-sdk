import { StellarToml } from "@stellar/stellar-sdk";

import { parseToml } from "../src/walletSdk/Utils/toml";

// Hermetic replacement for the live-network TOML coverage. parseToml maps an
// already-parsed StellarToml.Api object (the shape stellar-sdk v16's smol-toml
// parser produces) to our TomlInfo. This pins that mapping so any shape drift
// is caught in CI rather than against a live anchor.
describe("parseToml", () => {
  it("maps a fully populated stellar.toml object to TomlInfo", () => {
    const toml = {
      VERSION: "2.0.0",
      NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
      SIGNING_KEY: "GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB",
      WEB_AUTH_ENDPOINT: "https://auth.example.com/auth",
      TRANSFER_SERVER: "https://anchor.example.com/sep6",
      TRANSFER_SERVER_SEP0024: "https://anchor.example.com/sep24",
      KYC_SERVER: "https://anchor.example.com/kyc",
      HORIZON_URL: "https://horizon.example.com",
      ACCOUNTS: ["GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB"],
      DOCUMENTATION: {
        ORG_NAME: "Example Anchor",
        ORG_URL: "https://example.com",
      },
      CURRENCIES: [
        {
          code: "USDC",
          issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          display_decimals: 2,
          is_asset_anchored: true,
          anchor_asset_type: "fiat",
          collateral_addresses: ["GADDR1"],
        },
      ],
      PRINCIPALS: [
        {
          name: "Jane Doe",
          email: "jane@example.com",
          id_photo_hash: "abc123",
        },
      ],
      VALIDATORS: [
        {
          PUBLIC_KEY: "GDVALIDATORXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          HOST: "core.example.com:11625",
        },
      ],
    } as unknown as StellarToml.Api.StellarToml;

    const info = parseToml(toml);

    expect(info.version).toBe("2.0.0");
    expect(info.networkPassphrase).toBe("Test SDF Network ; September 2015");
    expect(info.webAuthEndpoint).toBe("https://auth.example.com/auth");
    expect(info.transferServer).toBe("https://anchor.example.com/sep6");
    expect(info.transferServerSep24).toBe("https://anchor.example.com/sep24");
    expect(info.signingKey).toBe(
      "GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB",
    );
    expect(info.horizonUrl).toBe("https://horizon.example.com");

    expect(info.documentation.orgName).toBe("Example Anchor");
    expect(info.documentation.orgUrl).toBe("https://example.com");

    expect(info.currencies).toHaveLength(1);
    expect(info.currencies[0].code).toBe("USDC");
    expect(info.currencies[0].displayDecimals).toBe(2);
    expect(info.currencies[0].isAssetAnchored).toBe(true);
    expect(info.currencies[0].anchorAssetType).toBe("fiat");
    expect(info.currencies[0].collateralAddresses).toEqual(["GADDR1"]);

    expect(info.principals).toHaveLength(1);
    expect(info.principals[0].name).toBe("Jane Doe");
    expect(info.principals[0].idPhotoHash).toBe("abc123");

    expect(info.validators).toHaveLength(1);
    expect(info.validators[0].host).toBe("core.example.com:11625");
    expect(info.validators[0].publicKey).toBe(
      "GDVALIDATORXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    );
  });

  it("defaults optional array sections to [] when absent", () => {
    const toml = {
      DOCUMENTATION: {},
    } as unknown as StellarToml.Api.StellarToml;

    const info = parseToml(toml);

    expect(info.principals).toEqual([]);
    expect(info.currencies).toEqual([]);
    expect(info.validators).toEqual([]);
  });
});
