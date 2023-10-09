import axios from "axios";
import { Horizon, MuxedAccount } from "stellar-sdk";

import { AccountService, SigningKeypair, Stellar, Wallet } from "../src";
import { IssuedAssetId, NativeAssetId } from "../src/walletSdk/Asset";

describe("Muxed Transactions", () => {
  let wallet: Wallet;
  let stellar: Stellar;
  let accountService: AccountService;
  let testingDistributionKp: SigningKeypair;
  let testingAsset: IssuedAssetId;

  // Creates testing stellar account with testing TSWT asset
  // in case it doesn't exist just yet
  beforeAll(async () => {
    wallet = Wallet.TestNet();
    stellar = wallet.stellar();
    accountService = stellar.account();

    // Keys for accounts to issue and receive the new TSWT asset
    const issuingKeys = SigningKeypair.fromSecret(
      "SAJMJSEC44DWU22TJF6RWYLRPPXLY4G3L5PVGC7D2QDUCPJIFCOISNQE",
    );
    const receivingKeys = SigningKeypair.fromSecret(
      "SAOQQ76UQFEYN4QAAAOIO45KNZZNQKSXAUB5GXKI6YOFLEDCWPWTCDM3",
    );

    // The "receiving" account is the distribution account
    testingDistributionKp = receivingKeys;

    // This is the testing asset we'll use to test sending non-native payments
    testingAsset = new IssuedAssetId("TSWT", issuingKeys.publicKey);

    let assetAlreadyCreated = false;
    try {
      const receivingAccountInfo = await accountService.getInfo({
        accountAddress: receivingKeys.publicKey,
      });

      const tswtAssetBalance = receivingAccountInfo.balances.find(
        (balanceLine) => {
          const { asset_code, balance } =
            balanceLine as Horizon.BalanceLineAsset;
          return asset_code === testingAsset.code && Number(balance) > 1000;
        },
      );

      if (tswtAssetBalance) {
        assetAlreadyCreated = true;
      }
    } catch {}

    if (assetAlreadyCreated) {
      return;
    }

    // If the TSWT asset is not there yet, let's issue and distribute it!
    try {
      // First make sure both issuing and receiving(distribution) accounts
      // are funded
      await axios.get(
        "https://friendbot.stellar.org/?addr=" + issuingKeys.publicKey,
      );

      await axios.get(
        "https://friendbot.stellar.org/?addr=" + receivingKeys.publicKey,
      );
    } catch {}

    let didFail = false;
    try {
      // Then, the receiving(distribution) account must trust the asset
      const txBuilder = await stellar.transaction({
        sourceAddress: receivingKeys,
        baseFee: 100,
      });
      const addTswtTx = txBuilder.addAssetSupport(testingAsset).build();
      addTswtTx.sign(receivingKeys.keypair);
      await stellar.submitTransaction(addTswtTx);

      // Finally, the issuing account actually sends a payment using the asset
      // to fund the receiving(distribution) account
      const txBuilder2 = await stellar.transaction({
        sourceAddress: issuingKeys,
        baseFee: 100,
      });
      const fundingPaymentTx = txBuilder2
        .transfer(receivingKeys.publicKey, testingAsset, "100000000")
        .build();
      fundingPaymentTx.sign(issuingKeys.keypair);
      await stellar.submitTransaction(fundingPaymentTx);
    } catch {
      didFail = true;
    }

    expect(didFail).toBeFalsy();
  }, 60000);

  it("should send 'native' payment to valid Muxed account", async () => {
    const baseAccoutKp = SigningKeypair.fromSecret(
      "SDC4SZWQDELBKWPBPBLZSKMWAIPNE27OF6BPJV7F7FCXTKHBACN3KWRO",
    );

    try {
      await axios.get(
        "https://friendbot.stellar.org/?addr=" + baseAccoutKp.publicKey,
      );
    } catch {}

    const baseAccount = await stellar.server.loadAccount(
      baseAccoutKp.publicKey,
    );
    const muxedAccount = new MuxedAccount(baseAccount, "123");

    const txBuilder = await stellar.transaction({
      sourceAddress: testingDistributionKp,
      baseFee: 100,
    });

    const sendNativePaymentTx = txBuilder
      .transfer(muxedAccount.accountId(), new NativeAssetId(), "1")
      .build();
    sendNativePaymentTx.sign(testingDistributionKp.keypair);

    const response = await stellar.submitTransaction(sendNativePaymentTx);

    expect(response).toBeTruthy();
  }, 30000);

  it("should send non-native payment to valid Muxed account", async () => {
    const baseAccoutKp = SigningKeypair.fromSecret(
      "SDFK2E4LSVZJGEWKFIX4SXOLDXQQWMDGNONERVBNFXDVWE2PTEKY6ZSI",
    );

    try {
      await axios.get(
        "https://friendbot.stellar.org/?addr=" + baseAccoutKp.publicKey,
      );
    } catch {}

    const baseAccount = await stellar.server.loadAccount(
      baseAccoutKp.publicKey,
    );
    const muxedAccount = new MuxedAccount(baseAccount, "456");

    // First add support for the non-native asset
    const txBuilder1 = await stellar.transaction({
      sourceAddress: baseAccoutKp,
      baseFee: 100,
    });
    const addTswtTx = txBuilder1.addAssetSupport(testingAsset).build();
    addTswtTx.sign(baseAccoutKp.keypair);
    await stellar.submitTransaction(addTswtTx);

    // Then submit the non-native payment!
    const txBuilder2 = await stellar.transaction({
      sourceAddress: testingDistributionKp,
      baseFee: 100,
    });

    const sendNonNativePaymentTx = txBuilder2
      .transfer(muxedAccount.accountId(), testingAsset, "1")
      .build();
    sendNonNativePaymentTx.sign(testingDistributionKp.keypair);

    const response = await stellar.submitTransaction(sendNonNativePaymentTx);

    expect(response).toBeTruthy();
  }, 30000);

  it("should return 'op_no_trust' error for sending unsupported Asset to valid Muxed account", async () => {
    const baseAccoutKp = SigningKeypair.fromSecret(
      "SD4UETXJ2MJCIPSU72DAJDPL2YGDHF2FEIJVNARUGE6MFDPXNS5YHNGK",
    );

    try {
      await axios.get(
        "https://friendbot.stellar.org/?addr=" + baseAccoutKp.publicKey,
      );
    } catch {}

    const baseAccount = await stellar.server.loadAccount(
      baseAccoutKp.publicKey,
    );
    const muxedAccount = new MuxedAccount(baseAccount, "789");

    // Try submitting the non-native payment without adding the trustline
    const txBuilder = await stellar.transaction({
      sourceAddress: testingDistributionKp,
      baseFee: 100,
    });

    const sendNonNativePaymentTx = txBuilder
      .transfer(muxedAccount.accountId(), testingAsset, "1")
      .build();
    sendNonNativePaymentTx.sign(testingDistributionKp.keypair);

    try {
      await stellar.submitTransaction(sendNonNativePaymentTx);
    } catch (error) {
      expect(error?.response?.status === 400).toBeTruthy();

      const resultCodeOperations: Array<string> =
        error?.response?.data?.extras?.result_codes?.operations || [];

      expect(resultCodeOperations).toContain("op_no_trust");
    }
  }, 30000);

  it("should return error for sending payment to invalid Muxed address", async () => {
    const txBuilder = await stellar.transaction({
      sourceAddress: testingDistributionKp,
      baseFee: 100,
    });

    try {
      txBuilder
        .transfer(
          // Invalid Muxed address ending in "XXXXXX"
          "MBE3SABPOQFUSVCNDO5WNSS4N2KD7ZUFIYDRBP6Q3UBXBMYZFYWLSAAAAAAAAAAXXXXXX",
          new NativeAssetId(),
          "1",
        )
        .build();
    } catch (error) {
      const lowercaseError = error.toString().toLowerCase();
      // Catches "Error: destination is invalid" error message
      expect(lowercaseError.match(/destination.*invalid/)).toBeTruthy();
    }
  });
});

describe("Path Payment", () => {
  let wallet: Wallet;
  let stellar: Stellar;
  let sourceKp;
  let receivingKp;
  const usdcAsset = new IssuedAssetId(
    "USDC",
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  );
  beforeAll(async () => {
    wallet = Wallet.TestNet();
    stellar = wallet.stellar();

    // set up accounts
    sourceKp = SigningKeypair.fromSecret(
      "SBTMCNDNPMJFEYUHLCAMFM5C2PWI7ZUI7PFMLI53O62CSSXFSAXEDTS6",
    );
    receivingKp = SigningKeypair.fromSecret(
      "SDU4Z54AAFF3Y3GA6U27QSSYYX5FLDV6KWGFCCWSMSOSFWHSABJFBFOD",
    );
    try {
      await stellar.server.loadAccount(sourceKp.publicKey);
      await stellar.server.loadAccount(receivingKp.publicKey);
    } catch (e) {
      await axios.get(
        "https://friendbot.stellar.org/?addr=" + sourceKp.publicKey,
      );
      await axios.get(
        "https://friendbot.stellar.org/?addr=" + receivingKp.publicKey,
      );

      // add trustlines if new accounts
      let txBuilder = await stellar.transaction({
        sourceAddress: receivingKp,
      });
      let txn = txBuilder.addAssetSupport(usdcAsset).build();
      receivingKp.sign(txn);
      await stellar.submitTransaction(txn);

      txBuilder = await stellar.transaction({
        sourceAddress: sourceKp,
      });
      txn = txBuilder.addAssetSupport(usdcAsset).build();
      sourceKp.sign(txn);
      await stellar.submitTransaction(txn);
    }
  }, 20000);

  it("should use path payment send", async () => {
    const txBuilder = await stellar.transaction({
      sourceAddress: sourceKp,
    });
    const txn = txBuilder
      .pathPay({
        destinationAddress: receivingKp.publicKey,
        sendAsset: new NativeAssetId(),
        destAsset: usdcAsset,
        sendAmount: "5",
      })
      .build();
    sourceKp.sign(txn);
    const success = await stellar.submitTransaction(txn);
    expect(success).toBe(true);
  }, 15000);

  it("should use path payment receive", async () => {
    const txBuilder = await stellar.transaction({
      sourceAddress: sourceKp,
    });
    const txn = txBuilder
      .pathPay({
        destinationAddress: receivingKp.publicKey,
        sendAsset: new NativeAssetId(),
        destAsset: usdcAsset,
        destAmount: "5",
      })
      .build();
    sourceKp.sign(txn);
    const success = await stellar.submitTransaction(txn);
    expect(success).toBe(true);
  }, 15000);

  it("should swap", async () => {
    const txBuilder = await stellar.transaction({
      sourceAddress: sourceKp,
    });
    const txn = txBuilder.swap(new NativeAssetId(), usdcAsset, "1").build();
    sourceKp.sign(txn);
    const success = await stellar.submitTransaction(txn);
    expect(success).toBe(true);
  }, 15000);
});
