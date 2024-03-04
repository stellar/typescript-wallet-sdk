import { AxiosInstance } from "axios";
import { Transaction } from "@stellar/stellar-sdk";

import { Config } from "walletSdk";
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
} from "walletSdk/Types";
import { AccountRecover } from "./AccountRecover";
import { Sep10 } from "../Auth";
import {
  DeviceKeyEqualsMasterKeyError,
  NoAccountAndNoSponsorError,
  NoAccountSignersError,
  RecoveryIdentityNotFoundError,
  ServerRequestFailedError,
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
   * This transaction can be sponsored.
   * @param {RecoverableWalletConfig} config - The configuration for recoverable wallet.
   * @returns {Promise<RecoverableWallet>} The wallet.
   */
  async createRecoverableWallet(
    config: RecoverableWalletConfig,
  ): Promise<RecoverableWallet> {
    if (config.deviceAddress.publicKey == config.accountAddress.publicKey) {
      throw new DeviceKeyEqualsMasterKeyError();
    }

    const recoverySigners = await this.enrollWithRecoveryServer(
      config.accountAddress,
      config.accountIdentity,
    );

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
   * @returns {Promise<Transaction>}  The built transaction.
   */
  async registerRecoveryServerSigners(
    account: AccountKeypair,
    accountSigners: AccountSigner[],
    accountThreshold: AccountThreshold,
    sponsorAddress?: AccountKeypair,
    builderExtra?: (builder: CommonBuilder) => CommonBuilder,
  ): Promise<Transaction> {
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
  ): Promise<string[]> {
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

        return this.getLatestRecoverySigner(recoveryAccount.signers);
      }),
    );
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
