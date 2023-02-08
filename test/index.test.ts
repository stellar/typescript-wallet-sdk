import { walletSdk } from "../";

describe("SEP-24 flow", () => {
  it("should init a wallet with network and domain", () => {
    const Wal = new walletSdk.Wallet(walletSdk.NETWORKS.PUBLIC);
    const Anchor = Wal.anchor("anchor-domain");

    expect(Anchor.domain).toBe("anchor-domain");
  });
});

describe("Anchor", () => {
  it("should give TOML info", async () => {
    const Wal = new walletSdk.Wallet(walletSdk.NETWORKS.TESTNET);
    const anchor = Wal.anchor("testanchor.stellar.org");

    const resp = await anchor.getInfo();
    expect(resp.WEB_AUTH_ENDPOINT).toBe("https://testanchor.stellar.org/auth");
  });
});
