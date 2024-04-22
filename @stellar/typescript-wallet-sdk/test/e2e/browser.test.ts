import { chromium } from "playwright";

describe("Test browser build", () => {
  it("works", async () => {
    await (async () => {
      const browser = await chromium.launch();
      const page = await browser.newPage();

      await page.goto("https://stellar.org");

      await page.addScriptTag({
        path: "@stellar/typescript-wallet-sdk/lib/bundle_browser.js",
      });

      // Use the Stellar SDK in the website's context
      const result = await page.evaluate(() => {
        let kp;
        try {
          console.log(window.WalletSDK);

          const wal = window.WalletSDK.Wallet.TestNet();
          const account = wal.stellar().account();

          kp = account.createKeypair();
        } catch (e) {
          return { success: false };
        }

        return {
          publicKey: kp.publicKey,
          secretKey: kp.secretKey,
          success: true,
        };
      });

      expect(result.publicKey).toBeTruthy();
      expect(result.secretKey).toBeTruthy();
      expect(result.success).toBeTruthy();

      await browser.close();
    })();
  }, 15000);
});
