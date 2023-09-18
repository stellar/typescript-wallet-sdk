// TODO - https://stellarorg.atlassian.net/browse/WAL-815?atlOrigin=eyJpIjoiYTE4MTdlZDIwMDU1NGU2YjlhZjQ3MDFlYmJhZWM1NTciLCJwIjoiaiJ9
import { AxiosInstance } from "axios";
import { Transaction } from "stellar-sdk";

import { Config } from "walletSdk";
import {
  AccountSigner,
  AccountThreshold,
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
import {
  DeviceKeyEqualsMasterKeyError,
  NoAccountAndNoSponsorError,
  NoAccountSignersError,
  RecoveryIdentityNotFoundError,
  ServerRequestFailedError,
} from "walletSdk/Exceptions";
import { Sep10 } from "walletSdk/Auth";
import { AccountRecover } from "./AccountRecover";
import {
  AccountKeypair,
  PublicKeypair,
  TransactionBuilder,
  SponsoringBuilder,
  Stellar,
} from "../Horizon";

// Let's prevent exporting this constructor type as
// we should not create this Recovery class directly.
type RecoveryParams = {
  cfg: Config;
  stellar: Stellar;
  httpClient: AxiosInstance;
  servers: RecoveryServerMap;
};

// Do not create this object directly, use the Wallet class.
export class Recovery extends AccountRecover {
  private cfg: Config;

  constructor(params: RecoveryParams) {
    const { cfg, stellar, httpClient, servers } = params;
    super(stellar, httpClient, servers);
    this.cfg = cfg;
  }

  /**
   * Register account with recovery servers using
   * [SEP-30](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0030.md).
   */
  private async enrollWithRecoveryServer(
    account: AccountKeypair,
    identityMap: RecoveryIdentityMap,
  ): Promise<string[]> {
    return Promise.all(
      Object.keys(this.servers).map(async (key) => {
        const server = this.servers[key];

        const accountIdentity = identityMap[key];

        if (!accountIdentity) {
          throw new RecoveryIdentityNotFoundError(key);
        }

        const authToken = this.sep10Auth(key).authenticate({
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
              identities: accountIdentity,
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
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

  /**
   * Create new auth object to authenticate account with the recovery server using SEP-10.
   *
   * @return auth object
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

  private getLatestRecoverySigner(signers: RecoveryAccountSigner[]): string {
    if (signers.length === 0) {
      throw new NoAccountSignersError();
    }

    return signers[0].key;
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
   *
   * @param config: [RecoverableWalletConfig]
   * @return transaction
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
      // config.builderExtra
    );

    return {
      transaction,
      signers: recoverySigners,
    };
  }

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
              Authorization: `Bearer ${authToken}`,
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
   *
   * @param account Stellar address of the account that is receiving new signers
   * @param accountSigner A list of account signers and their weights
   * @param accountThreshold Low, medium, and high thresholds to set on the account
   * @param sponsorAddress optional Stellar address of the account sponsoring this transaction
   * @return transaction
   */
  async registerRecoveryServerSigners(
    account: AccountKeypair,
    accountSigner: AccountSigner[],
    accountThreshold: AccountThreshold,
    sponsorAddress?: AccountKeypair,
    // builderExtra?: ((CommonTransactionBuilder<*>) -> Unit),
  ): Promise<Transaction> {
    const accountInfo = await this.stellar
      .account()
      .getInfo({ accountAddress: account.publicKey });

    const sourceAddress = accountInfo ? account : sponsorAddress;

    if (!sourceAddress) {
      throw new NoAccountAndNoSponsorError();
    }

    const builder: TransactionBuilder = await this.stellar.transaction({
      sourceAddress,
    });

    if (sponsorAddress) {
      if (accountInfo) {
        const buildingFunction = (builder: SponsoringBuilder) =>
          this.register(
            builder,
            accountSigner,
            accountThreshold,
          ) as SponsoringBuilder;

        builder.sponsoring(sponsorAddress, buildingFunction);
      } else {
        const buildingFunction = (builder: SponsoringBuilder) => {
          builder.createAccount(account);
          return this.register(
            builder,
            accountSigner,
            accountThreshold,
          ) as SponsoringBuilder;
        };

        builder.sponsoring(sponsorAddress, buildingFunction, account);
      }
    } else {
      this.register(builder, accountSigner, accountThreshold);
    }

    return builder.build();
  }

  private register(
    builder: TransactionBuilder | SponsoringBuilder,
    accountSigner: AccountSigner[],
    accountThreshold: AccountThreshold,
    // TODO: finish this
    // builderExtra?: ((CommonTransactionBuilder<*>) -> Unit),
  ): TransactionBuilder | SponsoringBuilder {
    builder.lockAccountMasterKey();

    accountSigner.forEach(({ address, weight }) =>
      builder.addAccountSigner(address, weight),
    );

    const { low, medium, high } = accountThreshold;
    builder.setThreshold({ low, medium, high });

    // builderExtra?.(builder);

    return builder;
  }
}
