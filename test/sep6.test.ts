import { Wallet } from "../src";

describe("SEP-6", () => {
  it("should get anchor info", async () => {
    const wallet = Wallet.TestNet();
    const anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });
    const sep6 = anchor.sep6();
    const resp = await sep6.info();
    expect(resp.deposit).toBeTruthy();
    expect(resp.withdraw).toBeTruthy();
  });
});
