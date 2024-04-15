import { AxiosInstance } from "axios";
import { StrKey } from "@stellar/stellar-sdk";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
import base64url from "base64url";

import { SigningKeypair } from "../Horizon/Account";
import { DefaultClient } from "../";
import { AuthHeaderClaims, AuthHeaderCreateTokenParams } from "../Types";
import {
  AuthHeaderSigningKeypairRequiredError,
  AuthHeaderClientDomainRequiredError,
} from "../Exceptions";

export interface AuthHeaderSigner {
  createToken({
    claims,
    clientDomain,
    issuer,
  }: AuthHeaderCreateTokenParams): Promise<string>;
}

/**
 * Signer for signing JWT for GET /Auth with a custodial private key
 *
 * @class
 */
export class DefaultAuthHeaderSigner implements AuthHeaderSigner {
  expiration: number;

  constructor(expiration: number = 900) {
    this.expiration = expiration;
  }

  /**
   * Create a signed JWT for the auth header
   * @constructor
   * @param {AuthHeaderCreateTokenParams} params - The create token parameters
   * @param {AuthHeaderClaims} params.claims - the data to be signed in the JWT
   * @param {string} [params.clientDomain] - the client domain hosting SEP-1 toml
   * @param {AccountKeypair} [params.issuer] - the account signing the JWT
   * @returns {Promise<string>} The signed JWT
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async createToken({
    claims,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    clientDomain,
    issuer,
  }: AuthHeaderCreateTokenParams): Promise<string> {
    if (!(issuer instanceof SigningKeypair)) {
      throw new AuthHeaderSigningKeypairRequiredError();
    }

    const issuedAt = claims.iat || Math.floor(Date.now() / 1000);
    const timeExp =
      claims.exp || Math.floor(Date.now() / 1000) + this.expiration;

    // turn stellar kp into nacl kp for creating JWT
    const rawSeed = StrKey.decodeEd25519SecretSeed(issuer.secretKey);
    const naclKP = nacl.sign.keyPair.fromSeed(rawSeed);

    // encode JWT message
    const header = { alg: "EdDSA" };
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(
      JSON.stringify({ ...claims, exp: timeExp, iat: issuedAt }),
    );

    // sign JWT and create signature
    const signature = nacl.sign.detached(
      naclUtil.decodeUTF8(`${encodedHeader}.${encodedPayload}`),
      naclKP.secretKey,
    );
    const encodedSignature = base64url(Buffer.from(signature));

    const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
    return jwt;
  }
}

/**
 * Signer for signing JWT for GET /Auth using a remote server to sign.
 *
 * @class
 */
export class DomainAuthHeaderSigner implements AuthHeaderSigner {
  signerUrl: string;
  expiration: number;
  httpClient: AxiosInstance;

  constructor(
    signerUrl: string,
    expiration: number = 900,
    httpClient?: AxiosInstance,
  ) {
    this.signerUrl = signerUrl;
    this.expiration = expiration;
    this.httpClient = httpClient || DefaultClient;
  }

  /**
   * Create a signed JWT for the auth header by using a remote server to sign the JWT
   * @constructor
   * @param {AuthHeaderCreateTokenParams} params - The create token parameters
   * @param {AuthHeaderClaims} params.claims - the data to be signed in the JWT
   * @param {string} [params.clientDomain] - the client domain hosting SEP-1 toml
   * @param {AccountKeypair} [params.issuer] - unused, will not be used to sign
   * @returns {Promise<string>} The signed JWT
   */
  async createToken({
    claims,
    clientDomain,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    issuer,
  }: AuthHeaderCreateTokenParams): Promise<string> {
    if (!clientDomain) {
      throw new AuthHeaderClientDomainRequiredError();
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const expiration = Math.floor(Date.now() / 1000) + this.expiration;

    return await this.signTokenRemote({
      claims,
      clientDomain,
      expiration,
      issuedAt,
    });
  }

  /**
   * Sign JWT by calling a remote server
   * @constructor
   * @param {SignTokenRemoteParams} params - the sign token params
   * @param {AuthHeaderClaims} params.claims - the data to be signed in the JWT
   * @param {string} params.clientDomain - the client domain hosting SEP-1 toml
   * @param {number} params.expiration - when the token should expire
   * @param {number} params.issuedAt - when the token was created
   * @returns {Promise<string>} The signed JWT
   */
  async signTokenRemote({
    claims,
    clientDomain,
    expiration,
    issuedAt,
  }: {
    claims: AuthHeaderClaims;
    clientDomain: string;
    expiration: number;
    issuedAt: number;
  }): Promise<string> {
    const resp = await this.httpClient.post(this.signerUrl, {
      clientDomain,
      expiration,
      issuedAt,
      ...claims,
    });

    return resp.data.token;
  }
}
