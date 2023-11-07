import { Wallet } from "../src";
import axios from "axios";

import { Sep6ResponseType } from "../src/walletSdk/Types";

let wallet;
let anchor;
let sep6;
let accountKp;

describe("SEP-6", () => {
  beforeAll(async () => {
    wallet = Wallet.TestNet();
    anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });
    sep6 = anchor.sep6();

    accountKp = wallet.stellar().account().createKeypair();
    await axios.get(
      "https://friendbot.stellar.org/?addr=" + accountKp.publicKey,
    );
  }, 10000);
  it("should get anchor info", async () => {
    const resp = await sep6.info();
    expect(resp.deposit).toBeTruthy();
    expect(resp.withdraw).toBeTruthy();

    const refreshed = await sep6.info(true);
    expect(refreshed.deposit).toBeTruthy();
    expect(refreshed.withdraw).toBeTruthy();
  });
  it("should deposit", async () => {
    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });

    const sep12 = await anchor.sep12(authToken);

    // Make first call with missing KYC info
    let resp = await sep6.deposit({
      authToken,
      params: {
        asset_code: "SRT",
        account: accountKp.publicKey,
        type: "bank_account",
      },
    });
    expect(resp.type).toBe(Sep6ResponseType.MISSING_KYC);
    expect(resp.data.type).toBe("non_interactive_customer_info_needed");

    // Add the missing KYC info
    await sep12.add({
      sep9Info: {
        first_name: "john",
        last_name: "smith",
        email_address: "123@gmail.com",
        bank_number: "12345",
        bank_account_number: "12345",
      },
    });

    // Make deposit call again with all info uploaded
    resp = await sep6.deposit({
      authToken,
      params: {
        asset_code: "SRT",
        account: accountKp.publicKey,
        type: "bank_account",
      },
    });
    expect(resp.type).toBe(Sep6ResponseType.SUCCESS);
    expect(resp.data.id).toBeTruthy();
  });
  it("should withdraw", async () => {
    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });

    const sep12 = await anchor.sep12(authToken);

    await sep12.add({
      sep9Info: {
        first_name: "john",
        last_name: "smith",
        email_address: "123@gmail.com",
        bank_number: "12345",
        bank_account_number: "12345",
      },
    });

    const resp = await sep6.withdraw({
      authToken,
      params: {
        asset_code: "SRT",
        account: accountKp.publicKey,
        type: "bank_account",
        dest: "123",
        dest_extra: "12345",
      },
    });
    expect(resp.type).toBe(Sep6ResponseType.SUCCESS);
    expect(resp.data.id).toBeTruthy();
  });
});
