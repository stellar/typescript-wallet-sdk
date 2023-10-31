// ALEC TODO - file name
import { Wallet } from "../src";

describe("ALEC TODO", () => {
  it("should work", async () => {
    const wallet = Wallet.TestNet();
    const anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });
    const sep6 = anchor.sep6();
    await sep6.info();
  });
});
