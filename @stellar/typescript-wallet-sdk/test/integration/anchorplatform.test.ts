import { Wallet } from "../../src";
import { IssuedAssetId } from "../../src/walletSdk/Asset";
import { DefaultAuthHeaderSigner } from "../../src/walletSdk/Auth/AuthHeaderSigner";

let wallet;
let stellar;
let anchor;
let accountKp;
const anchorUrl = "http://localhost:8080";

describe("Anchor Platform Integration Tests", () => {
  beforeAll(async () => {
    // Setup
    wallet = Wallet.TestNet();
    stellar = wallet.stellar();
    anchor = wallet.anchor({ homeDomain: anchorUrl, allowHttp: true });
    accountKp = stellar.account().createKeypair();
    await stellar.fundTestnetAccount(accountKp.publicKey);
  }, 15000);

  it("SEP-10 auth should work", async () => {
    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });
    expect(authToken.token).toBeTruthy();
  });

  it("using DefaultAuthHeaderSigner should work", async () => {
    const auth = await anchor.sep10();

    const authHeaderSigner = new DefaultAuthHeaderSigner();
    const authToken = await auth.authenticate({ accountKp, authHeaderSigner });
    expect(authToken.token).toBeTruthy();
  });

  it("SEP-12 KYC and SEP-6 should work", async () => {
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

    // SEP-6 deposit
    const sep6 = anchor.sep6();
    const dResp = await sep6.deposit({
      authToken,
      params: {
        asset_code: "USDC",
        account: accountKp.publicKey,
      },
    });
    expect(dResp.id).toBeTruthy();

    // SEP-6 withdraw
    const wResp = await sep6.withdraw({
      authToken,
      params: {
        asset_code: "USDC",
        account: accountKp.publicKey,
        type: "bank_account",
        dest: "123",
        dest_extra: "12345",
      },
    });
    expect(wResp.id).toBeTruthy();
  }, 30000);

  it("SEP-24 should work", async () => {
    const assetCode = "USDC";
    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });

    const dResp = await anchor.sep24().deposit({
      assetCode,
      authToken,
    });
    const transactionId = dResp.id;
    expect(transactionId).toBeTruthy();

    const wResp = await anchor.sep24().withdraw({
      withdrawalAccount: accountKp.publicKey,
      assetCode,
      authToken,
    });
    expect(wResp.id).toBeTruthy();

    const transaction = await anchor.sep24().getTransactionBy({
      authToken,
      id: transactionId,
    });
    expect(transaction.id).toBeTruthy();
    expect(transaction.status).toBe("incomplete");

    const transactions = await anchor.sep24().getTransactionsForAsset({
      authToken,
      assetCode,
      limit: 5,
    });
    expect(transactions.length).toBe(2);
  }, 45000);

  it("SEP-38 should work", async () => {
    const auth = await anchor.sep10();
    const authToken = await auth.authenticate({ accountKp });
    const sep38 = anchor.sep38(authToken);

    // Price
    const resp = await sep38.price({
      sellAsset: "iso4217:USD",
      buyAsset:
        "stellar:USDC:GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP",
      sellAmount: "5",
      context: "sep6",
    });
    expect(resp.price).toBeTruthy();

    // Create Quote
    const postResp = await sep38.requestQuote({
      sell_asset: "iso4217:USD",
      buy_asset:
        "stellar:USDC:GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP",
      sell_amount: "5",
      context: "sep6",
    });
    expect(postResp.id).toBeTruthy();

    // Get Quote
    const quoteId = postResp.id;
    const getResp = await sep38.getQuote(quoteId);
    expect(getResp.id).toBeTruthy();
  });
});
