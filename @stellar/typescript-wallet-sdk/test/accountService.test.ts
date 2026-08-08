import axios from "axios";
import { Horizon } from "@stellar/stellar-sdk";
import sinon from "sinon";

import { AccountService, SigningKeypair, Wallet } from "../src";
import { HORIZON_ORDER, HORIZON_LIMIT_DEFAULT } from "../src/walletSdk/Types";
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
      await axios.get(
        "https://friendbot.stellar.org/?addr=" + fundingAccountKp.publicKey,
      );
    }

    // create test account
    const testingAccountKp = accountService.createKeypair();
    await axios.get(
      "https://friendbot.stellar.org/?addr=" + testingAccountKp.publicKey,
    );

    const txBuilder = await stellar.transaction({
      sourceAddress: testingAccountKp,
    });
    const asset = new IssuedAssetId("USDC", fundingAccountKp.publicKey);
    const addUsdcTx = txBuilder.addAssetSupport(asset).build();
    addUsdcTx.sign(testingAccountKp.keypair);

    await stellar.submitTransaction(addUsdcTx);

    accountAddress = testingAccountKp.publicKey;
  }, 30000);

  it("should return stellar account details", async () => {
    const response = await accountService.getInfo({ accountAddress });

    expect(response.account_id).toBe(accountAddress);
    expect(response.balances).toBeInstanceOf(Array);
    expect(
      response.balances.some(
        (balance) =>
          (balance as Horizon.HorizonApi.BalanceLineAsset).asset_code ===
          "USDC",
      ),
    ).toBeTruthy();
  });

  it("should error 404 in case account not found", async () => {
    // Any recently generated keypair won't be tied to a stellar account
    const publicKeyWithoutAccount = accountService.createKeypair().publicKey;

    try {
      await accountService.getInfo({ accountAddress: publicKeyWithoutAccount });
    } catch (e) {
      expect(e?.response?.status).toBe(404);
    }
  });

  it("should return stellar account operations", async () => {
    const response = await accountService.getHistory({
      accountAddress,
      order: HORIZON_ORDER.ASC,
    });

    expect(response.records).toBeInstanceOf(Array);
    expect(response.records[0]).toBeInstanceOf(Object);
    expect(response.records[0]).toHaveProperty("id");
    expect(response.records[0]).toHaveProperty("type");
    expect(response.records[0]).toHaveProperty("created_at");
    expect(
      response.records.some(
        ({ type }) =>
          type === Horizon.HorizonApi.OperationResponseType.createAccount,
      ),
    ).toBeTruthy();
    expect(
      response.records.some(
        ({ type }) =>
          type === Horizon.HorizonApi.OperationResponseType.changeTrust,
      ),
    ).toBeTruthy();
  });
});

// Hermetic (no network) — kept out of the "Horizon" describe so its
// friendbot/loadAccount beforeAll does not run.
describe("AccountService.getHistory cursor handling", () => {
  const accountAddress =
    "GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB";
  let service: AccountService;
  let fakeBuilder: Record<string, sinon.SinonStub>;

  beforeEach(() => {
    service = Wallet.TestNet().stellar().account();
    fakeBuilder = {
      forAccount: sinon.stub(),
      limit: sinon.stub(),
      order: sinon.stub(),
      includeFailed: sinon.stub(),
      cursor: sinon.stub(),
      call: sinon.stub().resolves({ records: [] }),
    };
    // Every chained method returns the builder itself.
    ["forAccount", "limit", "order", "includeFailed", "cursor"].forEach((m) =>
      fakeBuilder[m].returns(fakeBuilder),
    );
    sinon
      .stub(
        service["server"] as unknown as { operations: () => unknown },
        "operations",
      )
      .returns(fakeBuilder);
  });

  afterEach(() => {
    sinon.restore();
  });

  // Regression guard for the v16 URLSearchParams change: passing an undefined
  // cursor into the call builder would serialize "cursor=undefined" and Horizon
  // responds 400, so getHistory must omit .cursor() when none is provided.
  it("omits .cursor() when no cursor is provided", async () => {
    await service.getHistory({ accountAddress });

    expect(fakeBuilder.cursor.called).toBe(false);
    expect(fakeBuilder.call.calledOnce).toBe(true);
    expect(fakeBuilder.limit.calledWith(HORIZON_LIMIT_DEFAULT)).toBe(true);
    expect(fakeBuilder.order.calledWith(HORIZON_ORDER.DESC)).toBe(true);
    expect(fakeBuilder.includeFailed.calledWith(false)).toBe(true);
  });

  it("applies .cursor(value) when a cursor is provided", async () => {
    await service.getHistory({ accountAddress, cursor: "abc123" });

    expect(fakeBuilder.cursor.calledOnceWithExactly("abc123")).toBe(true);
    expect(fakeBuilder.call.calledOnce).toBe(true);
  });
});
