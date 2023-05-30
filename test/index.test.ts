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
let authToken;
describe("Anchor", () => {
  beforeEach(() => {
    const Wal = walletSdk.Wallet.TestNet();
    anchor = Wal.anchor("testanchor.stellar.org");
    accountKp = Keypair.fromSecret(
      "SDXC3OHSJZEQIXKEWFDNEZEQ7SW5DWBPW7RKUWI36ILY3QZZ6VER7TXV"
    );
  });

  it("should be able to authenticate", async () => {
    const auth = await anchor.auth();
    authToken = await auth.authenticate(accountKp);

    expect(authToken).toBeTruthy();
    expect(typeof authToken).toBe("string");
  });

  it("should give TOML info", async () => {
    const resp = await anchor.getInfo();

    expect(resp.webAuthEndpoint).toBe("https://testanchor.stellar.org/auth");
    expect(resp.currencies.length).toBe(2);
  });

  it("should get anchor services info", async () => {
    const serviceInfo = await anchor.getServicesInfo();

    expect(serviceInfo.deposit).toBeTruthy();
    expect(serviceInfo.withdraw).toBeTruthy();
  });

  it("should give interactive deposit url", async () => {
    const assetCode = "SRT";
    const resp = await anchor
      .interactive()
      .deposit(accountKp.publicKey(), assetCode, authToken);

    expect(resp.url).toBeTruthy();
    expect(resp.id).toBeTruthy();
  });

  it("should give interactive withdraw url", async () => {
    const assetCode = "SRT";
    const resp = await anchor
      .interactive()
      .withdraw(accountKp.publicKey(), assetCode, authToken);

    expect(resp.url).toBeTruthy();
    expect(resp.id).toBeTruthy();
  });

  it("should fetch existing transaction by id", async () => {
    const transaction = await anchor
      .getTransactionBy({ authToken, id: "da8575e9-edc6-4f99-98cf-2b302f203dd8" });
  
    const { id, kind, amount_in, amount_out, amount_fee } = transaction;

    expect(transaction).toBeTruthy();
    expect(id === "da8575e9-edc6-4f99-98cf-2b302f203dd8").toBeTruthy;
    expect(kind === "deposit").toBeTruthy;
    expect(amount_in === "100.15").toBeTruthy;
    expect(amount_out === "99.15").toBeTruthy;
    expect(amount_fee === "1.00").toBeTruthy;
  });

  it("should error fetching non-existing transaction by id", async () => {
    await expect(async () => { 
      const nonExistingTransactionId = "da8575e9-edc6-4f99-98cf-2b302f203cc7";
      await anchor.getTransactionBy({ authToken, id: nonExistingTransactionId });
    }).rejects.toThrowError(ServerRequestFailedError)
  });

  it("should fetch 5 existing transactions by token code", async () => {
    const transactions = await anchor
      .getTransactionsForAsset({
        authToken,  
        assetCode: "SRT",
        limit: 5,
        lang: "en-US",
      });

    transactions.forEach(({ status }) => {
      expect(status).toBeTruthy();
      expect(typeof status).toBe("string");
    });

    expect(transactions.length === 5).toBeTruthy();
  });

  it("should fetch 3 existing deposit transactions by token code", async () => {
    const transactions = await anchor
      .getTransactionsForAsset({ 
        authToken, 
        assetCode: "SRT",
        limit: 3,
        kind: "deposit",
        lang: "en-US",
      });

    transactions.forEach(({ kind }) => {
      expect(kind === "deposit").toBeTruthy();    
    });

    expect(transactions.length === 3).toBeTruthy();
  });

  it("should fetch 2 existing withdrawal transactions by token code", async () => {
    const transactions = await anchor
      .getTransactionsForAsset({
        authToken,  
        assetCode: "SRT",
        limit: 2,
        kind: "withdrawal",
        lang: "en-US",
      });

    transactions.forEach(({ kind }) => {
      expect(kind === "withdrawal").toBeTruthy();    
    });

    expect(transactions.length === 2).toBeTruthy();
  });

  it("should error fetching transactions with invalid pading id", async () => {
    await expect(async () => { 
      await anchor
      .getTransactionsForAsset({
        authToken,  
        assetCode: "SRT",
        lang: "en-US",
        pagingId: "randomPagingId",
      });
    }).rejects.toThrowError(ServerRequestFailedError)
  });
});
