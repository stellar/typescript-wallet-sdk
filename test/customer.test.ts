import { Wallet, ApplicationConfiguration, StellarConfiguration } from "../src";
import { DefaultSigner } from "../src/walletSdk/Auth/WalletSigner";
import { SigningKeypair } from "../src/walletSdk/Horizon/Account";
import axios from "axios";
import { getRandomString } from "./utils";

let wallet;
let accountKp;

describe("Customer", () => {
  beforeAll(async () => {
    wallet = Wallet.TestNet();
    const stellar = wallet.stellar();
    const account = stellar.account();
    accountKp = account.createKeypair();
    await axios.get(
      "https://friendbot.stellar.org/?addr=" + accountKp.publicKey,
    );
  }, 10000);

  test("Sep-12 methods work", async () => {
    const anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });

    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });

    const sep12 = await anchor.sep12(authToken);
    const customerType = "sep31-receiver";
    const customerEmail = `${getRandomString(6)}@gmail.com`;

    // Add
    let resp = await sep12.add({
      first_name: "john",
      last_name: "smith",
      email_address: customerEmail,
      type: customerType,
    });
    expect(resp.data.id).toBeTruthy();
    const { id } = resp.data;

    // Get
    resp = await sep12.getCustomer({ id, type: customerType });
    expect(Object.keys(resp.data).sort()).toEqual(
      ["id", "provided_fields", "fields", "status"].sort(),
    );
    expect(Object.keys(resp.data?.provided_fields).sort()).toEqual(
      ["first_name", "last_name", "email_address"].sort(),
    );
    expect(Object.keys(resp.data?.fields).sort()).toEqual(
      [
        "bank_account_number",
        "bank_number",
        "photo_id_front",
        "photo_id_back",
      ].sort(),
    );

    // Update
    resp = await sep12.update(
      {
        first_name: "j",
        last_name: "s",
        email_address: "1" + customerEmail,
        bank_account_number: "12345",
        bank_number: "54321",
        photo_id_front: Buffer.from("test-front-image"),
        photo_id_back: Buffer.from("test-back-image"),
      },
      id,
    );
    expect(resp.data.id).toBeTruthy();

    // Get again, check that the provided fields updated
    resp = await sep12.getCustomer({ id, type: customerType });
    expect(Object.keys(resp.data.fields).length).toBe(0);

    // Delete
    await sep12.delete(accountKp.publicKey);
  });
});
