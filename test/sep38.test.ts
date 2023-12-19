// ALEC TODO - file test name
import { Wallet } from "../src";

let wallet;
let anchor;
let sep38;

describe("SEP-38", () => {
  beforeAll(() => {
    wallet = Wallet.TestNet();
    anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });
    sep38 = anchor.sep38();
  }, 10000);

  it("should get Sep-38 anchor info", async () => {
    const resp = await sep38.info();
    expect(resp.assets[0]).toBeTruthy();

    const refreshed = await sep38.info(true);
    expect(refreshed.assets[0]).toBeTruthy();
  });
});
