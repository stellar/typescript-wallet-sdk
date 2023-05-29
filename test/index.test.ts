import StellarSdk, { Keypair } from "stellar-sdk";
import http from "http";

import sdk from "../src";
const { walletSdk } = sdk;

describe("Wallet", () => {
  it("should init", () => {
    walletSdk.Wallet.TestNet();
    walletSdk.Wallet.MainNet();
  });
  it("should be able return a client", async () => {
    let appConfig = new walletSdk.ApplicationConfiguration();
    let wal = new walletSdk.Wallet(
      walletSdk.StellarConfiguration.TestNet(),
      appConfig
    );

    let client = wal.getClient();

    // custom client
    client = wal.getClient({
      httpAgent: new http.Agent({ keepAlive: false }),
    });
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

  it("should be able to authenticate with client domain", async () => {
    const auth = await anchor.auth();
    let signedByClient = false;
    let signedByDomain = false;

    const walletSigner = {
      signWithClientAccount: (txn, account) => {
        txn.sign(account);
        signedByClient = true;
        return txn;
      },
      signWithDomainAccount: (transactionXDR, networkPassPhrase, account) => {
        // dummy secret key for signing
        const clientDomainKp = Keypair.fromSecret(
          "SC7PKBRGRI5X4XP4QICBZ2NL67VUJJVKFKXDTGSPI3SQYZGC4NZWONIH"
        );
        const transaction = StellarSdk.TransactionBuilder.fromXDR(
          transactionXDR,
          networkPassPhrase
        );
        transaction.sign(clientDomainKp);
        signedByDomain = true;
        return transaction;
      },
    };

    // because using dummy sk and not real demo wallet sk, lets just check that signing is called
    const challengeResponse = await auth.challenge(
      accountKp,
      "",
      "demo-wallet-server.stellar.org"
    );
    const txn = auth.sign(accountKp, challengeResponse, walletSigner);
    expect(txn).toBeTruthy();
    expect(signedByClient).toBe(true);
    expect(signedByDomain).toBe(true);
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
