import { Wallet } from "../src";
import axios from "axios";

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
    expect(resp.type).toBe("non_interactive_customer_info_needed");

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
    expect(resp.id).toBeTruthy();
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
    expect(resp.id).toBeTruthy();
  });

  it("deposit-exchange should work", async () => {
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

    const params = {
      destination_asset:
        "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
      source_asset: "iso4217:USD",
      amount: "1",
      account: accountKp.publicKey,
      type: "bank_account",
    };

    const resp = await sep6.depositExchange({ authToken, params });
    expect(resp.id).toBeTruthy();
  });

  it("withdraw-exchange should work", async () => {
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

    const params = {
      destination_asset: "iso4217:USD",
      source_asset:
        "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
      amount: "1",
      dest: accountKp.publicKey,
      dest_extra: "1234",
      type: "bank_account",
    };

    const resp = await sep6.withdrawExchange({ authToken, params });
    expect(resp.id).toBeTruthy();
  });

  it("should get transactions", async () => {
    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });

    let resp = await anchor.sep6().getTransactionsForAsset({
      authToken,
      assetCode: "SRT",
      account: accountKp.publicKey,
    });
    expect(resp[0].id).toBeTruthy();

    const id = resp[0].id;

    resp = await anchor.sep6().getTransactionBy({ authToken, id });

    expect(resp.id).toEqual(id);
  });

  let txId;

  it("should watch all transactions", async () => {
    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });

    const watcher = anchor.sep6().watcher();

    let messageCount = 0;
    let errorCount = 0;
    const onMessage = (m) => {
      expect(m.id).toBeTruthy();
      messageCount += 1;
      txId = m.id;
    };
    const onError = (e) => {
      expect(e).toBeFalsy();
      errorCount += 1;
    };

    const { stop } = watcher.watchAllTransactions({
      authToken,
      assetCode: "SRT",
      account: accountKp.publicKey,
      onMessage,
      onError,
      timeout: 1,
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    stop();
    expect(messageCount > 0).toBe(true);
    expect(errorCount).toBe(0);
  });

  it("should watch one transaction", async () => {
    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });

    const watcher = anchor.sep6().watcher();

    let messageCount = 0;
    let errorCount = 0;
    let successCount = 0;
    const onMessage = (m) => {
      expect(m.id).toBeTruthy();
      messageCount += 1;
    };
    const onError = (e) => {
      expect(e).toBeFalsy();
      errorCount += 1;
    };
    const onSuccess = (s) => {
      expect(s.id).toBeTruthy();
      successCount += 1;
    };
    const { stop } = watcher.watchOneTransaction({
      authToken,
      assetCode: "SRT",
      id: txId,
      onSuccess,
      onMessage,
      onError,
      timeout: 1,
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    stop();
    expect(messageCount > 0).toBe(true);
    expect(errorCount).toBe(0);
    expect(successCount).toBe(0);
  });
});
