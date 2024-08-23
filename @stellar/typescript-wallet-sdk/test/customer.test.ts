import { Sep12, SigningKeypair, Wallet } from "../src";
import axios from "axios";
import { getRandomString } from "./utils";

let wallet: Wallet;
let accountKp: SigningKeypair;

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

    const sep12: Sep12 = await anchor.sep12(authToken);
    const customerType = "sep31-receiver";
    const customerEmail = `${getRandomString(6)}@gmail.com`;

    // Add
    const addResp = await sep12.add({
      sep9Info: {
        first_name: "john",
        last_name: "smith",
        email_address: customerEmail,
        type: customerType,
      },
      transactionId: "abcd1234",
    });
    expect(addResp.id).toBeTruthy();
    const { id } = addResp;

    // Get
    const getResp = await sep12.getCustomer({
      id,
      type: customerType,
      transactionId: "abcd1234",
    });
    expect(Object.keys(getResp).sort()).toEqual(
      ["id", "provided_fields", "fields", "status"].sort(),
    );
    expect(Object.keys(getResp?.provided_fields).sort()).toEqual(
      ["first_name", "last_name", "email_address"].sort(),
    );
    expect(Object.keys(getResp?.fields).sort()).toEqual(
      [
        "bank_account_number",
        "bank_number",
        "photo_id_front",
        "photo_id_back",
      ].sort(),
    );

    // Update
    const updateResp = await sep12.update({
      sep9Info: {
        first_name: "j",
        last_name: "s",
        email_address: "1" + customerEmail,
        bank_account_number: "12345",
        bank_number: "54321",
      },
      sep9BinaryInfo: {
        photo_id_front: Buffer.from("test-front-image"),
        photo_id_back: Buffer.from("test-back-image"),
      },
      id,
      transactionId: "abcd1234",
    });
    expect(updateResp.id).toBeTruthy();

    // Get again, check that the provided fields updated
    const getResp2 = await sep12.getCustomer({
      id,
      type: customerType,
      transactionId: "abcd1234",
    });
    expect(Object.keys(getResp2.fields).length).toBe(0);

    // Delete
    await sep12.delete();
  }, 20000);
});
