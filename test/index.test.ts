import { Keypair } from "stellar-sdk";

import sdk from "../src";
const { walletSdk } = sdk;

describe("SEP-24 flow", () => {
  it("should init a wallet with network and domain", () => {
    const Wal = new walletSdk.Wallet(walletSdk.NETWORKS.PUBLIC);
    const anchor = Wal.anchor("anchor-domain");
  });
});

let anchor;
let accountKp;
describe("Anchor", () => {
  beforeEach(() => {
    const Wal = new walletSdk.Wallet(walletSdk.NETWORKS.TESTNET);
    anchor = Wal.anchor("testanchor.stellar.org");
    accountKp = Keypair.fromSecret(
      "SDXC3OHSJZEQIXKEWFDNEZEQ7SW5DWBPW7RKUWI36ILY3QZZ6VER7TXV"
    );
  });
  it("should give TOML info", async () => {
    const resp = await anchor.getInfo();
    expect(resp.webAuthEndpoint).toBe("https://testanchor.stellar.org/auth");
    expect(resp.currencies.length).toBe(2);
  });

  it("should be able to authenticate", async () => {
    const auth = await anchor.auth();

    const token = await auth.authenticate(accountKp);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
  });

  it("should get anchor services info", async () => {
    const serviceInfo = await anchor.getServicesInfo();
    expect(serviceInfo.deposit).toBeTruthy();
    expect(serviceInfo.withdraw).toBeTruthy();
  });

  it("should give interactive deposit url", async () => {
    const auth = await anchor.auth();
    const accountKp = Keypair.fromSecret(
      "SDXC3OHSJZEQIXKEWFDNEZEQ7SW5DWBPW7RKUWI36ILY3QZZ6VER7TXV"
    );
    const token = await auth.authenticate(accountKp);
    const assetCode = "SRT";
    const resp = await anchor
      .interactive()
      .deposit(accountKp.publicKey(), assetCode, token);
    expect(resp.url).toBeTruthy();
    expect(resp.id).toBeTruthy();
  });
  it("should give interactive withdraw url", async () => {
    const auth = await anchor.auth();
    const token = await auth.authenticate(accountKp);
    const assetCode = "SRT";
    const resp = await anchor
      .interactive()
      .withdraw(accountKp.publicKey(), assetCode, token);
    expect(resp.url).toBeTruthy();
    expect(resp.id).toBeTruthy();
  });
});
