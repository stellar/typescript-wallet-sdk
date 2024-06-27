import { Keypair, Networks, StellarToml } from "@stellar/stellar-sdk";
import {
  NativeAssetId,
  Sep7Pay,
  Sep7Tx,
  SigningKeypair,
  Stellar,
  Wallet,
  isValidSep7Uri,
  parseSep7Uri,
  sep7ReplacementsFromString,
  sep7ReplacementsToString,
} from "../src";
import { Sep7OperationType } from "../src/walletSdk/Types";
import {
  Sep7InvalidUriError,
  Sep7LongMsgError,
} from "../src/walletSdk/Exceptions";

const testKp1 = SigningKeypair.fromSecret(
  "SBKQDF56C5VY2YQTNQFGY7HM6R3V6QKDUEDXZQUCPQOP2EBZWG2QJ2JL",
);

const testKp2 = SigningKeypair.fromSecret(
  "SBIK5MF5QONDTKA5ZPXLI2XTBIAOWQEEOZ3TM76XVBPPJ2EEUUXTCIVZ",
);

let wal: Wallet;
let stellar: Stellar;

describe("Sep7Base", () => {
  it("constructor accepts a string uri", () => {
    const uriStr =
      "web+stellar:tx?xdr=test&callback=https%3A%2F%2Fexample.com%2Fcallback";
    const uri = new Sep7Tx(uriStr);
    expect(uri.operationType).toBe(Sep7OperationType.tx);
    expect(uri.xdr).toBe("test");
    expect(uri.callback).toBe("https://example.com/callback");
    expect(uri.toString()).toBe(uriStr);
  });

  it("constructor accepts URL uri", () => {
    const uriStr =
      "web+stellar:tx?xdr=test&callback=https%3A%2F%2Fexample.com%2Fcallback";
    const url = new URL(uriStr);
    const uri = new Sep7Tx(url);
    expect(uri.operationType).toBe(Sep7OperationType.tx);
    expect(uri.xdr).toBe("test");
    expect(uri.callback).toBe("https://example.com/callback");
    expect(uri.toString()).toBe(uriStr);

    // should not hold a reference to the original URL
    url.searchParams.delete("callback");
    expect(uri.callback).toBe("https://example.com/callback");
  });

  it("should default to public network if not set", () => {
    const uri = new Sep7Tx("web+stellar:tx");
    expect(uri.networkPassphrase).toBe(Networks.PUBLIC);

    uri.networkPassphrase = Networks.TESTNET;
    expect(uri.networkPassphrase).toBe(Networks.TESTNET);
  });

  it("allows setting callback with or without 'url:' prefix", () => {
    const uri = new Sep7Tx("web+stellar:tx");
    expect(uri.operationType).toBe(Sep7OperationType.tx);
    expect(uri.callback).toBe(undefined);

    // should remove "url:" prefix when getting
    uri.callback = "url:https://example.com/callback";
    expect(uri.callback).toBe("https://example.com/callback");

    uri.callback = "https://example.com/callback";
    expect(uri.callback).toBe("https://example.com/callback");

    expect(uri.toString()).toBe(
      "web+stellar:tx?callback=url%3Ahttps%3A%2F%2Fexample.com%2Fcallback",
    );
  });

  it("get/set msg", () => {
    const uri = new Sep7Tx("web+stellar:tx?msg=test%20message");

    expect(uri.msg).toBe("test message");

    uri.msg = "another message";
    expect(uri.msg).toBe("another message");
  });

  it("msg throws error if longer than 300 chars", () => {
    // Should throw when creating from uri string
    try {
      new Sep7Tx(
        "web+stellar:tx?msg=test%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20message%20test%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20long%20message",
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Sep7LongMsgError);
    }

    const uri = new Sep7Tx("web+stellar:tx?msg=test%20message");

    // Should throw when setting 'msg' with existing uri
    try {
      uri.msg =
        "another long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long message";
    } catch (error) {
      expect(error).toBeInstanceOf(Sep7LongMsgError);
    }
  });

  it("get/set network_passphrase", () => {
    const uri = new Sep7Tx("web+stellar:tx?msg=test%20message");

    // if not present on the uri it should default to Public network
    expect(uri.networkPassphrase).toBe(Networks.PUBLIC);

    uri.networkPassphrase = Networks.TESTNET;
    expect(uri.networkPassphrase).toBe(Networks.TESTNET);
  });

  it("get/set origin_domain", () => {
    const uri = new Sep7Tx(
      "web+stellar:tx?msg=test%20message&origin_domain=someDomain.com",
    );

    expect(uri.originDomain).toBe("someDomain.com");

    uri.originDomain = "anotherDomain.com";
    expect(uri.originDomain).toBe("anotherDomain.com");
  });

  it("addSignature() signs the uri and adds a signature to the end", () => {
    const uriStr =
      "web+stellar:pay?destination=GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO&amount=120.1234567&memo=skdjfasf&msg=pay%20me%20with%20lumens&origin_domain=someDomain.com";
    const uri = new Sep7Pay(uriStr);

    uri.addSignature(Keypair.fromSecret(testKp1.secretKey));

    const expectedSignature =
      "juY2Pi1/IubcbIDds2CbnL+Imr7dbpJYMW1nLAesOmyh5v/uTVvJwI06RgCGBtHh5+5DWOhJUlEfOSGXPtqgAA==";

    expect(uri.signature).toBe(expectedSignature);
    expect(
      uri
        .toString()
        .endsWith(`&signature=${encodeURIComponent(expectedSignature)}`),
    ).toBe(true);
  });

  it("verifySignature() returns false when there is no origin_domain and signature", async () => {
    const uriStr = "web+stellar:tx?xdr=test";
    const uri = new Sep7Tx(uriStr);
    expect(await uri.verifySignature()).toBe(false);
  });

  it("verifySignature() returns false when there is origin domain but no signature", async () => {
    const uriStr = "web+stellar:tx?xdr=test&origin_domain=someDomain.com";
    const uri = new Sep7Tx(uriStr);
    expect(await uri.verifySignature()).toBe(false);
  });

  it("verifySignature() returns false when there is signature but no origin domain", async () => {
    const uriStr = "web+stellar:tx?xdr=test&signature=sig";
    const uri = new Sep7Tx(uriStr);
    expect(await uri.verifySignature()).toBe(false);
  });

  it("verifySignature() returns false when the stellar.toml fails to resolve", async () => {
    const uriStr =
      "web+stellar:tx?xdr=test&origin_domain=someDomain.com&signature=sig";
    const uri = new Sep7Tx(uriStr);

    jest
      .spyOn(StellarToml.Resolver, "resolve")
      .mockRejectedValue(new Error("Not Found"));

    expect(await uri.verifySignature()).toBe(false);
  });

  it("verifySignature() returns false when the stellar.toml has no URI_REQUEST_SIGNING_KEY field", async () => {
    const uriStr =
      "web+stellar:tx?xdr=test&origin_domain=someDomain.com&signature=sig";
    const uri = new Sep7Tx(uriStr);

    jest.spyOn(StellarToml.Resolver, "resolve").mockResolvedValue({});

    expect(await uri.verifySignature()).toBe(false);
  });

  it("verifySignature() returns false when the signature is not valid", async () => {
    const uriStr =
      "web+stellar:pay?destination=GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO&amount=120.1234567&memo=skdjfasf&msg=pay%20me%20with%20lumens&origin_domain=someDomain.com?signature=invalid";
    const uri = new Sep7Pay(uriStr);

    jest.spyOn(StellarToml.Resolver, "resolve").mockResolvedValue({
      URI_REQUEST_SIGNING_KEY: testKp1.publicKey,
    });

    expect(await uri.verifySignature()).toBe(false);
  });

  it("verifySignature() returns true when the signature is valid", async () => {
    const uriStr =
      "web+stellar:pay?destination=GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO&amount=120.1234567&memo=skdjfasf&msg=pay%20me%20with%20lumens&origin_domain=someDomain.com&signature=juY2Pi1%2FIubcbIDds2CbnL%2BImr7dbpJYMW1nLAesOmyh5v%2FuTVvJwI06RgCGBtHh5%2B5DWOhJUlEfOSGXPtqgAA%3D%3D";
    const uri = new Sep7Pay(uriStr);

    jest.spyOn(StellarToml.Resolver, "resolve").mockResolvedValue({
      URI_REQUEST_SIGNING_KEY: testKp1.publicKey,
    });

    expect(await uri.verifySignature()).toBe(true);
  });
});

describe("Sep7Tx", () => {
  beforeAll(async () => {
    wal = Wallet.TestNet();
    stellar = wal.stellar();

    try {
      await stellar.server.loadAccount(testKp1.publicKey);
      await stellar.server.loadAccount(testKp2.publicKey);
    } catch (e) {
      await stellar.fundTestnetAccount(testKp1.publicKey);
      await stellar.fundTestnetAccount(testKp2.publicKey);
    }
  }, 30000);

  it("forTransaction sets the tx parameter", async () => {
    const txBuilder = await stellar.transaction({
      sourceAddress: testKp1,
      baseFee: 100,
      timebounds: 0,
    });
    txBuilder.transfer(testKp2.publicKey, new NativeAssetId(), "1");
    const tx = txBuilder.build();

    const xdr = tx.toEnvelope().toXDR().toString("base64");

    const uri = Sep7Tx.forTransaction(tx);
    expect(uri.operationType).toBe("tx");
    expect(uri.xdr).toBe(xdr);
    expect(uri.toString()).toBe(
      `web+stellar:tx?xdr=${encodeURIComponent(
        xdr,
      )}&network_passphrase=Test+SDF+Network+%3B+September+2015`,
    );
  });

  it("constructor accepts a string uri", () => {
    const uriStr =
      "web+stellar:tx?xdr=test&callback=https%3A%2F%2Fexample.com%2Fcallback";
    const uri = new Sep7Tx(uriStr);
    expect(uri.operationType).toBe("tx");
    expect(uri.xdr).toBe("test");
    expect(uri.callback).toBe("https://example.com/callback");
    expect(uri.toString()).toBe(uriStr);
  });

  it("allows adding xdr after construction", () => {
    const uri = new Sep7Tx();
    uri.xdr = "test";
    expect(uri.xdr).toBe("test");
    expect(uri.toString()).toBe("web+stellar:tx?xdr=test");
  });

  it("get/set xdr", () => {
    const uri = new Sep7Tx(
      "web+stellar:tx?xdr=testA&pubkey=testPubkey&callback=https%3A%2F%2Fexample.com%2Fcallback",
    );

    expect(uri.xdr).toBe("testA");

    uri.xdr = "testB";
    expect(uri.xdr).toBe("testB");
  });

  it("get/set pubkey", () => {
    const uri = new Sep7Tx(
      "web+stellar:tx?xdr=test&pubkey=testPubkey&callback=https%3A%2F%2Fexample.com%2Fcallback",
    );

    expect(uri.pubkey).toBe("testPubkey");

    uri.pubkey = testKp1.publicKey;
    expect(uri.pubkey).toBe(testKp1.publicKey);
  });

  it("get/set chain", () => {
    const uri = new Sep7Tx(
      "web+stellar:tx?xdr=test&pubkey=testPubkey&callback=https%3A%2F%2Fexample.com%2Fcallback&chain=testChain",
    );

    expect(uri.chain).toBe("testChain");

    uri.chain =
      "web+stellar:pay?destination=GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO&amount=120.1234567&memo=skdjfasf&msg=pay%20me%20with%20lumens&origin_domain=someDomain.com&signature=juY2Pi1%2FIubcbIDds2CbnL%2BImr7dbpJYMW1nLAesOmyh5v%2FuTVvJwI06RgCGBtHh5%2B5DWOhJUlEfOSGXPtqgAA%3D%3D";
    expect(uri.chain).toBe(
      "web+stellar:pay?destination=GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO&amount=120.1234567&memo=skdjfasf&msg=pay%20me%20with%20lumens&origin_domain=someDomain.com&signature=juY2Pi1%2FIubcbIDds2CbnL%2BImr7dbpJYMW1nLAesOmyh5v%2FuTVvJwI06RgCGBtHh5%2B5DWOhJUlEfOSGXPtqgAA%3D%3D",
    );
  });

  it("parses replacements", () => {
    // from doc sample: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md#operation-tx
    const uri = new Sep7Tx(
      "web+stellar:tx?replace=sourceAccount%3AX%2Coperations%5B0%5D.sourceAccount%3AY%2Coperations%5B1%5D.destination%3AY%3BX%3Aaccount%20from%20where%20you%20want%20to%20pay%20fees%2CY%3Aaccount%20that%20needs%20the%20trustline%20and%20which%20will%20receive%20the%20new%20tokens",
    );

    const replacements = uri.getReplacements();

    expect(replacements.length).toBe(3);

    expect(replacements[0].id).toBe("X");
    expect(replacements[0].path).toBe("sourceAccount");
    expect(replacements[0].hint).toBe(
      "account from where you want to pay fees",
    );

    expect(replacements[1].id).toBe("Y");
    expect(replacements[1].path).toBe("operations[0].sourceAccount");
    expect(replacements[1].hint).toBe(
      "account that needs the trustline and which will receive the new tokens",
    );

    expect(replacements[2].id).toBe("Y");
    expect(replacements[2].path).toBe("operations[1].destination");
    expect(replacements[2].hint).toBe(
      "account that needs the trustline and which will receive the new tokens",
    );
  });

  it("addReplacement", () => {
    const uri = new Sep7Tx("web+stellar:tx");
    uri.addReplacement({
      id: "X",
      path: "sourceAccount",
      hint: "account from where you want to pay fees",
    });

    uri.addReplacement({
      id: "Y",
      path: "operations[0].sourceAccount",
      hint: "account that needs the trustline and which will receive the new tokens",
    });

    uri.addReplacement({
      id: "Y",
      path: "operations[1].destination",
      hint: "account that needs the trustline and which will receive the new tokens",
    });

    expect(uri.toString()).toBe(
      "web+stellar:tx?replace=sourceAccount%3AX%2Coperations%5B0%5D.sourceAccount%3AY%2Coperations%5B1%5D.destination%3AY%3BX%3Aaccount+from+where+you+want+to+pay+fees%2CY%3Aaccount+that+needs+the+trustline+and+which+will+receive+the+new+tokens",
    );
  });

  it("addReplacement with forTransaction", async () => {
    const txBuilder = await stellar.transaction({
      sourceAddress: testKp1,
      baseFee: 100,
      timebounds: 0,
    });
    txBuilder.transfer(testKp2.publicKey, new NativeAssetId(), "1");
    const tx = txBuilder.build();

    const xdr = tx.toEnvelope().toXDR().toString("base64");

    const uri = Sep7Tx.forTransaction(tx);

    uri.addReplacement({
      id: "SRC",
      path: "sourceAccount",
      hint: "source account",
    });
    uri.addReplacement({ id: "SEQ", path: "seqNum", hint: "sequence number" });
    uri.addReplacement({ id: "FEE", path: "fee", hint: "fee" });

    expect(uri.toString()).toBe(
      `web+stellar:tx?xdr=${encodeURIComponent(
        xdr,
      )}&network_passphrase=Test+SDF+Network+%3B+September+2015&replace=sourceAccount%3ASRC%2CseqNum%3ASEQ%2Cfee%3AFEE%3BSRC%3Asource+account%2CSEQ%3Asequence+number%2CFEE%3Afee`,
    );
  });

  it("setReplacements", () => {
    const uri = new Sep7Tx("web+stellar:tx");
    uri.setReplacements([
      {
        id: "X",
        path: "sourceAccount",
        hint: "account from where you want to pay fees",
      },
      {
        id: "Y",
        path: "operations[0].sourceAccount",
        hint: "account that needs the trustline and which will receive the new tokens",
      },
      {
        id: "Y",
        path: "operations[1].destination",
        hint: "account that needs the trustline and which will receive the new tokens",
      },
    ]);

    expect(uri.toString()).toBe(
      "web+stellar:tx?replace=sourceAccount%3AX%2Coperations%5B0%5D.sourceAccount%3AY%2Coperations%5B1%5D.destination%3AY%3BX%3Aaccount+from+where+you+want+to+pay+fees%2CY%3Aaccount+that+needs+the+trustline+and+which+will+receive+the+new+tokens",
    );
  });

  it("removeReplacement", () => {
    const uri = new Sep7Tx(
      "web+stellar:tx?replace=sourceAccount%3AX%2Coperations%5B0%5D.sourceAccount%3AY%2Coperations%5B1%5D.destination%3AY%3BX%3Aaccount%20from%20where%20you%20want%20to%20pay%20fees%2CY%3Aaccount%20that%20needs%20the%20trustline%20and%20which%20will%20receive%20the%20new%20tokens",
    );
    uri.removeReplacement("Y");

    expect(uri.getReplacements().length).toBe(1);
    expect(uri.toString()).toBe(
      "web+stellar:tx?replace=sourceAccount%3AX%3BX%3Aaccount+from+where+you+want+to+pay+fees",
    );
  });

  it("geTransaction", async () => {
    const txBuilder = await stellar.transaction({
      sourceAddress: testKp1,
      baseFee: 100,
      timebounds: 0,
    });
    txBuilder.transfer(testKp2.publicKey, new NativeAssetId(), "1");
    const tx = txBuilder.build();

    const xdr = tx.toEnvelope().toXDR().toString("base64");

    const uri = new Sep7Tx(`web+stellar:tx?xdr=${encodeURIComponent(xdr)}`);

    expect(uri.getTransaction().toEnvelope().toXDR().toString("base64")).toBe(
      xdr,
    );
  });
});

describe("Sep7Pay", () => {
  it("forDestination sets the destination parameter", () => {
    const uri = Sep7Pay.forDestination(testKp2.publicKey);

    expect(uri.operationType).toBe("pay");
    expect(uri.destination).toBe(testKp2.publicKey);
    expect(uri.toString()).toBe(
      `web+stellar:pay?destination=${testKp2.publicKey}`,
    );
  });

  it("get/set destination", () => {
    const uri = new Sep7Pay(`web+stellar:pay?destination=${testKp2.publicKey}`);

    expect(uri.destination).toBe(testKp2.publicKey);

    uri.destination = "other";
    expect(uri.destination).toBe("other");
  });

  it("get/set amount", () => {
    const uri = new Sep7Pay(
      `web+stellar:pay?destination=${testKp2.publicKey}&amount=12.3`,
    );

    expect(uri.amount).toBe("12.3");

    uri.amount = "4";
    expect(uri.amount).toBe("4");
  });

  it("get/set assetCode", () => {
    const uri = new Sep7Pay(
      `web+stellar:pay?destination=${testKp2.publicKey}&asset_code=USDC`,
    );

    expect(uri.assetCode).toBe("USDC");

    uri.assetCode = "BRLT";
    expect(uri.assetCode).toBe("BRLT");
  });

  it("get/set assetIssuer", () => {
    const uri = new Sep7Pay(
      `web+stellar:pay?destination=${testKp2.publicKey}&asset_issuer=issuerA`,
    );

    expect(uri.assetIssuer).toBe("issuerA");
    uri.assetIssuer = "issuerB";
    expect(uri.assetIssuer).toBe("issuerB");
  });

  it("get/set memo", () => {
    const uri = new Sep7Pay(
      `web+stellar:pay?destination=${testKp2.publicKey}&memo=hello+world`,
    );

    expect(uri.memo).toBe("hello world");

    uri.memo = "bye bye world";
    expect(uri.memo).toBe("bye bye world");
  });

  it("get/set memoType", () => {
    const uri = new Sep7Pay(
      `web+stellar:pay?destination=${testKp2.publicKey}&memo_type=text`,
    );

    expect(uri.memoType).toBe("text");

    uri.memoType = "id";
    expect(uri.memoType).toBe("id");
  });
});

describe("sep7Parser", () => {
  it("isValidSep7Uri(uri) returns true when it starts with 'web+stellar:tx?xdr='", () => {
    expect(
      isValidSep7Uri(
        "web+stellar:tx?xdr=AAAAAP%2Byw%2BZEuNg533pUmwlYxfrq6%2FBoMJqiJ8vuQhf6rHWmAAAAZAB8NHAAAAABAAAAAAAAAAAAAAABAAAAAAAAAAYAAAABSFVHAAAAAABAH0wIyY3BJBS2qHdRPAV80M8hF7NBpxRjXyjuT9kEbH%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FAAAAAAAAAAA%3D&callback=url%3Ahttps%3A%2F%2FsomeSigningService.com%2Fa8f7asdfkjha&pubkey=GAU2ZSYYEYO5S5ZQSMMUENJ2TANY4FPXYGGIMU6GMGKTNVDG5QYFW6JS&msg=order%20number%2024",
      ).result,
    ).toBe(true);
    expect(
      isValidSep7Uri(
        "web+stellar:tx?xdr=AAAAAP%2Byw%2BZEuNg533pUmwlYxfrq6%2FBoMJqiJ8vuQhf6rHWmAAAAZAB8NHAAAAABAAAAAAAAAAAAAAABAAAAAAAAAAYAAAABSFVHAAAAAABAH0wIyY3BJBS2qHdRPAV80M8hF7NBpxRjXyjuT9kEbH%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FAAAAAAAAAAA%3D&replace=sourceAccount%3AX%3BX%3Aaccount%20on%20which%20to%20create%20the%20trustline",
      ).result,
    ).toBe(true);
    expect(isValidSep7Uri("web+stellar:tx").result).toBe(false);
    expect(isValidSep7Uri("web+stellar:").result).toBe(false);
  });

  it("isValidSep7Uri(uri) returns true when it starts with 'web+stellar:pay?destination='", () => {
    expect(
      isValidSep7Uri(
        "web+stellar:pay?destination=GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO&amount=120.1234567&memo=skdjfasf&memo_type=MEMO_TEXT&msg=pay%20me%20with%20lumens",
      ).result,
    ).toBe(true);
    expect(
      isValidSep7Uri(
        "web+stellar:pay?destination=GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO&amount=120.123&asset_code=USD&asset_issuer=GCRCUE2C5TBNIPYHMEP7NK5RWTT2WBSZ75CMARH7GDOHDDCQH3XANFOB&memo=hasysda987fs&memo_type=MEMO_TEXT&callback=url%3Ahttps%3A%2F%2FsomeSigningService.com%2Fhasysda987fs%3Fasset%3DUSD",
      ).result,
    ).toBe(true);
    expect(isValidSep7Uri("web+stellar:pay").result).toBe(false);
    expect(isValidSep7Uri("web+stellar:").result).toBe(false);
  });

  it("isValidSep7Uri(uri) returns false when it does not start with 'web+stellar:'", () => {
    expect(
      isValidSep7Uri(
        "not-a-stellar-uri:tx?xdr=AAAAAP%2Byw%2BZEuNg533pUmwlYxfrq6%2FBoMJqiJ8vuQhf6rHWmAAAAZAB8NHAAAAABAAAAAAAAAAAAAAABAAAAAAAAAAYAAAABSFVHAAAAAABAH0wIyY3BJBS2qHdRPAV80M8hF7NBpxRjXyjuT9kEbH%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FAAAAAAAAAAA%3D&callback=url%3Ahttps%3A%2F%2FsomeSigningService.com%2Fa8f7asdfkjha&pubkey=GAU2ZSYYEYO5S5ZQSMMUENJ2TANY4FPXYGGIMU6GMGKTNVDG5QYFW6JS&msg=order%20number%2024",
      ).result,
    ).toBe(false);
    expect(
      isValidSep7Uri(
        "aaa+stellar:tx?xdr=AAAAAP%2Byw%2BZEuNg533pUmwlYxfrq6%2FBoMJqiJ8vuQhf6rHWmAAAAZAB8NHAAAAABAAAAAAAAAAAAAAABAAAAAAAAAAYAAAABSFVHAAAAAABAH0wIyY3BJBS2qHdRPAV80M8hF7NBpxRjXyjuT9kEbH%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FAAAAAAAAAAA%3D&replace=sourceAccount%3AX%3BX%3Aaccount%20on%20which%20to%20create%20the%20trustline",
      ).result,
    ).toBe(false);
    expect(
      isValidSep7Uri(
        "web+steIIar:pay?destination=GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO&amount=120.1234567&memo=skdjfasf&memo_type=MEMO_TEXT&msg=pay%20me%20with%20lumens",
      ).result,
    ).toBe(false);
    expect(
      isValidSep7Uri(
        "web+stellarr:pay?destination=GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO&amount=120.123&asset_code=USD&asset_issuer=GCRCUE2C5TBNIPYHMEP7NK5RWTT2WBSZ75CMARH7GDOHDDCQH3XANFOB&memo=hasysda987fs&memo_type=MEMO_TEXT&callback=url%3Ahttps%3A%2F%2FsomeSigningService.com%2Fhasysda987fs%3Fasset%3DUSD",
      ).result,
    ).toBe(false);

    expect(isValidSep7Uri("not-a-stellar-uri:tx?xdr=").result).toBe(false);
    expect(isValidSep7Uri("not-a-stellar-uri:pay?destination=").result).toBe(
      false,
    );
    expect(isValidSep7Uri("aaa+stellar:tx?xdr=").result).toBe(false);
    expect(isValidSep7Uri("web+steIIar:pay?destination=").result).toBe(false);
  });

  it("parseSep7Uri(uri) parses a 'tx' operation uri", () => {
    expect(
      parseSep7Uri(
        "web+stellar:tx?xdr=AAAAAP%2Byw%2BZEuNg533pUmwlYxfrq6%2FBoMJqiJ8vuQhf6rHWmAAAAZAB8NHAAAAABAAAAAAAAAAAAAAABAAAAAAAAAAYAAAABSFVHAAAAAABAH0wIyY3BJBS2qHdRPAV80M8hF7NBpxRjXyjuT9kEbH%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FAAAAAAAAAAA%3D&callback=url%3Ahttps%3A%2F%2FsomeSigningService.com%2Fa8f7asdfkjha&pubkey=GAU2ZSYYEYO5S5ZQSMMUENJ2TANY4FPXYGGIMU6GMGKTNVDG5QYFW6JS&msg=order%20number%2024",
      ),
    ).toBeInstanceOf(Sep7Tx);
    expect(
      parseSep7Uri(
        "web+stellar:tx?xdr=AAAAAP%2Byw%2BZEuNg533pUmwlYxfrq6%2FBoMJqiJ8vuQhf6rHWmAAAAZAB8NHAAAAABAAAAAAAAAAAAAAABAAAAAAAAAAYAAAABSFVHAAAAAABAH0wIyY3BJBS2qHdRPAV80M8hF7NBpxRjXyjuT9kEbH%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FAAAAAAAAAAA%3D&replace=sourceAccount%3AX%3BX%3Aaccount%20on%20which%20to%20create%20the%20trustline",
      ),
    ).toBeInstanceOf(Sep7Tx);
  });

  it("parseSep7Uri(uri) parses a 'pay' operation uri", () => {
    expect(
      parseSep7Uri(
        "web+stellar:pay?destination=GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO&amount=120.1234567&memo=skdjfasf&memo_type=MEMO_TEXT&msg=pay%20me%20with%20lumens",
      ),
    ).toBeInstanceOf(Sep7Pay);
    expect(
      parseSep7Uri(
        "web+stellar:pay?destination=GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO&amount=120.123&asset_code=USD&asset_issuer=GCRCUE2C5TBNIPYHMEP7NK5RWTT2WBSZ75CMARH7GDOHDDCQH3XANFOB&memo=hasysda987fs&memo_type=MEMO_TEXT&callback=url%3Ahttps%3A%2F%2FsomeSigningService.com%2Fhasysda987fs%3Fasset%3DUSD",
      ),
    ).toBeInstanceOf(Sep7Pay);
  });

  it("parseSep7Uri(uri) throws an error when it is not a valid stellar uri", () => {
    const uri = "not-a-stellar-uri:tx";

    try {
      const sep7Uri = parseSep7Uri(uri);
      expect(sep7Uri).toBeUndefined();
    } catch (error) {
      expect(error).toBeInstanceOf(Sep7InvalidUriError);
    }
  });

  it("sep7ReplacementsFromString() parses it successfully", () => {
    const str =
      "sourceAccount:X,operations[0].sourceAccount:Y,operations[1].destination:Y;X:account from where you want to pay fees,Y:account that needs the trustline and which will receive the new tokens";
    const replacements = sep7ReplacementsFromString(str);

    expect(replacements[0].id).toBe("X");
    expect(replacements[0].path).toBe("sourceAccount");
    expect(replacements[0].hint).toBe(
      "account from where you want to pay fees",
    );

    expect(replacements[1].id).toBe("Y");
    expect(replacements[1].path).toBe("operations[0].sourceAccount");
    expect(replacements[1].hint).toBe(
      "account that needs the trustline and which will receive the new tokens",
    );

    expect(replacements[2].id).toBe("Y");
    expect(replacements[2].path).toBe("operations[1].destination");
    expect(replacements[2].hint).toBe(
      "account that needs the trustline and which will receive the new tokens",
    );
  });

  it("sep7ReplacementsToString outputs the right string", () => {
    const expected =
      "sourceAccount:X,operations[0].sourceAccount:Y,operations[1].destination:Y;X:account from where you want to pay fees,Y:account that needs the trustline and which will receive the new tokens";
    const replacements = [
      {
        id: "X",
        path: "sourceAccount",
        hint: "account from where you want to pay fees",
      },
      {
        id: "Y",
        path: "operations[0].sourceAccount",
        hint: "account that needs the trustline and which will receive the new tokens",
      },
      {
        id: "Y",
        path: "operations[1].destination",
        hint: "account that needs the trustline and which will receive the new tokens",
      },
    ];

    const actual = sep7ReplacementsToString(replacements);
    expect(actual).toBe(expected);
  });
});
