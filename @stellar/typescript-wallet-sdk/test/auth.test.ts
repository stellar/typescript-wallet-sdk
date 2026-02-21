import { sign, decode } from "jws";

import { validateToken } from "../src/walletSdk/Auth";
import {
  InvalidTokenError,
  ExpiredTokenError,
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
