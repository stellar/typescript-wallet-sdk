import { AxiosInstance } from "axios";
import { Transaction } from "@stellar/stellar-sdk";

import { Config } from "../";
import {
  AccountSigner,
  AccountThreshold,
  CommonBuilder,
  RecoverableAccountInfo,
  RecoverableWallet,
  RecoverableWalletConfig,
  RecoveryAccount,
  RecoveryAccountInfoMap,
  RecoveryAccountSigner,
  RecoveryAuthMap,
  RecoveryIdentityMap,
  RecoveryServerKey,
  RecoveryServerMap,
} from "../Types";
import { AccountRecover } from "./AccountRecover";
import { Sep10 } from "../Auth";
import {
  DeviceKeyEqualsMasterKeyError,
  DuplicateAccountSignerError,
  DuplicateRecoverySignerError,
  NoAccountAndNoSponsorError,
  NoAccountSignersError,
  RecoveryIdentityNotFoundError,
  RecoverySignerEqualsDeviceKeyError,
  ServerRequestFailedError,
  SignerKeyEqualsMasterKeyError,
} from "../Exceptions";
import {
  AccountKeypair,
  PublicKeypair,
  TransactionBuilder,
  SponsoringBuilder,
  Stellar,
} from "../Horizon";
import { camelToSnakeCaseObject } from "../Utils";

// Let's prevent exporting this constructor type as
// we should not create this Recovery class directly.
type RecoveryParams = {
  cfg: Config;
  stellar: Stellar;
  httpClient: AxiosInstance;
  servers: RecoveryServerMap;
};

/** A signer key paired with the recovery server that returned it. */
type EnrolledRecoverySigner = {
  serverKey: RecoveryServerKey;
  signerKey: string;
};

/**
 * Assert that a signer set can be installed as written.
 *
 * Stellar stores account signers as a set keyed by public key, and `SetOptions`
 * is an upsert rather than an append — it overwrites a repeated key instead of
 * summing the weights. A set containing the same address twice therefore
 * installs one signer, while the thresholds chosen for the intended set are
 * written alongside it regardless. Because the same transaction also removes
 * the master key, that mismatch is unrecoverable once submitted.
 * @param {string} accountAddress - Address of the account whose master key is being locked.
 * @param {AccountSigner[]} accountSigners - The signer set about to be installed.
 * @throws {DuplicateAccountSignerError} If any address appears more than once.
 * @throws {SignerKeyEqualsMasterKeyError} If any address is the account itself.
 * @returns {void}
 */
const validateAccountSigners = (
  accountAddress: string,
  accountSigners: AccountSigner[],
): void => {
  const seen: { [address: string]: true } = {};

  accountSigners.forEach(({ address }) => {
    const { publicKey } = address;

    if (publicKey === accountAddress) {
      throw new SignerKeyEqualsMasterKeyError(publicKey);
    }

    if (seen[publicKey]) {
      throw new DuplicateAccountSignerError(publicKey);
    }

    seen[publicKey] = true;
  });
};

/**
 * Used for Account Recovery using Sep-30.
 * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0030.md}
 * Do not create this object directly, use the Wallet class.
 * @class
 */
export class Recovery extends AccountRecover {
  private cfg: Config;

  /**
   * Creates a new instance of the Recovery class.
   * @constructor
   * @param {RecoveryParams} params - The params used for the Recovery instance.
   */
  constructor(params: RecoveryParams) {
    const { cfg, stellar, httpClient, servers } = params;
    super(stellar, httpClient, servers);
    this.cfg = cfg;
  }

  /**
   * Create new auth object to authenticate account with the recovery server using SEP-10.
   * @param {RecoveryServerKey} key - The key mapping to a recovery server.
   * @returns {Sep10} - The Sep-10 auth object.
   */
  sep10Auth(key: RecoveryServerKey): Sep10 {
    const server = this.getServer(key);
    return new Sep10({
      cfg: this.cfg,
      webAuthEndpoint: server.authEndpoint,
      homeDomain: server.homeDomain,
      httpClient: this.httpClient,
      serverSigningKey: server.signingKey,
    });
  }

  /**
   * Create new recoverable wallet using
   * [SEP-30](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0030.md). It
   * registers the account with recovery servers, adds recovery servers and device account as new
   * account signers, and sets threshold weights on the account.
   *
   * **Warning**: This transaction will lock master key of the account. Make sure you have access to
   * specified [RecoverableWalletConfig.deviceAddress]
   *
   * The returned transaction is unsigned — sign it with the account's master key and submit it
   * yourself. See [RecoverableWallet].
   *
   * The signer set returned by the recovery servers is validated before the transaction is built,
   * because the locking of the master key cannot be undone once it is submitted.
   *
   * This transaction can be sponsored.
   * @param {RecoverableWalletConfig} config - The configuration for recoverable wallet.
   * @throws {DeviceKeyEqualsMasterKeyError} If the device address is the account address.
   * @throws {DuplicateRecoverySignerError} If two or more recovery servers return the same signer key.
   * @throws {RecoverySignerEqualsDeviceKeyError} If a recovery server returns the device key.
   * @throws {SignerKeyEqualsMasterKeyError} If a recovery server returns the account's own key.
   * @returns {Promise<RecoverableWallet>} The wallet.
   */
  async createRecoverableWallet(
    config: RecoverableWalletConfig,
  ): Promise<RecoverableWallet> {
    if (config.deviceAddress.publicKey == config.accountAddress.publicKey) {
      throw new DeviceKeyEqualsMasterKeyError();
    }

    const enrolled = await this.enrollWithRecoveryServer(
      config.accountAddress,
      config.accountIdentity,
    );

    this.validateEnrolledSigners(enrolled, config.deviceAddress.publicKey);

    const recoverySigners = enrolled.map(({ signerKey }) => signerKey);

    const accountSigners: AccountSigner[] = recoverySigners.map((rs) => ({
      address: PublicKeypair.fromPublicKey(rs),
      weight: config.signerWeight.recoveryServer,
    }));

    accountSigners.push({
      address: config.deviceAddress,
      weight: config.signerWeight.device,
    });

    const transaction = await this.registerRecoveryServerSigners(
      config.accountAddress,
      accountSigners,
      config.accountThreshold,
      config.sponsorAddress,
      config.builderExtra,
    );

    return {
      transaction,
      signers: recoverySigners,
    };
  }

  /**
   * Retrieves account information from multiple recovery servers for a specified account address.
   * @param {AccountKeypair} accountAddress - The account address for which to retrieve information.
   * @param {RecoveryAuthMap} auth - A map of recovery server keys to their respective authentication tokens.
   * @throws {ServerRequestFailedError} If any of the requests to recovery servers fail.
   * @returns {Promise<RecoveryAccountInfoMap>} A map of recovery server keys to their respective account information.
   */
  async getAccountInfo(
    accountAddress: AccountKeypair,
    auth: RecoveryAuthMap,
  ): Promise<RecoveryAccountInfoMap> {
    return Object.keys(auth).reduce(
      async (
        infoMapPromise: Promise<RecoveryAccountInfoMap>,
        serverKey: RecoveryServerKey,
      ) => {
        const infoMap = await infoMapPromise;

        const authToken = auth[serverKey];

        const requestUrl = `${this.getServer(serverKey).endpoint}/accounts/${
          accountAddress.publicKey
        }`;

        try {
          const resp = await this.httpClient.get(requestUrl, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken.token}`,
            },
          });

          const accountInfo: RecoverableAccountInfo = resp.data;

          return {
            ...infoMap,
            [serverKey]: accountInfo,
          };
        } catch (e) {
          throw new ServerRequestFailedError(e);
        }
      },
      Promise.resolve({}),
    );
  }

  /**
   * Add recovery servers and device account as new account signers, and set new threshold weights
   * on the account.
   *
   * This transaction can be sponsored.
   * @param {AccountKeypair} account - Stellar address of the account that is receiving new signers.
   * @param {AccountSigner[]} accountSigners - A list of account signers and their weights.
   * @param {AccountThreshold} accountThreshold - Low, medium, and high thresholds to set on the account.
   * @param {AccountKeypair} [sponsorAddress] - Stellar address of the account sponsoring this transaction.
   * @param {(builder: CommonBuilder) => CommonBuilder} [builderExtra] - Stellar address of the account sponsoring this transaction.
   * @throws {DuplicateAccountSignerError} If the same address appears more than once in [accountSigners].
   * @throws {SignerKeyEqualsMasterKeyError} If [accountSigners] contains [account] itself.
   * @throws {NoAccountAndNoSponsorError} If the account does not exist and no sponsor is given.
   * @returns {Promise<Transaction>}  The built transaction.
   */
  async registerRecoveryServerSigners(
    account: AccountKeypair,
    accountSigners: AccountSigner[],
    accountThreshold: AccountThreshold,
    sponsorAddress?: AccountKeypair,
    builderExtra?: (builder: CommonBuilder) => CommonBuilder,
  ): Promise<Transaction> {
    validateAccountSigners(account.publicKey, accountSigners);

    let accountInfo = undefined;

    try {
      accountInfo = await this.stellar
        .account()
        .getInfo({ accountAddress: account.publicKey });
    } catch (e) {
      // In case it's an "Account not found" error let the code continue
      if (e?.response?.status !== 404) {
        throw e;
      }
    }

    const sourceAddress = accountInfo ? account : sponsorAddress;

    if (!sourceAddress) {
      throw new NoAccountAndNoSponsorError();
    }

    const builder: TransactionBuilder = await this.stellar.transaction({
      sourceAddress,
    });

    if (sponsorAddress) {
      if (accountInfo) {
        const buildingFunction = (_builder: SponsoringBuilder) =>
          this.register(
            _builder,
            accountSigners,
            accountThreshold,
            builderExtra,
          ) as SponsoringBuilder;

        builder.sponsoring(sponsorAddress, buildingFunction);
      } else {
        const buildingFunction = (_builder: SponsoringBuilder) => {
          _builder.createAccount(account);
          return this.register(
            _builder,
            accountSigners,
            accountThreshold,
            builderExtra,
          ) as SponsoringBuilder;
        };

        builder.sponsoring(sponsorAddress, buildingFunction, account);
      }
    } else {
      this.register(builder, accountSigners, accountThreshold, builderExtra);
    }

    return builder.build();
  }

  /**
   * Register account with recovery servers using
   * [SEP-30](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0030.md).
   * @param {AccountKeypair} account - Account being registerd.
   * @param {RecoveryIdentityMap} identityMap - map of identities to recovery keys.
   * @returns {Promise<string[]>}  List of recovery signer public keys.
   */
  private async enrollWithRecoveryServer(
    account: AccountKeypair,
    identityMap: RecoveryIdentityMap,
  ): Promise<EnrolledRecoverySigner[]> {
    return Promise.all(
      Object.keys(this.servers).map(async (key) => {
        const server = this.servers[key];

        const accountIdentities = identityMap[key];

        if (!accountIdentities) {
          throw new RecoveryIdentityNotFoundError(key);
        }

        const authToken = await this.sep10Auth(key).authenticate({
          accountKp: account,
          walletSigner: server.walletSigner,
          clientDomain: server.clientDomain,
        });

        const requestUrl = `${server.endpoint}/accounts/${account.publicKey}`;

        let recoveryAccount: RecoveryAccount;
        try {
          const resp = await this.httpClient.post(
            requestUrl,
            {
              identities: accountIdentities.map((ai) =>
                camelToSnakeCaseObject(ai),
              ),
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken.token}`,
              },
            },
          );

          recoveryAccount = resp.data;
        } catch (e) {
          throw new ServerRequestFailedError(e);
        }

        return {
          serverKey: key,
          signerKey: this.getLatestRecoverySigner(recoveryAccount.signers),
        };
      }),
    );
  }

  /**
   * Assert that the recovery servers collectively returned a usable signer set.
   *
   * SEP-30 has each server generate its own unique signing key for the account,
   * so the same key coming back from two servers is a protocol violation, not a
   * judgement call. Left unchecked it halves the recovery signer set while the
   * thresholds sized for the full set are written anyway, which is only
   * discovered when the device is lost and recovery is attempted.
   * @private
   * @param {EnrolledRecoverySigner[]} enrolled - Signer keys paired with the servers that returned them.
   * @param {string} deviceAddress - Address being added as the device signer.
   * @throws {DuplicateRecoverySignerError} If two or more servers returned the same key.
   * @throws {RecoverySignerEqualsDeviceKeyError} If a server returned the device key.
   * @returns {void}
   */
  private validateEnrolledSigners(
    enrolled: EnrolledRecoverySigner[],
    deviceAddress: string,
  ): void {
    const serverKeysBySigner: { [signerKey: string]: RecoveryServerKey[] } = {};

    enrolled.forEach(({ serverKey, signerKey }) => {
      serverKeysBySigner[signerKey] = [
        ...(serverKeysBySigner[signerKey] || []),
        serverKey,
      ];
    });

    Object.keys(serverKeysBySigner).forEach((signerKey) => {
      const serverKeys = serverKeysBySigner[signerKey];

      if (serverKeys.length > 1) {
        throw new DuplicateRecoverySignerError(serverKeys, signerKey);
      }

      if (signerKey === deviceAddress) {
        throw new RecoverySignerEqualsDeviceKeyError(serverKeys[0], signerKey);
      }
    });
  }

  private getLatestRecoverySigner(signers: RecoveryAccountSigner[]): string {
    if (signers.length === 0) {
      throw new NoAccountSignersError();
    }

    return signers[0].key;
  }

  private register(
    builder: CommonBuilder,
    accountSigners: AccountSigner[],
    accountThreshold: AccountThreshold,
    builderExtra?: (builder: CommonBuilder) => CommonBuilder,
  ): CommonBuilder {
    builder.lockAccountMasterKey();

    accountSigners.forEach(({ address, weight }) =>
      builder.addAccountSigner(address, weight),
    );

    const { low, medium, high } = accountThreshold;
    builder.setThreshold({ low, medium, high });

    builderExtra?.(builder);

    return builder;
  }
}
