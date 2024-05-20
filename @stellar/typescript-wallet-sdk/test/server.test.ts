import { TransactionBuilder } from "@stellar/stellar-sdk";
import { Wallet, Server } from "../src";

let wallet;
let account;
let accountKp;
const networkPassphrase = "Test SDF Network ; September 2015";
describe("SEP-10 helpers", () => {
  beforeEach(() => {
    wallet = Wallet.TestNet();
    account = wallet.stellar().account();
    accountKp = account.createKeypair();
  });

  it("should validate and sign challenge txn", async () => {
    const validChallengeTx =
      "AAAAAgAAAACpn2Fr7GAZ4XOcFvEz+xduBFDK1NDLQP875GtWWlJ0XQAAAMgAAAAAAAAAAAAAAAEAAAAAZa76AgAAAABlrv2GAAAAAAAAAAIAAAABAAAAALO9GbK9e+E+ul46lJyGjkzjlQnwqNryiqBsIR1vgMlAAAAACgAAABt0ZXN0YW5jaG9yLnN0ZWxsYXIub3JnIGF1dGgAAAAAAQAAAEBRT0ZDTE02OFQ0cVF4Um55TCtRdlBlVTdPeDJYNnhLdzdyenZTbzBBYUdqdUtIdGxQRkpHNTFKMndJazBwMXl2AAAAAQAAAACpn2Fr7GAZ4XOcFvEz+xduBFDK1NDLQP875GtWWlJ0XQAAAAoAAAAPd2ViX2F1dGhfZG9tYWluAAAAAAEAAAAWdGVzdGFuY2hvci5zdGVsbGFyLm9yZwAAAAAAAAAAAAFaUnRdAAAAQG6cMkt4YhwOzgizIimXRX8zTfFjAOItG7kSX14A454KlhGj9ocFhaRpj3tCc4fK45toFCBKRAdyFM7aQq331QI=";

    let isValid;
    try {
      const signedResp = await Server.signChallengeTransaction({
        accountKp,
        challengeTx: validChallengeTx,
        networkPassphrase,
        anchorDomain: "testanchor.stellar.org",
      });
      const signedTxn = TransactionBuilder.fromXDR(
        signedResp.transaction,
        networkPassphrase,
      );
      expect(signedTxn.signatures.length).toBe(2);
      expect(signedResp.networkPassphrase).toBe(networkPassphrase);
      isValid = true;
    } catch (e) {
      isValid = false;
    }

    expect(isValid).toBeTruthy();
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
        anchorDomain: "testanchor.stellar.org",
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
