import { chromium, webkit } from "playwright";

describe("Test browser build", () => {
  const browsers = [
    { name: "Chrome", instance: chromium },
    { name: "Safari", instance: webkit },
  ];

  for (const b of browsers) {
    it(
      "works on " + b.name,
      async () => {
        await (async () => {
          const browser = await b.instance.launch();
          const page = await browser.newPage();

          await page.goto("https://stellar.org");

          await page.addScriptTag({
            path: "./lib/bundle_browser.js",
          });

          // Use the Stellar SDK in the website's context
          const result = await page.evaluate(() => {
            let kp;
            try {
              const wal = (window as any).WalletSDK.Wallet.TestNet();
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
      },
      15000,
    );
  }
});
