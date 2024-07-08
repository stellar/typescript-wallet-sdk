import { Networks, Transaction, WebAuth } from "@stellar/stellar-sdk";

import { freighterHandler } from "./Handlers/freighter";
import { albedoHandler } from "./Handlers/albedo";
import { ledgerHandler } from "./Handlers/ledger";
import { plaintextKeyHandler } from "./Handlers/plaintextKey";
// TODO - fix trezor errors
// import { trezorHandler } from "./Handlers/trezor";

import {
  EncryptedKey,
  Encrypter,
  GetAuthTokenParams,
  Key,
  KeyMetadata,
  KeyStore,
  KeyTypeHandler,
  KeyType,
  KeyManagerParams,
  StoreKeyParams,
  SignTransactionParams,
  ChangePasswordParams,
} from "./Types";

export class KeyManager {
  private encrypterMap: { [key: string]: Encrypter };
  private keyStore: KeyStore;
  private keyHandlerMap: { [key: string]: KeyTypeHandler };
  private keyCache: { [id: string]: Key };
  private shouldCache: boolean;
  private defaultNetworkPassphrase: string;

  constructor(params: KeyManagerParams) {
    this.encrypterMap = {};
    this.keyHandlerMap = {
      [KeyType.freighter]: freighterHandler,
      [KeyType.albedo]: albedoHandler,
      [KeyType.ledger]: ledgerHandler,
      [KeyType.plaintextKey]: plaintextKeyHandler,
      // TODO - fix trezor errors
      // [KeyType.trezor]: trezorHandler,
    };

    this.keyCache = {};

    this.keyStore = params.keyStore;
    this.shouldCache = params.shouldCache || false;

    this.defaultNetworkPassphrase =
      params.defaultNetworkPassphrase || Networks.PUBLIC;
  }

  /**
   * Register a KeyTypeHandler for a given key type.
   * @param {KeyTypeHandler} keyHandler - The key handler.
   */
  public registerKeyHandler(keyHandler: KeyTypeHandler) {
    this.keyHandlerMap[keyHandler.keyType] = keyHandler;
  }

  /**
   * Register a new encrypter.
   * @param {Encrypter} encrypter - The encrypter.
   */
  public registerEncrypter(encrypter: Encrypter) {
    this.encrypterMap[encrypter.name] = encrypter;
  }

  /**
   * Set the default network passphrase
   * @param {string} passphrase - The passphrase.
   */
  public setDefaultNetworkPassphrase(passphrase: string) {
    this.defaultNetworkPassphrase = passphrase;
  }

  /**
   * Stores a key in the keyStore after encrypting it with the encrypterName.
   *
   * @async
   * @param {StoreKeyParams} params - The store key params.
   * @param {Key | UnstoredKey} params.key Key object to store. an `id` field is optional; if you don't
   * provide one, we'll generate a random number. The id will be used to read,
   * change, update, and delete keys.
   * @param {string} params.password encrypt key with this as the secret
   * @param {string} params.encrypterName encryption algorithm to use (must have been
   * registered)
   *
   * @returns {Promise<KeyMetadata>} The metadata of the key
   */
  public async storeKey(params: StoreKeyParams): Promise<KeyMetadata> {
    const { key, password, encrypterName } = params;
    const id = key.id || `${Math.random()}`;

    const newKey: Key = {
      ...key,
      id,
    };

    const encrypter = this.encrypterMap[encrypterName];
    const encryptedKey = await encrypter.encryptKey({
      key: newKey,
      password,
    });
    const keyMetadata = await this.keyStore.storeKeys([encryptedKey]);

    this._writeIndexCache(newKey.id, newKey);

    return keyMetadata[0];
  }

  /**
   * Load and decrypt one key, given its id.
   * @param {string} id - the key id
   * @param {string} password - the key password
   * @returns {Key} Decrypted key
   */
  public async loadKey(id: string, password: string): Promise<Key> {
    const encryptedKeys: EncryptedKey[] = await this.keyStore.loadAllKeys();
    const keys = encryptedKeys.filter((k) => k.id === id);

    if (!keys.length) {
      throw new Error(`Key not found with id '${id}'.`);
    }

    if (keys.length > 1) {
      throw new Error(
        `Too many keys found with id '${id}', that’s not supposed to happen!`,
      );
    }

    const encryptedKey = keys[0];
    const encrypter = this.encrypterMap[encryptedKey.encrypterName];

    let key;

    try {
      key = await encrypter.decryptKey({
        encryptedKey,
        password,
      });
    } catch (e) {
      throw new Error(
        `Couldn’t decrypt key '${id}' with the supplied password.`,
      );
    }

    return key;
  }

  /**
   *  Get a list of all stored key ids.
   *
   * @returns {Array<string>} List of ids
   */
  public async loadAllKeyIds(): Promise<string[]> {
    const encryptedKeys: EncryptedKey[] = await this.keyStore.loadAllKeys();
    return encryptedKeys.map((key) => key.id);
  }

  /**
   *  Remove the key specified by this key id.
   *
   * @async
   * @param {string} id Specifies which key to remove.
   *    The id is computed as `sha1(private key + public key)`.
   * @returns {Promise<KeyMetadata | undefined>} Metadata of the removed key
   */
  public async removeKey(id: string): Promise<KeyMetadata | undefined> {
    const res = await this.keyStore.removeKey(id);
    this._writeIndexCache(id, undefined);
    return res;
  }

  /**
   * Sign a transaction using the specified key id. Supports both using a
   * cached key and going out to the keystore to read and decrypt
   *
   * @async
   * @param {SignTransactionParams} params - the sign transaction params
   * @param {Transaction} params.transaction - transaction Transaction object to sign
   * @param {string} params.id - Key to sign with. The id is computed as
   *    `sha1(private key + public key)`.
   * @param {string} params.password - the key password
   * @param {{[key: string]: any}} [params.custom] - custom arguments
   * @returns {Promise<Transaction>} Signed transaction
   */
  public async signTransaction(
    params: SignTransactionParams,
  ): Promise<Transaction> {
    const { transaction, id, password, custom } = params;
    let key = this._readFromCache(id);

    if (!key) {
      const encryptedKey = await this.keyStore.loadKey(id);

      if (!encryptedKey) {
        throw new Error(
          `Couldn't sign the transaction: no key with id '${id}' found.`,
        );
      }

      const encrypter = this.encrypterMap[encryptedKey.encrypterName];
      key = await encrypter.decryptKey({ encryptedKey, password });
      this._writeIndexCache(id, key);
    }

    const keyHandler = this.keyHandlerMap[key.type];
    const signedTransaction = await keyHandler.signTransaction({
      transaction,
      key,
      custom,
    });
    return signedTransaction;
  }

  // tslint:disable max-line-length
  /**
   * Request an auth token from auth server, which can be used to deposit and
   * withdraw auth-required tokens.
   *
   * Under the hood, it fetches a transaction from the auth server, signs that
   * transaction with the user's key, and returns that transaction for a JWT.
   *
   * https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
   *
   * @async
   * @param {object} params Params object.
   * @param {string} params.id The user's key to authenticate. The id is
   *                           computed as `sha1(private key + public key)`.
   * @param {string} params.password The password that will decrypt that secret.
   * @param {string} params.authServer The URL of the authentication server.
   * @param {Array} params.authServerHomeDomains The home domain(s) of the
   *                                             authentication server.
   * @param {string} params.authServerKey Check the challenge transaction
   *                                      for this key as source and signature.
   * @param {string} params.clientDomain A domain hosting a SEP-1 stellar.toml
   * containing a SIGNING_KEY used for verifying the client domain. This will
   * be used as the 'client_domain' param on the GET /authServer request.
   * @param {string} params.homeDomain Servers that generate tokens for multiple
   * Home Domains can use this parameter to identify which home domain the Client
   * hopes to authenticate with. This will be used as the 'home_domain' param
   * on the GET /authServer request.
   * @param {Function} params.onChallengeTransactionSignature When
   * `params.clientDomain` is set, you need to provide a function that will add
   * the signature identified by the SIGNING_KEY present on your client domain's
   * toml file.
   * @param {string} [params.account] The authenticating public key. If not
   * provided, then the signers's public key will be used instead.
   * @returns {Promise<string>} authToken JWT.
   */
  // tslint:enable max-line-length
  public async fetchAuthToken(params: GetAuthTokenParams): Promise<string> {
    const {
      id,
      password,
      authServer,
      authServerKey,
      challengeToken,
      authServerHomeDomains,
      clientDomain,
      homeDomain,
      onChallengeTransactionSignature = (tx: Transaction) =>
        Promise.resolve(tx),
    } = params;

    let { account } = params;

    // throw errors for missing params
    if (id === undefined) {
      throw new Error("Required parameter `id` is missing!");
    }
    if (password === undefined) {
      throw new Error("Required parameter `password` is missing!");
    }
    if (!authServer) {
      throw new Error("Required parameter `authServer` is missing!");
    }
    if (!authServerKey) {
      throw new Error("Required parameter `authServerKey` is missing!");
    }
    if (!authServerHomeDomains) {
      throw new Error("Required parameter `authServerHomeDomains` is missing!");
    }

    let key = this._readFromCache(id);

    if (!key) {
      const encryptedKey = await this.keyStore.loadKey(id);

      if (!encryptedKey) {
        throw new Error(
          `Couldn't fetch an auth token: no key with id '${id}' found.`,
        );
      }

      const encrypter = this.encrypterMap[encryptedKey.encrypterName];
      key = await encrypter.decryptKey({ encryptedKey, password });
      this._writeIndexCache(id, key);
    }

    // If no account has been provided, assume that the signer is the target
    // account.
    account = account || key.publicKey;

    let challengeUrl = `${authServer}?account=${encodeURIComponent(account)}`;

    if (clientDomain) {
      challengeUrl += `&client_domain=${encodeURIComponent(clientDomain)}`;
    }

    if (homeDomain) {
      challengeUrl += `&home_domain=${encodeURIComponent(homeDomain)}`;
    }

    let headers = {};
    if (challengeToken) {
      headers = { Authorization: `Bearer ${challengeToken}` };
    }

    const challengeRes = await fetch(challengeUrl, { headers });

    if (challengeRes.status !== 200) {
      const challengeText = await challengeRes.text();
      throw new Error(
        `[KeyManager#fetchAuthToken] Failed to fetch a challenge transaction,
          error: ${JSON.stringify(challengeText)}`,
      );
    }

    const keyNetwork = key.network || this.defaultNetworkPassphrase;

    const text = await challengeRes.text();

    let json;

    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(`Request for challenge returned invalid JSON: ${text}`);
    }

    if (json.error) {
      throw new Error(json.error);
    }

    // Throw error when network_passphrase is returned, and doesn't match
    if (
      json.network_passphrase !== undefined &&
      keyNetwork !== json.network_passphrase
    ) {
      throw new Error(
        `Network mismatch: the transfer server expects "${json.network_passphrase}", but you're using "${keyNetwork}"`,
      );
    }

    let transaction = WebAuth.readChallengeTx(
      json.transaction,
      authServerKey,
      keyNetwork,
      authServerHomeDomains,
      new URL(authServer).hostname,
    ).tx;

    // Add extra signatures.
    // By default, the input transaction is returned as it is.
    transaction = await onChallengeTransactionSignature(transaction);

    const keyHandler = this.keyHandlerMap[key.type];

    const signedTransaction = await keyHandler.signTransaction({
      transaction,
      key,
    });

    const signedTransactionXDR: string = signedTransaction
      .toEnvelope()
      .toXDR()
      .toString("base64");

    const responseRes = await fetch(authServer, {
      method: "POST",
      body: JSON.stringify({
        transaction: signedTransactionXDR,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (responseRes.status !== 200) {
      const responseText = await responseRes.text();
      try {
        const responseJson = JSON.parse(responseText);
        throw new Error(
          `[KeyManager#fetchAuthToken] Failed to return a signed transaction,
          error: ${responseJson.error}`,
        );
      } catch (e) {
        throw new Error(
          `[KeyManager#fetchAuthToken] Failed to return a signed transaction,
          error code ${responseRes.status} and status text
          "${responseText}"`,
        );
      }
    }

    const responseResText = await responseRes.text();

    try {
      const { token, message, status } = JSON.parse(responseResText);
      // if we get a false status message, error out
      if (status === false && message) {
        throw new Error(message);
      }

      return token;
    } catch (e) {
      throw new Error(
        `[KeyManager#fetchAuthToken] Failed to validate signed transaction
        response, server responded with ${responseResText}`,
      );
    }
  }

  /**
   * Update the stored keys to be encrypted with the new password.
   *
   * @async
   * @param {ChangePasswordParams} params - the change password params
   * @param {string} params.oldPassword - the user's old password
   * @param {string} params.newPassword - the user's new password
   * @returns {Promise<KeyMetadata[]>} the key meta data
   */
  public async changePassword(
    params: ChangePasswordParams,
  ): Promise<KeyMetadata[]> {
    const { oldPassword, newPassword } = params;
    const oldKeys = await this.keyStore.loadAllKeys();
    const newKeys = await Promise.all(
      oldKeys.map(async (encryptedKey: EncryptedKey) => {
        const encrypter = this.encrypterMap[encryptedKey.encrypterName];
        const decryptedKey = await encrypter.decryptKey({
          encryptedKey,
          password: oldPassword,
        });

        this._writeIndexCache(decryptedKey.id, decryptedKey);

        return encrypter.encryptKey({
          key: decryptedKey,
          password: newPassword,
        });
      }),
    );

    return this.keyStore.updateKeys(newKeys);
  }

  private _readFromCache(id: string): Key | undefined {
    if (!this.shouldCache) {
      return undefined;
    }

    return this.keyCache[id];
  }

  private _writeIndexCache(id: string, key: Key | undefined) {
    if (this.shouldCache && key) {
      this.keyCache[id] = key;
    }
  }
}
