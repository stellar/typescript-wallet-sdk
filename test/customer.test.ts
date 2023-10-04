import { Wallet, ApplicationConfiguration, StellarConfiguration } from "../src";
import { DefaultSigner } from "../src/walletSdk/Auth/WalletSigner";
import { SigningKeypair } from "../src/walletSdk/Horizon/Account";
import axios from "axios";
import { getRandomString } from "./utils";

let wallet;
let account;
let accountKp;
// ALEC TODO - move?
describe("ALEC - TODO", () => {
  beforeAll(async () => {
    const wallet = Wallet.TestNet();
    const stellar = wallet.stellar();
    const account = stellar.account();
    accountKp = account.createKeypair();
    console.log("creating account"); // ALEC TODO - remove
    console.log("kp:", accountKp.publicKey, accountKp.secretKey); // ALEC TODO - remove
    await axios.get(
      "https://friendbot.stellar.org/?addr=" + accountKp.publicKey,
    );
  }, 10000);
  beforeEach(() => {
    // ALEC TODO - remove
    const axiosInstance = axios.create();
    axiosInstance.interceptors.response.use(
      function (response) {
        // Any status code that lie within the range of 2xx cause this function to trigger
        // Do something with response data
        return response;
      },
      function (error) {
        console.log("error.response:", error.response); // ALEC TODO - remove
        // Any status codes that falls outside the range of 2xx cause this function to trigger
        // Do something with response error
        return Promise.reject(error.response);
      },
    );
    let appConfig = new ApplicationConfiguration(DefaultSigner, axiosInstance);

    wallet = new Wallet({
      stellarConfiguration: StellarConfiguration.TestNet(),
      applicationConfiguration: appConfig,
    });
    account = wallet.stellar().account();
  });
  test("it works", async () => {
    const anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });

    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });
    console.log({ authToken }); // ALEC TODO - remove

    const sep12 = await anchor.sep12(authToken);
    const customerType = "sep31-receiver";
    const customerEmail = `${getRandomString(6)}@gmail.com`;
    console.log({ customerEmail }); // ALEC TODO - remove

    // Update
    let resp = await sep12.add({
      first_name: "john",
      last_name: "smith",
      email_address: customerEmail,
      type: customerType,
    });
    expect(resp.data.id).toBeTruthy();
    const { id } = resp.data;

    console.log({ id }); // ALEC TODO - remove

    // Get
    resp = await sep12.getByIdAndType(id, customerType);
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
    resp = await sep12.getByIdAndType(id, customerType);
    expect(Object.keys(resp.data.fields).length).toBe(0);

    // Delete
    await sep12.delete(accountKp.publicKey);
  });
});
