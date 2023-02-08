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

  it("should be able to authenticate", async () => {
    jest.setTimeout(3000);

    // ALEC TODO - put this in a beforeAll or something
    const Wal = new walletSdk.Wallet(walletSdk.NETWORKS.TESTNET);
    const anchor = Wal.anchor("testanchor.stellar.org");

    const auth = await anchor.auth(
      "SDXC3OHSJZEQIXKEWFDNEZEQ7SW5DWBPW7RKUWI36ILY3QZZ6VER7TXV"
    );
    const token = await auth.authenticate();
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
  });
});
