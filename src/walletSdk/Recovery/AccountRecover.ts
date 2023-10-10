import { AxiosInstance } from "axios";
import { ServerApi, Transaction } from "stellar-sdk";
import { AccountRecordSigners } from "stellar-sdk/lib/types/account";

import {
  RecoveryServer,
  RecoveryServerKey,
  RecoveryServerMap,
  RecoveryServerSigning,
  RecoveryServerSigningMap,
} from "walletSdk/Types";
import {
  LostSignerKeyNotFound,
  NoDeviceKeyForAccountError,
  NotAllSignaturesFetchedError,
  RecoveryServerNotFoundError,
  ServerRequestFailedError,
  UnableToDeduceKeyError,
} from "../Exceptions";
import {
  AccountKeypair,
  PublicKeypair,
  SponsoringBuilder,
  Stellar,
} from "../Horizon";

/**
 * Used for Account Recovery using Sep-30.
 * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0030.md}
 * @class
 */
export abstract class AccountRecover {
  protected stellar: Stellar;
  protected httpClient: AxiosInstance;
  protected servers: RecoveryServerMap;

  /**
   * Creates a new instance of the AccountRecover class.
   * @constructor
   * @param {Stellar} stellar - The stellar instance used to interact with Horizon server.
   * @param {AxiosInstance} httpClient - The client used to make http calls.
   * @param {RecoveryServerMap} servers - The recovery servers to use.
   */
  constructor(
    stellar: Stellar,
    httpClient: AxiosInstance,
    servers: RecoveryServerMap,
  ) {
    this.stellar = stellar;
    this.httpClient = httpClient;
    this.servers = servers;
  }

  /**
   * Sign transaction with recovery servers. It is used to recover an account using
   * [SEP-30](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0030.md).
   * @param {Transaction} transaction - The transaction with new signer to be signed by recovery servers.
   * @param {AccountKeypair} account - The keypair of the account that will be recovered.
   * @param {RecoveryServerSigningMap} - The map of recovery servers to use.
   * @return {Transaction} - The transaction with recovery server signatures
   * @throws {NotAllSignaturesFetchedError} when all recovery servers don't return signatures
   */
  async signWithRecoveryServers(
    transaction: Transaction,
    account: AccountKeypair,
    serverAuth: RecoveryServerSigningMap,
  ): Promise<Transaction> {
    await Promise.all(
      Object.keys(serverAuth).map((serverKey: RecoveryServerKey) =>
        this.addRecoveryServerTxnSignature(transaction, account.publicKey, [
          serverKey,
          serverAuth[serverKey],
        ]),
      ),
    );
    return transaction;
  }

  /**
   * Replace a lost device key with a new key.
   * @param {AccountKeypair} account - The target account.
   * @param {AccountKeypair} newKey - The key to replace the lost key with.
   * @param {RecoveryServerSigningMap} serverAuth - A map of recovery servers to use.
   * @param {AccountKeypair} [lostKey] - The lost device key. If not specified, try to deduce the key from the account signers list.
   * @param {AccountKeypair} [sponsorAddress] - The sponsor address of the transaction. Please note that not all SEP-30 servers support signing sponsored transactions.
   * @returns {Promise<Transaction>} The transaction with operations for replacing the device key.
   */
  async replaceDeviceKey(
    account: AccountKeypair,
    newKey: AccountKeypair,
    serverAuth: RecoveryServerSigningMap,
    lostKey?: AccountKeypair,
    sponsorAddress?: AccountKeypair,
  ): Promise<Transaction> {
    const stellarAccount = await this.stellar
      .account()
      .getInfo({ accountAddress: account.publicKey });

    let lost: AccountKeypair;
    let weight: number;

    if (lostKey) {
      lost = lostKey;

      const lostSigner = stellarAccount.signers.find(
        ({ key }) => key === lost.publicKey,
      );
      if (!lostSigner) {
        throw new LostSignerKeyNotFound();
      }

      weight = lostSigner.weight;
    } else {
      const deduced = this.deduceKey(stellarAccount, serverAuth);
      lost = PublicKeypair.fromPublicKey(deduced.key);
      weight = deduced.weight;
    }

    let transaction: Transaction;

    const txBuilder = await this.stellar.transaction({
      sourceAddress: account,
    });

    if (sponsorAddress) {
      const buildingFunction = (builder: SponsoringBuilder) =>
        builder.removeAccountSigner(lost).addAccountSigner(newKey, weight);

      transaction = txBuilder
        .sponsoring(sponsorAddress, buildingFunction)
        .build();
    } else {
      transaction = txBuilder
        .removeAccountSigner(lost)
        .addAccountSigner(newKey, weight)
        .build();
    }

    return this.signWithRecoveryServers(transaction, account, serverAuth);
  }

  protected getServer = (serverKey: RecoveryServerKey): RecoveryServer => {
    const server = this.servers[serverKey];

    if (!server) {
      throw new RecoveryServerNotFoundError(serverKey);
    }

    return server;
  };

  /**
   * Try to deduce the lost key. If any of these criteria match, one of the signers
   * from the account will be recognized as the lost device key:
   * 1. Only signer that's not in [serverAuth]
   * 2. All signers in [serverAuth] have the same weight, and the potential signer is
   * the only one with a different weight.
   * @private
   * @param {ServerApi.AccountRecord} stellarAccount - The Stellar account to lookup existing signers on account.
   * @param {RecoveryServerSigningMap} serverAuth - A map of recovery servers to use.
   * @returns {AccountRecordSigners} The deduced account signer.
   * @throws {NoDeviceKeyForAccountError} When no existing ("lost") device key is found.
   * @throws {UnableToDeduceKeyError} When no criteria match.
   */
  private deduceKey(
    stellarAccount: ServerApi.AccountRecord,
    serverAuth: RecoveryServerSigningMap,
  ): AccountRecordSigners {
    // Recovery servers addresses
    const recoveryAddresses = Object.values(serverAuth).map(
      ({ signerAddress }) => signerAddress,
    );

    // All signers on stellar account
    const accountSigners = stellarAccount.signers;

    // All signers on stellar account that are not recovery server
    const nonRecoverySigners = accountSigners.filter(
      ({ key, weight }) => !recoveryAddresses.includes(key) && weight > 0,
    );

    // Throws in case there is no signer other than the recovery signers
    if (nonRecoverySigners.length === 0) {
      throw new NoDeviceKeyForAccountError();
    }

    // If we have only 1 signer that's not a recovery signer deduce it
    // as the lost key
    if (nonRecoverySigners.length === 1) {
      return nonRecoverySigners[0];
    }

    // If we have multiple signers that are not recovery signers:

    // First get all signers on stellar account that are recovery server
    const recoverySigners = accountSigners.filter(({ key }) =>
      recoveryAddresses.includes(key),
    );

    // Check if all recovery signers have the same weight
    const recoveryWeight = recoverySigners[0]?.weight || 0;
    if (recoverySigners.find(({ weight }) => weight !== recoveryWeight)) {
      throw new UnableToDeduceKeyError();
    }

    // Then in case we have only one non-recovery signer that has different
    // weight deduce it as the lost key
    const filtered = nonRecoverySigners.filter(
      ({ weight }) => weight !== recoveryWeight,
    );

    if (filtered.length !== 1) {
      throw new UnableToDeduceKeyError();
    }

    return filtered[0];
  }

  private async addRecoveryServerTxnSignature(
    transaction: Transaction,
    accountAddress: string,
    recoveryAuth: [RecoveryServerKey, RecoveryServerSigning],
  ): Promise<void> {
    const [serverKey, auth] = recoveryAuth;

    const server = this.getServer(serverKey);

    const requestUrl = `${server.endpoint}/accounts/${accountAddress}/sign/${auth.signerAddress}`;

    let signature: string;
    try {
      const resp = await this.httpClient.post(
        requestUrl,
        {
          transaction: transaction.toXDR(),
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.authToken}`,
          },
        },
      );

      signature = resp.data.signature;

      if (!signature) {
        throw new NotAllSignaturesFetchedError();
      }
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }

    transaction.addSignature(auth.signerAddress, signature);
  }
}
