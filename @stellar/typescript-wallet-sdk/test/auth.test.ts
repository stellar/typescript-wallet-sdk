import { sign, decode } from "jws";
import {
  Keypair,
  Account,
  Asset,
  Memo,
  MuxedAccount,
  Networks,
  StellarToml,
  Transaction,
  TransactionBuilder as SdkTransactionBuilder,
  Operation,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { randomBytes } from "crypto";
import axios from "axios";
import sinon from "sinon";

import { validateToken, Sep10 } from "../src/walletSdk/Auth";
import {
  Config,
  StellarConfiguration,
  ApplicationConfiguration,
} from "../src/walletSdk";
import { Anchor } from "../src/walletSdk/Anchor";
import { SigningKeypair } from "../src/walletSdk/Horizon/Account";
import {
  InvalidTokenError,
  ExpiredTokenError,
  ChallengeValidationFailedError,
  NetworkPassphraseMismatchError,
  MissingSigningKeyError,
} from "../src/walletSdk/Exceptions";

const createToken = (payload: Record<string, unknown>): string => {
  return sign({
    header: { alg: "HS256", typ: "JWT" },
    payload,
    secret: "test-secret",
  });
};

describe("jws.decode return structure", () => {
  // In SEP-10, authentication happens via Stellar transaction signing, not JWT
  // signature verification. The JWT is a bearer token issued by the anchor after
  // the wallet proves ownership of its Stellar account. The SDK only decodes the
  // payload to read claims (exp, iss, sub) — verifying the JWT signature
  // client-side is not part of the SEP-10 trust model.
  it("should expose SEP-10 claims via payload, not as top-level properties", () => {
    const token = createToken({
      iss: "https://anchor.example.com",
      sub: "GABC1234",
      iat: 1700000000,
      exp: 1700003600,
      client_domain: "wallet.example.com",
    });
    const decoded = decode(token);

    expect(decoded).toHaveProperty("header");
    expect(decoded).toHaveProperty("payload");

    expect(decoded.payload.exp).toBe(1700003600);
    expect(decoded.payload.iss).toBe("https://anchor.example.com");
    expect(decoded.payload.sub).toBe("GABC1234");
    expect(decoded.payload.iat).toBe(1700000000);
    expect(decoded.payload.client_domain).toBe("wallet.example.com");
  });
});

describe("validateToken", () => {
  it("should accept a valid, non-expired token", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = createToken({
      iss: "https://anchor.example.com",
      sub: "GABC1234",
      iat: Math.floor(Date.now() / 1000),
      exp: futureExp,
    });

    expect(() => validateToken(token)).not.toThrow();
  });

  it("should throw ExpiredTokenError for an expired token", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const token = createToken({
      iss: "https://anchor.example.com",
      sub: "GABC1234",
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: pastExp,
    });

    expect(() => validateToken(token)).toThrow(ExpiredTokenError);
  });

  it("should throw ExpiredTokenError for a token with exp=1", () => {
    const token = createToken({
      iss: "https://anchor.example.com",
      sub: "GABC1234",
      exp: 1,
    });

    expect(() => validateToken(token)).toThrow(ExpiredTokenError);
  });

  it("should throw ExpiredTokenError for a token with exp=0", () => {
    const token = createToken({
      iss: "https://anchor.example.com",
      sub: "GABC1234",
      exp: 0,
    });

    expect(() => validateToken(token)).toThrow(ExpiredTokenError);
  });

  it("should throw InvalidTokenError for a malformed token", () => {
    expect(() => validateToken("not-a-valid-jwt")).toThrow(InvalidTokenError);
  });

  it("should throw InvalidTokenError for an empty string", () => {
    expect(() => validateToken("")).toThrow(InvalidTokenError);
  });

  it("should accept a token without an exp claim", () => {
    const token = createToken({
      iss: "https://anchor.example.com",
      sub: "GABC1234",
    });

    expect(() => validateToken(token)).not.toThrow();
  });
});

describe("Sep10 challenge validation", () => {
  const homeDomain = "testanchor.stellar.org";
  const webAuthEndpoint = "https://testanchor.stellar.org/auth";
  const networkPassphrase = Networks.TESTNET;
  const webAuthDomain = new URL(webAuthEndpoint).hostname;
  const cfg = new Config({
    stellarConfiguration: StellarConfiguration.TestNet(),
    applicationConfiguration: new ApplicationConfiguration(),
  });

  /*
   * Flexible challenge transaction builder for testing each validation check.
   *
   * Builds a SEP-10 challenge transaction with configurable properties so each
   * test can violate exactly one validation rule while keeping everything else
   * correct.
   */
  const buildChallenge = ({
    serverKeypair = Keypair.random(),
    clientKeypair = Keypair.random(),
    clientSource,
    challengeHomeDomain = homeDomain,
    sequence = "-1",
    nonce = randomBytes(48).toString("base64"),
    omitNonce = false,
    memo,
    useExplicitTimebounds = false,
    minTime = 0,
    maxTime = 0,
    timeout = 300,
    firstOpType = "manageData" as string,
    omitFirstOpSource = false,
    includeWebAuthDomain = true,
    webAuthDomainValue = webAuthDomain,
    additionalOps = [] as any[],
    shouldSign = true,
  }: {
    serverKeypair?: Keypair;
    clientKeypair?: Keypair;
    clientSource?: string;
    challengeHomeDomain?: string;
    sequence?: string;
    nonce?: string;
    omitNonce?: boolean;
    memo?: any;
    useExplicitTimebounds?: boolean;
    minTime?: number;
    maxTime?: number;
    timeout?: number;
    firstOpType?: string;
    omitFirstOpSource?: boolean;
    includeWebAuthDomain?: boolean;
    webAuthDomainValue?: string | null;
    additionalOps?: any[];
    shouldSign?: boolean;
  } = {}) => {
    const serverAccount = new Account(serverKeypair.publicKey(), sequence);

    const builderOpts: any = {
      fee: BASE_FEE,
      networkPassphrase,
    };
    if (memo) {
      builderOpts.memo = memo;
    }
    if (useExplicitTimebounds) {
      builderOpts.timebounds = { minTime, maxTime };
    }

    const builder = new SdkTransactionBuilder(serverAccount, builderOpts);

    if (firstOpType === "payment") {
      builder.addOperation(
        Operation.payment({
          destination: serverKeypair.publicKey(),
          asset: Asset.native(),
          amount: "1",
          ...(omitFirstOpSource
            ? {}
            : { source: clientSource ?? clientKeypair.publicKey() }),
        }),
      );
    } else if (firstOpType === "manageData") {
      const mdOpts: any = {
        name: `${challengeHomeDomain} auth`,
      };
      if (omitNonce) {
        mdOpts.value = null;
      } else {
        mdOpts.value = nonce;
      }
      if (!omitFirstOpSource) {
        mdOpts.source = clientSource ?? clientKeypair.publicKey();
      }
      builder.addOperation(Operation.manageData(mdOpts));
    }
    if (includeWebAuthDomain) {
      const waOpts: any = {
        name: "web_auth_domain",
        source: serverAccount.accountId(),
      };
      if (webAuthDomainValue === null) {
        waOpts.value = null;
      } else {
        waOpts.value = webAuthDomainValue;
      }
      builder.addOperation(Operation.manageData(waOpts));
    }

    for (const op of additionalOps) {
      builder.addOperation(op);
    }

    if (!useExplicitTimebounds) {
      builder.setTimeout(timeout);
    }

    const tx = builder.build();
    if (shouldSign) {
      tx.sign(serverKeypair);
    }

    return { xdr: tx.toXDR(), serverKeypair, clientKeypair };
  };

  const setupSep10 = ({
    serverSigningKey,
    challengeXdr,
    token,
    responseNetworkPassphrase = networkPassphrase,
  }: {
    serverSigningKey: string;
    challengeXdr: string;
    token: string;
    responseNetworkPassphrase?: string;
  }) => {
    const httpClient = axios.create();
    sinon.stub(httpClient, "get").resolves({
      data: {
        transaction: challengeXdr,
        network_passphrase: responseNetworkPassphrase,
      },
    });
    const postStub = sinon.stub(httpClient, "post").resolves({
      data: { token },
    });

    const sep10 = new Sep10({
      cfg,
      webAuthEndpoint,
      homeDomain,
      httpClient,
      serverSigningKey,
    });

    return { sep10, postStub };
  };

  const createJwt = (clientKeypair: Keypair): string => {
    const now = Math.floor(Date.now() / 1000);
    return createToken({
      iss: webAuthEndpoint,
      sub: clientKeypair.publicKey(),
      iat: now,
      exp: now + 3600,
    });
  };

  afterEach(() => {
    sinon.restore();
  });

  // ============================================================
  // WITH serverSigningKey — uses WebAuth.readChallengeTx from SDK
  // ============================================================
  describe("with serverSigningKey", () => {
    const authenticateWithKey = (
      challengeXdr: string,
      serverPublicKey: string,
      clientKeypair: Keypair,
    ) => {
      const accountKp = SigningKeypair.fromSecret(clientKeypair.secret());
      const token = createJwt(clientKeypair);
      const { sep10, postStub } = setupSep10({
        serverSigningKey: serverPublicKey,
        challengeXdr,
        token,
      });
      return { sep10, accountKp, postStub };
    };

    it("should accept a valid challenge", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge();
      const { sep10, accountKp } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      const authToken = await sep10.authenticate({ accountKp });
      expect(authToken.account).toBe(clientKeypair.publicKey());
    });

    it("should reject when signed by wrong server key", async () => {
      const { xdr, clientKeypair } = buildChallenge();
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        Keypair.random().publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject invalid XDR", async () => {
      const clientKeypair = Keypair.random();
      const { sep10, accountKp, postStub } = authenticateWithKey(
        "not-valid-xdr",
        Keypair.random().publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject a FeeBumpTransaction", async () => {
      const { xdr: innerXdr, serverKeypair, clientKeypair } = buildChallenge();
      const innerTx = new Transaction(innerXdr, networkPassphrase);
      const feeBump = SdkTransactionBuilder.buildFeeBumpTransaction(
        serverKeypair,
        BASE_FEE,
        innerTx,
        networkPassphrase,
      );
      feeBump.sign(serverKeypair);

      const { sep10, accountKp, postStub } = authenticateWithKey(
        feeBump.toXDR(),
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject non-zero sequence number", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge({
        sequence: "99",
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject a challenge with no operations", async () => {
      const serverKeypair = Keypair.random();
      const clientKeypair = Keypair.random();
      const serverAccount = new Account(serverKeypair.publicKey(), "-1");
      const tx = new SdkTransactionBuilder(serverAccount, {
        fee: BASE_FEE,
        networkPassphrase,
      })
        .setTimeout(300)
        .build();
      tx.sign(serverKeypair);

      const { sep10, accountKp, postStub } = authenticateWithKey(
        tx.toXDR(),
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject first operation without source account", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge({
        omitFirstOpSource: true,
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject memo with muxed client account", async () => {
      const clientKeypair = Keypair.random();
      const baseAccount = new Account(clientKeypair.publicKey(), "0");
      const muxed = new MuxedAccount(baseAccount, "123");

      const { xdr, serverKeypair } = buildChallenge({
        clientKeypair,
        clientSource: muxed.accountId(),
        memo: Memo.id("456"),
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject non-id memo type", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge({
        memo: Memo.text("test"),
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject first operation that is not manageData", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge({
        firstOpType: "payment",
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject infinite timebounds (maxTime=0)", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge({
        useExplicitTimebounds: true,
        minTime: 0,
        maxTime: 0,
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject expired timebounds", async () => {
      const now = Math.floor(Date.now() / 1000);
      const { xdr, serverKeypair, clientKeypair } = buildChallenge({
        useExplicitTimebounds: true,
        minTime: now - 7200,
        maxTime: now - 3600,
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject missing nonce value", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge({
        omitNonce: true,
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject wrong nonce length", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge({
        nonce: randomBytes(16).toString("base64"),
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject wrong home domain", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge({
        challengeHomeDomain: "evil.example.com",
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject subsequent non-manageData operation", async () => {
      const serverKeypair = Keypair.random();
      const { xdr, clientKeypair } = buildChallenge({
        serverKeypair,
        additionalOps: [
          Operation.payment({
            destination: serverKeypair.publicKey(),
            asset: Asset.native(),
            amount: "1",
          }),
        ],
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject null web_auth_domain value", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge({
        webAuthDomainValue: null,
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should reject mismatched web_auth_domain", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge({
        webAuthDomainValue: "evil.example.com",
      });
      const { sep10, accountKp, postStub } = authenticateWithKey(
        xdr,
        serverKeypair.publicKey(),
        clientKeypair,
      );
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        ChallengeValidationFailedError,
      );
      expect(postStub.notCalled).toBe(true);
    });
  });

  describe("network passphrase mismatch", () => {
    it("should reject when server returns a different network passphrase", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge();
      const accountKp = SigningKeypair.fromSecret(clientKeypair.secret());
      const now = Math.floor(Date.now() / 1000);
      const token = createToken({
        iss: webAuthEndpoint,
        sub: clientKeypair.publicKey(),
        iat: now,
        exp: now + 3600,
      });
      const { sep10, postStub } = setupSep10({
        serverSigningKey: serverKeypair.publicKey(),
        challengeXdr: xdr,
        token,
        responseNetworkPassphrase: Networks.PUBLIC,
      });
      await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
        NetworkPassphraseMismatchError,
      );
      expect(postStub.notCalled).toBe(true);
    });

    it("should accept when server returns matching network passphrase", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge();
      const accountKp = SigningKeypair.fromSecret(clientKeypair.secret());
      const now = Math.floor(Date.now() / 1000);
      const token = createToken({
        iss: webAuthEndpoint,
        sub: clientKeypair.publicKey(),
        iat: now,
        exp: now + 3600,
      });
      const { sep10 } = setupSep10({
        serverSigningKey: serverKeypair.publicKey(),
        challengeXdr: xdr,
        token,
        responseNetworkPassphrase: networkPassphrase,
      });
      const authToken = await sep10.authenticate({ accountKp });
      expect(authToken.account).toBe(clientKeypair.publicKey());
    });

    it("should accept when server omits network passphrase", async () => {
      const { xdr, serverKeypair, clientKeypair } = buildChallenge();
      const accountKp = SigningKeypair.fromSecret(clientKeypair.secret());
      const now = Math.floor(Date.now() / 1000);
      const token = createToken({
        iss: webAuthEndpoint,
        sub: clientKeypair.publicKey(),
        iat: now,
        exp: now + 3600,
      });
      const { sep10 } = setupSep10({
        serverSigningKey: serverKeypair.publicKey(),
        challengeXdr: xdr,
        token,
        responseNetworkPassphrase: undefined,
      });
      const authToken = await sep10.authenticate({ accountKp });
      expect(authToken.account).toBe(clientKeypair.publicKey());
    });
  });
});

describe("Anchor.sep10() signing key handling", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should throw MissingSigningKeyError when TOML has no SIGNING_KEY", async () => {
    sinon.stub(StellarToml.Resolver, "resolve").resolves({
      WEB_AUTH_ENDPOINT: "https://testanchor.stellar.org/auth",
      DOCUMENTATION: {},
    } as StellarToml.Api.StellarToml);

    const cfg = new Config({
      stellarConfiguration: StellarConfiguration.TestNet(),
      applicationConfiguration: new ApplicationConfiguration(),
    });

    const anchor = new Anchor({
      cfg,
      homeDomain: "testanchor.stellar.org",
      httpClient: axios.create(),
      language: "en",
    });

    await expect(anchor.sep10()).rejects.toThrow(MissingSigningKeyError);
  });

  it("should succeed when TOML has SIGNING_KEY", async () => {
    const serverKeypair = Keypair.random();

    sinon.stub(StellarToml.Resolver, "resolve").resolves({
      WEB_AUTH_ENDPOINT: "https://testanchor.stellar.org/auth",
      SIGNING_KEY: serverKeypair.publicKey(),
      DOCUMENTATION: {},
    } as StellarToml.Api.StellarToml);

    const cfg = new Config({
      stellarConfiguration: StellarConfiguration.TestNet(),
      applicationConfiguration: new ApplicationConfiguration(),
    });

    const anchor = new Anchor({
      cfg,
      homeDomain: "testanchor.stellar.org",
      httpClient: axios.create(),
      language: "en",
    });

    const sep10 = await anchor.sep10();
    expect(sep10).toBeDefined();
  });
});
