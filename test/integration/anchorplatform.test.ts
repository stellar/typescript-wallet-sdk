import axios from "axios";

import { Wallet } from "../../src";
import { IssuedAssetId } from "../../src/walletSdk/Asset";

let wallet;
let stellar;
let anchor;
let accountKp;
const anchorUrl = "http://localhost:8080";

describe("ALEC TODO", () => {
  beforeAll(async () => {
    // Wait for docker to be ready
    const ready = await isServerReady();
    if (!ready) {
      throw new Error("Server not ready, check Docker");
    }

    // Setup
    wallet = Wallet.TestNet();
    stellar = wallet.stellar();
    anchor = wallet.anchor({ homeDomain: anchorUrl });
    accountKp = stellar.account().createKeypair();
    await stellar.fundTestnetAccount(accountKp.publicKey);
  }, 120000);

  it("auth should work", async () => {
    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });
    expect(authToken.token).toBeTruthy();
  });

  it("KYC and SEP-6 deposit should work", async () => {
    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });

    // add USDC trustline
    const asset = new IssuedAssetId(
      "USDC",
      // anchor platform USDC issuer
      "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP",
    );
    const txBuilder = await stellar.transaction({
      sourceAddress: accountKp,
    });
    const addUsdcTx = txBuilder.addAssetSupport(asset).build();
    addUsdcTx.sign(accountKp.keypair);
    await stellar.submitTransaction(addUsdcTx);

    // add SEP-12 KYC info
    const sep12 = await anchor.sep12(authToken);
    const sep12Resp = await sep12.add({
      sep9Info: {
        first_name: "john",
        last_name: "smith",
        email_address: "123@gmail.com",
        bank_number: "12345",
        bank_account_number: "12345",
      },
    });
    expect(sep12Resp.data.id).toBeTruthy();

    // make SEP-6 deposit
    const sep6 = anchor.sep6();
    const sep6Resp = await sep6.deposit({
      authToken,
      params: {
        asset_code: "USDC",
        account: accountKp.publicKey,
      },
    });
    expect(sep6Resp.id).toBeTruthy();
  }, 30000);
});

const isServerReady = async () => {
  let ready = false;
  for (let fails = 0; fails < 10; fails++) {
    try {
      const resp = await axios.get(`${anchorUrl}/.well-known/stellar.toml`);
      console.log({ resp }); // ALEC TODO - remove
      ready = true;
      break;
    } catch (e) {
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }
  }
  return ready;
};
