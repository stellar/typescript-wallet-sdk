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