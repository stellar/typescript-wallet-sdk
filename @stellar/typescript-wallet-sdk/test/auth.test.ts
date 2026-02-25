import { sign, decode } from "jws";
import {
  Keypair,
  Account,
  Asset,
  Networks,
  StellarToml,
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

  const buildChallengeXdr = ({
    serverKeypair,
    clientKeypair,
    challengeHomeDomain = homeDomain,
    addPaymentOperation = false,
  }: {
    serverKeypair: Keypair;
    clientKeypair: Keypair;
    challengeHomeDomain?: string;
    addPaymentOperation?: boolean;
  }): string => {
    const serverAccount = new Account(serverKeypair.publicKey(), "-1");
    const value = randomBytes(48).toString("base64");

    const builder = new SdkTransactionBuilder(serverAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: `${challengeHomeDomain} auth`,
          value,
          source: clientKeypair.publicKey(),
        }),
      )
      .addOperation(
        Operation.manageData({
          name: "web_auth_domain",
          value: webAuthDomain,
          source: serverAccount.accountId(),
        }),
      );

    if (addPaymentOperation) {
      builder.addOperation(
        Operation.payment({
          destination: serverKeypair.publicKey(),
          asset: Asset.native(),
          amount: "1",
        }),
      );
    }

    const challengeTx = builder.setTimeout(300).build();
    challengeTx.sign(serverKeypair);
    return challengeTx.toXDR();
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

  const setupSep10 = ({
    serverSigningKey,
    challengeXdr,
    token,
  }: {
    serverSigningKey: string;
    challengeXdr: string;
    token: string;
  }) => {
    const httpClient = axios.create();
    sinon.stub(httpClient, "get").resolves({
      data: {
        transaction: challengeXdr,
        network_passphrase: networkPassphrase,
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

  afterEach(() => {
    sinon.restore();
  });

  it("should accept a valid challenge transaction", async () => {
    const serverKeypair = Keypair.random();
    const clientKeypair = Keypair.random();
    const accountKp = SigningKeypair.fromSecret(clientKeypair.secret());
    const challengeXdr = buildChallengeXdr({
      serverKeypair,
      clientKeypair,
    });
    const token = createJwt(clientKeypair);

    const { sep10 } = setupSep10({
      serverSigningKey: serverKeypair.publicKey(),
      challengeXdr,
      token,
    });

    const authToken = await sep10.authenticate({ accountKp });

    expect(authToken.account).toBe(clientKeypair.publicKey());
  });

  it("should reject a challenge signed by the wrong server key", async () => {
    const serverKeypair = Keypair.random();
    const clientKeypair = Keypair.random();
    const accountKp = SigningKeypair.fromSecret(clientKeypair.secret());
    const challengeXdr = buildChallengeXdr({
      serverKeypair,
      clientKeypair,
    });
    const token = createJwt(clientKeypair);

    const { sep10, postStub } = setupSep10({
      serverSigningKey: Keypair.random().publicKey(),
      challengeXdr,
      token,
    });

    await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
      ChallengeValidationFailedError,
    );
    expect(postStub.notCalled).toBe(true);
  });

  it("should reject a challenge containing a non-manageData operation", async () => {
    const serverKeypair = Keypair.random();
    const clientKeypair = Keypair.random();
    const accountKp = SigningKeypair.fromSecret(clientKeypair.secret());
    const challengeXdr = buildChallengeXdr({
      serverKeypair,
      clientKeypair,
      addPaymentOperation: true,
    });
    const token = createJwt(clientKeypair);

    const { sep10, postStub } = setupSep10({
      serverSigningKey: serverKeypair.publicKey(),
      challengeXdr,
      token,
    });

    await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
      ChallengeValidationFailedError,
    );
    expect(postStub.notCalled).toBe(true);
  });

  it("should skip validation and succeed when no serverSigningKey is provided", async () => {
    const serverKeypair = Keypair.random();
    const clientKeypair = Keypair.random();
    const accountKp = SigningKeypair.fromSecret(clientKeypair.secret());
    const challengeXdr = buildChallengeXdr({
      serverKeypair,
      clientKeypair,
    });
    const token = createJwt(clientKeypair);

    const httpClient = axios.create();
    sinon.stub(httpClient, "get").resolves({
      data: {
        transaction: challengeXdr,
        network_passphrase: networkPassphrase,
      },
    });
    sinon.stub(httpClient, "post").resolves({
      data: { token },
    });

    const sep10 = new Sep10({
      cfg,
      webAuthEndpoint,
      homeDomain,
      httpClient,
    });

    const authToken = await sep10.authenticate({ accountKp });
    expect(authToken.account).toBe(clientKeypair.publicKey());
  });

  it("should reject a challenge with the wrong home domain", async () => {
    const serverKeypair = Keypair.random();
    const clientKeypair = Keypair.random();
    const accountKp = SigningKeypair.fromSecret(clientKeypair.secret());
    const challengeXdr = buildChallengeXdr({
      serverKeypair,
      clientKeypair,
      challengeHomeDomain: "malicious.stellar.org",
    });
    const token = createJwt(clientKeypair);

    const { sep10, postStub } = setupSep10({
      serverSigningKey: serverKeypair.publicKey(),
      challengeXdr,
      token,
    });

    await expect(sep10.authenticate({ accountKp })).rejects.toThrow(
      ChallengeValidationFailedError,
    );
    expect(postStub.notCalled).toBe(true);
  });
});

describe("Anchor.sep10() signing key handling", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should succeed when TOML has no SIGNING_KEY", async () => {
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

    const sep10 = await anchor.sep10();
    expect(sep10).toBeDefined();
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
