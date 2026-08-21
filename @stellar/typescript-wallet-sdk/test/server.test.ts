import axios from "axios";
import sinon from "sinon";
import {
  Account,
  Asset,
  Keypair,
  MuxedAccount,
  Operation,
  StellarToml,
  Transaction,
  TransactionBuilder,
  WebAuth,
} from "@stellar/stellar-sdk";
import { Wallet, Server } from "../src";
import {
  ChallengeTxnClientAccountMismatchError,
  ChallengeValidationFailedError,
} from "../src/walletSdk/Exceptions";

let wallet;
let account;
let accountKp;
const networkPassphrase = "Test SDF Network ; September 2015";
const anchorDomain = "testanchor.stellar.org";
describe("SEP-10 helpers", () => {
  beforeEach(() => {
    wallet = Wallet.TestNet();
    account = wallet.stellar().account();
    accountKp = account.createKeypair();
  });

  it("should validate and sign challenge txn", async () => {
    const resp = await axios.get(
      `https://${anchorDomain}/auth?account=${accountKp.publicKey}&home_domain=${anchorDomain}`,
    );
    const validChallengeTx = resp.data.transaction;

    const signedResp = await Server.signChallengeTransaction({
      accountKp,
      challengeTx: validChallengeTx,
      networkPassphrase,
      anchorDomain,
    });
    const signedTxn = TransactionBuilder.fromXDR(
      signedResp.transaction,
      networkPassphrase,
    );
    expect(signedTxn.signatures.length).toBe(2);
    expect(signedResp.networkPassphrase).toBe(networkPassphrase);
  });

  it("should invalidate bad challenge txn", async () => {
    const invalidChallengeTx =
      "AAAAAgAAAABQ5qHpn3ATIgt6yWrU4bhOdEszALPqLHb5V2pTRsYq0QAAAGQAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAACgAAABZ0ZXN0YW5jaG9yLnN0ZWxsYXIub3JnAAAAAAABAAAAQFFPRkNMTTY4VDRxUXhSbnlMK1F2UGVVN094Mlg2eEt3N3J6dlNvMEFhR2p1S0h0bFBGSkc1MUoyd0lrMHAxeXYAAAAAAAAAAA==";

    let isValid;
    try {
      await Server.signChallengeTransaction({
        accountKp,
        challengeTx: invalidChallengeTx,
        networkPassphrase,
        anchorDomain,
      });
      isValid = true;
    } catch (e) {
      isValid = false;
    }
    expect(isValid).toBeFalsy();
  });
});

describe("Server helpers", () => {
  it("should parse a JSON AnchorTransaction", () => {
    const depositJson = `{"id":"82fhs729f63dh0v4","kind":"deposit","status":"pending_external","status_eta":3600,"external_transaction_id":"2dd16cb409513026fbe7defc0c6f826c2d2c65c3da993f747d09bf7dafd31093","more_info_url":"https://youranchor.com/tx/242523523","amount_in":"18.34","amount_out":"18.24","amount_fee":"0.1","started_at":"2017-03-20T17:05:32Z","claimable_balance_id":"00000000c2d8c89264288dbde8488364fd3fd30850fd4e7fbf6d1e9809702558afa4fdea"}`;
    let parsed = Server.parseAnchorTransaction(depositJson);
    expect(parsed.kind).toBe("deposit");

    const withdrawJson = `{"id":"82fhs729f63dh0v4","kind":"withdrawal","status":"completed","amount_in":"510","amount_out":"490","amount_fee":"5","started_at":"2017-03-20T17:00:02Z","completed_at":"2017-03-20T17:09:58Z","updated_at":"2017-03-20T17:09:58Z","more_info_url":"https://youranchor.com/tx/242523523","stellar_transaction_id":"17a670bc424ff5ce3b386dbfaae9990b66a2a37b4fbe51547e8794962a3f9e6a","external_transaction_id":"1941491","withdraw_anchor_account":"GBANAGOAXH5ONSBI2I6I5LHP2TCRHWMZIAMGUQH2TNKQNCOGJ7GC3ZOL","withdraw_memo":"186384","withdraw_memo_type":"id"}`;
    parsed = Server.parseAnchorTransaction(withdrawJson);
    expect(parsed.kind).toBe("withdrawal");
  });
  it("should parse moneygram JSON transactions", () => {
    const d1 = `{"id":"19489958-c0c4-4090-a272-a51fc851f524","kind":"deposit","status":"incomplete","amount_in":"3.00","amount_in_asset":"USD","amount_out":"3.00","amount_out_asset":"USD","amount_fee":"0.00","amount_fee_asset":"USD","started_at":"2024-03-28T16:20:09Z","stellar_transaction_id":"","refunded":false,"from":"","to":""}`;
    let parsed = Server.parseAnchorTransaction(d1);
    expect(parsed.kind).toBe("deposit");

    const w1 = `{"withdraw_anchor_account":"GAYF33NNNMI2Z6VNRFXQ64D4E4SF77PM46NW3ZUZEEU5X7FCHAZCMHKU","withdraw_memo":"639496083328800102","withdraw_memo_type":"id","id":"d64c5d56-de6d-492e-95dd-412fb86c1c14","kind":"withdrawal","status":"pending_user_transfer_start","more_info_url":"https://extstellar.moneygram.com/transaction-status?transaction_id\u003dd64c5d56-de6d-492e-95dd-412fb86c1c14\u0026token\u003deyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJkNjRjNWQ1Ni1kZTZkLTQ5MmUtOTVkZC00MTJmYjg2YzFjMTQiLCJpc3MiOiJtb3JlSW5mb1VybCIsInN1YiI6IkdBWkRVRlIyTDQ3S0hBS1g0V1NVWDNJUFo3NDYyVDVFNzNNQVpIWE9XT0NFQlBBUVlIVDdFNjJGIiwiaWF0IjoxNzExNjQyNzU0LCJleHAiOjE3MTE3MjkxNTQsImNsaWVudF9kb21haW4iOiJhcGktZGV2LnZpYnJhbnRhcHAuY29tIn0.CNjnMzXYA9aSU0ZA9Gd-P5bDWmpnaoAen8SnGz6PlHQ\u0026lang\u003den-US\u0026refNumber\u003d89445520","amount_in":"3.0","amount_in_asset":"USDC","amount_out":"4.02","amount_out_asset":"CAD","amount_fee":"0.0","amount_fee_asset":"USDC","started_at":"2024-03-28T16:18:02Z","stellar_transaction_id":"","external_transaction_id":"89445520","refunded":false,"from":"GAZDUFR2L47KHAKX4WSUX3IPZ7462T5E73MAZHXOWOCEBPAQYHT7E62F","to":"GAYF33NNNMI2Z6VNRFXQ64D4E4SF77PM46NW3ZUZEEU5X7FCHAZCMHKU"}`;
    parsed = Server.parseAnchorTransaction(w1);
    expect(parsed.kind).toBe("withdrawal");

    const w2 = `{"id":"d64c5d56-de6d-492e-95dd-412fb86c1c14","kind":"withdrawal","status":"incomplete","amount_in":"0","amount_out":"0","amount_fee":"0","started_at":"2024-03-28T16:18:02Z","stellar_transaction_id":"","refunded":false,"from":"GAZDUFR2L47KHAKX4WSUX3IPZ7462T5E73MAZHXOWOCEBPAQYHT7E62F"}`;
    parsed = Server.parseAnchorTransaction(w2);
    expect(parsed.kind).toBe("withdrawal");
  });
});

describe("signChallengeTransaction validation", () => {
  const anchorA = "anchor-a.example.com";
  const anchorB = "anchor-b.example.com";

  let anchorAKp;
  let anchorBKp;
  let accountKp;

  beforeEach(() => {
    anchorAKp = Keypair.random();
    anchorBKp = Keypair.random();
    accountKp = Wallet.TestNet().stellar().account().createKeypair();

    // anchorDomain always resolves to anchor A's stellar.toml
    sinon.stub(StellarToml.Resolver, "resolve").resolves({
      SIGNING_KEY: anchorAKp.publicKey(),
      WEB_AUTH_ENDPOINT: `https://${anchorA}/auth`,
      DOCUMENTATION: {},
    } as StellarToml.Api.StellarToml);
  });

  afterEach(() => {
    sinon.restore();
  });

  // webAuthDomain defaults to anchor A, which is what the stubbed
  // WEB_AUTH_ENDPOINT resolves to for anchorDomain.
  const buildChallenge = (
    serverKp,
    homeDomain,
    clientAccountID,
    webAuthDomain = anchorA,
  ) =>
    WebAuth.buildChallengeTx(
      serverKp,
      clientAccountID,
      homeDomain,
      300,
      networkPassphrase,
      webAuthDomain,
    );

  it("should sign a challenge issued by the expected anchor", async () => {
    const challengeTx = buildChallenge(anchorAKp, anchorA, accountKp.publicKey);

    const signedResp = await Server.signChallengeTransaction({
      accountKp,
      challengeTx,
      networkPassphrase,
      anchorDomain: anchorA,
    });

    const signedTxn = TransactionBuilder.fromXDR(
      signedResp.transaction,
      networkPassphrase,
    );
    expect(signedTxn.signatures.length).toBe(2);
  });

  it("should reject a challenge issued by a different anchor", async () => {
    // A relays a challenge that anchor B issued for the same account, ordering
    // its own signature first so that signatures[0] matches the SIGNING_KEY
    // published at anchorDomain. Only the home domain, web auth domain and
    // transaction source bind the challenge to the anchor that issued it.
    const relayed = TransactionBuilder.fromXDR(
      buildChallenge(anchorBKp, anchorB, accountKp.publicKey, anchorB),
      networkPassphrase,
    ) as Transaction;

    const anchorBSignature = relayed.signatures[0];
    relayed.signatures.length = 0;
    relayed.sign(anchorAKp);
    relayed.signatures.push(anchorBSignature);

    await expect(
      Server.signChallengeTransaction({
        accountKp,
        challengeTx: relayed.toXDR(),
        networkPassphrase,
        anchorDomain: anchorA,
      }),
    ).rejects.toThrow(ChallengeValidationFailedError);
  });

  it("should sign a challenge issued for a muxed account of the signing key", async () => {
    // readChallengeTx returns the M... source verbatim; the underlying G... key
    // is the correct signer, so this must be accepted.
    const muxed = new MuxedAccount(
      new Account(accountKp.publicKey, "0"),
      "1234",
    ).accountId();
    expect(muxed.startsWith("M")).toBe(true);

    const challengeTx = buildChallenge(anchorAKp, anchorA, muxed);

    const signedResp = await Server.signChallengeTransaction({
      accountKp,
      challengeTx,
      networkPassphrase,
      anchorDomain: anchorA,
    });

    const signedTxn = TransactionBuilder.fromXDR(
      signedResp.transaction,
      networkPassphrase,
    );
    expect(signedTxn.signatures.length).toBe(2);
  });

  it("should reject a muxed challenge whose underlying key is not the signer", async () => {
    const otherMuxed = new MuxedAccount(
      new Account(Keypair.random().publicKey(), "0"),
      "1234",
    ).accountId();

    await expect(
      Server.signChallengeTransaction({
        accountKp,
        challengeTx: buildChallenge(anchorAKp, anchorA, otherMuxed),
        networkPassphrase,
        anchorDomain: anchorA,
      }),
    ).rejects.toThrow(ChallengeTxnClientAccountMismatchError);
  });

  it("should reject a challenge issued for a different account", async () => {
    const otherAccount = Keypair.random().publicKey();
    const challengeTx = buildChallenge(anchorAKp, anchorA, otherAccount);

    await expect(
      Server.signChallengeTransaction({
        accountKp,
        challengeTx,
        networkPassphrase,
        anchorDomain: anchorA,
      }),
    ).rejects.toThrow(ChallengeTxnClientAccountMismatchError);
  });

  it("should reject a transaction that is not a SEP-10 challenge", async () => {
    const notAChallenge = new TransactionBuilder(
      new Account(anchorAKp.publicKey(), "-1"),
      { fee: "100", networkPassphrase },
    )
      .addOperation(
        Operation.payment({
          destination: anchorAKp.publicKey(),
          asset: Asset.native(),
          amount: "1000",
        }),
      )
      .setTimeout(300)
      .build();
    notAChallenge.sign(anchorAKp);

    await expect(
      Server.signChallengeTransaction({
        accountKp,
        challengeTx: notAChallenge.toXDR(),
        networkPassphrase,
        anchorDomain: anchorA,
      }),
    ).rejects.toThrow(ChallengeValidationFailedError);
  });

  it("should wrap a malformed WEB_AUTH_ENDPOINT as a validation failure", async () => {
    sinon.restore();
    sinon.stub(StellarToml.Resolver, "resolve").resolves({
      SIGNING_KEY: anchorAKp.publicKey(),
      WEB_AUTH_ENDPOINT: "not a url",
      DOCUMENTATION: {},
    } as StellarToml.Api.StellarToml);

    await expect(
      Server.signChallengeTransaction({
        accountKp,
        challengeTx: buildChallenge(anchorAKp, anchorA, accountKp.publicKey),
        networkPassphrase,
        anchorDomain: anchorA,
      }),
    ).rejects.toThrow(ChallengeValidationFailedError);
  });

  it("should accept an explicit homeDomain that differs from anchorDomain", async () => {
    const homeDomain = "wallet-home.example.com";
    const challengeTx = buildChallenge(
      anchorAKp,
      homeDomain,
      accountKp.publicKey,
    );

    const signedResp = await Server.signChallengeTransaction({
      accountKp,
      challengeTx,
      networkPassphrase,
      anchorDomain: anchorA,
      homeDomain,
    });

    expect(signedResp.networkPassphrase).toBe(networkPassphrase);
  });
});
