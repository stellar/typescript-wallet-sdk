import StellarSdk, { Keypair } from "stellar-sdk";

import sdk from "../src";
import { ServerRequestFailedError } from "../src/walletSdk/exception";

const { walletSdk } = sdk;

describe("Wallet", () => {
  it("should init", () => {
    walletSdk.Wallet.TestNet();
    walletSdk.Wallet.MainNet();
  });
});

describe("SEP-24 flow", () => {
  it("should init a wallet with network and domain", () => {
    const Wal = walletSdk.Wallet.TestNet();
    const anchor = Wal.anchor("anchor-domain");
  });
});

let anchor;
let accountKp;
describe("Anchor", () => {
  beforeEach(() => {
    const Wal = walletSdk.Wallet.TestNet();
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

  it("should fetch existing transaction by id", async () => {
    const auth = await anchor.auth();
    const accountKp = Keypair.fromSecret(
      "SDXC3OHSJZEQIXKEWFDNEZEQ7SW5DWBPW7RKUWI36ILY3QZZ6VER7TXV"
    );
    const token = await auth.authenticate(accountKp);
    const transaction = await anchor
      .getTransactionBy({ authToken: token, id: "da8575e9-edc6-4f99-98cf-2b302f203dd8" });
  
    const { id, kind, amount_in, amount_out, amount_fee } = transaction;

    expect(transaction).toBeTruthy();
    expect(id === "da8575e9-edc6-4f99-98cf-2b302f203dd8").toBeTruthy;
    expect(kind === "deposit").toBeTruthy;
    expect(amount_in === "100.15").toBeTruthy;
    expect(amount_out === "99.15").toBeTruthy;
    expect(amount_fee === "1.00").toBeTruthy;
  });

  it("should error fetching non-existing transaction by id", async () => {
    const auth = await anchor.auth();
    const accountKp = Keypair.fromSecret(
      "SDXC3OHSJZEQIXKEWFDNEZEQ7SW5DWBPW7RKUWI36ILY3QZZ6VER7TXV"
    );
    const token = await auth.authenticate(accountKp);

    await expect(async () => { 
      const nonExistingTransactionId = "da8575e9-edc6-4f99-98cf-2b302f203cc7";
      await anchor.getTransactionBy({ authToken: token, id: nonExistingTransactionId });
    }).rejects.toThrowError(ServerRequestFailedError)
  });
});
