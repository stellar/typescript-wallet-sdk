import axios from "axios";
import { Horizon } from "stellar-sdk";

import { AccountService, SigningKeypair, Wallet } from "../src";
import { HORIZON_ORDER } from "../src/walletSdk/Types";
import { IssuedAssetId } from "../src/walletSdk/Asset";

let accountService: AccountService;
let accountAddress: string;

describe("Horizon", () => {
  // Creates testing stellar account with USDC trustline
  // in case it doesn't exist just yet
  beforeAll(async () => {
    const wallet = Wallet.TestNet();
    const stellar = wallet.stellar();
    accountService = stellar.account();
    
    const fundingAccountKp = SigningKeypair.fromSecret(
      "SDJTZXPFPWRK4GHECLQBDFRDCNEZFA4PIZA475WQEGKTL4Y2QLS77DGD",
    );

    // make sure funding account exists
    try {
      await stellar.server.loadAccount(fundingAccountKp.publicKey);
    } catch (e) {
      await axios.get("https://friendbot.stellar.org/?addr=" + fundingAccountKp.publicKey);
    }

    const testingAccountKp = SigningKeypair.fromSecret(
      "SAXW2HC7JH5IJSIRFQ22JTMT6T3VONKGMYSIBLHNEJCV7AXLIGAXNESD"
    );

    // make sure testing account exists
    accountAddress = testingAccountKp.publicKey;
    try {
      await stellar.server.loadAccount(accountAddress);
    } catch (e) {
      const txBuilder1 = await stellar.transaction({
        sourceAddress: fundingAccountKp,
        baseFee: 100,
      });
      const createAccTx = txBuilder1.createAccount(testingAccountKp, 2).build();
      createAccTx.sign(fundingAccountKp.keypair);

      let failed = false;
      try {
        await stellar.submitTransaction(createAccTx);
        await stellar.server.loadAccount(accountAddress);
      } catch (e) {
        failed = true; 
      }

      const txBuilder2 = await stellar.transaction({
        sourceAddress: testingAccountKp,
        baseFee: 100,
      });
      const asset = new IssuedAssetId(
        "USDC",
        "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      );
      const addUsdcTx = txBuilder2.addAssetSupport(asset).build();
      addUsdcTx.sign(testingAccountKp.keypair);

      // make sure testing account has USDC trustline
      try {
        await stellar.submitTransaction(addUsdcTx);
      } catch (e) {
        failed = true; 
      }

      expect(failed).toBeFalsy();
    }
  }, 30000);

  it("should return stellar account details", async () => {
    const response  = await accountService.getInfo({ accountAddress });

    expect(response.account_id).toBe(accountAddress);
    expect(response.balances).toBeInstanceOf(Array);
    expect(response.balances.some(
      (balance) => (balance as Horizon.BalanceLineAsset).asset_code === "USDC"
    )).toBeTruthy();
  });

  it("should return stellar account operations", async () => {
    const response  = await accountService.getHistory({ 
      accountAddress,
      order: HORIZON_ORDER.ASC,
    });

    expect(response.records).toBeInstanceOf(Array);
    expect(response.records[0]).toBeInstanceOf(Object);
    expect(response.records[0]).toHaveProperty("id");
    expect(response.records[0]).toHaveProperty("type");
    expect(response.records[0]).toHaveProperty("created_at");
    expect(response.records.some(({ type }) => type === "create_account")).toBeTruthy();
    expect(response.records.some(({ type }) => type === "change_trust")).toBeTruthy();
  });
});
