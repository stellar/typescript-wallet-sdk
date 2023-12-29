import { Wallet } from "../src";

let wallet;
let anchor;
let sep38;
let accountKp;

describe("SEP-38", () => {
  beforeAll(() => {
    wallet = Wallet.TestNet();
    anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });
    sep38 = anchor.sep38();
    accountKp = accountKp = wallet.stellar().account().createKeypair();
  }, 10000);

  it("should get Sep-38 anchor info", async () => {
    const resp = await sep38.info();
    expect(resp.assets[0]).toBeTruthy();

    const refreshed = await sep38.info(true);
    expect(refreshed.assets[0]).toBeTruthy();
  });

  it("should get Sep-38 prices", async () => {
    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });
    sep38 = anchor.sep38(authToken);

    const resp = await sep38.prices({
      sell_asset: "iso4217:USD",
      sell_amount: "5",
      sell_delivery_method: "ach_debit",
    });
    expect(resp.buy_assets[0].asset).toBeTruthy();
  });

  it("should get Sep-38 price", async () => {
    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });
    sep38 = anchor.sep38(authToken);

    const resp = await sep38.price({
      sell_asset: "iso4217:USD",
      buy_asset:
        "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
      sell_amount: "5",
      context: "sep6",
    });
    expect(resp.price).toBeTruthy();
  });
});
