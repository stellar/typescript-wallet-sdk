import StellarSdk, {
  TransactionBuilder as StellarTransactionBuilder,
  Account as StellarAccount,
  Transaction,
  Server,
  Memo,
  xdr,
  Networks,
} from "stellar-sdk";

import { Config } from "walletSdk";
import { AccountKeypair } from "../Account";
import {
  InsufficientStartingBalanceError,
  WithdrawalTxMissingMemoError,
  WithdrawalTxNotPendingUserTransferStartError,
} from "../../Exceptions";
import { IssuedAssetId, StellarAssetId } from "../../Asset";
import { WithdrawTransaction, TransactionStatus } from "../../Types";

// ALEC TODO - move
abstract class CommonTransactionBuilder {
  sourceAddress: string;
  operations: Array<xdr.Operation>;

  constructor(sourceAddress: string, operations: Array<xdr.Operation>) {
    this.sourceAddress = sourceAddress;
    this.operations = operations;
  }

  addAssetSupport(
    asset: IssuedAssetId,
    trustLimit?: string,
  ): TransactionBuilder {
    this.operations.push(
      StellarSdk.Operation.changeTrust({
        asset: asset.toAsset(),
        limit: trustLimit,
        source: this.sourceAddress,
      }),
    );
    return this;
  }

  removeAssetSupport(asset: IssuedAssetId): TransactionBuilder {
    return this.addAssetSupport(asset, "0");
  }
}

// ALEC TODO - move
class SponsoringBuilder extends CommonTransactionBuilder {
  private sponsorAccount: AccountKeypair;

  constructor(
    sponsoredAddress: string,
    sponsorAccount: AccountKeypair,
    operations: Array<xdr.Operation>,
    buildingFunction: (SponsoringBuilder) => SponsoringBuilder,
  ) {
    super(sponsoredAddress, operations);
    this.sponsorAccount = sponsorAccount;

    this.startSponsoring();
    buildingFunction(this);
    this.stopSponsoring();
  }

  createAccount(
    newAccount: AccountKeypair,
    startingBalance,
  ): SponsoringBuilder {
    this.operations.push(
      StellarSdk.Operation.createAccount({
        destination: newAccount.publicKey,
        startingBalance: startingBalance.toString(),
        source: this.sponsorAccount.publicKey,
      }),
    );
    return this;
  }

  startSponsoring() {
    this.operations.push(
      StellarSdk.Operation.beginSponsoringFutureReserves({
        sponsoredId: this.sourceAddress,
        source: this.sponsorAccount.publicKey,
      }),
    );
  }

  stopSponsoring() {
    this.operations.push(
      StellarSdk.Operation.endSponsoringFutureReserves({
        source: this.sourceAddress,
      }),
    );
  }
}

export class TransactionBuilder extends CommonTransactionBuilder {
  private cfg: Config;
  private builder: StellarTransactionBuilder;

  constructor(
    cfg: Config,
    sourceAccount: StellarAccount,
    baseFee?: number,
    memo?: Memo,
    timebounds?: Server.Timebounds,
  ) {
    super(sourceAccount.accountId(), []);
    this.builder = new StellarTransactionBuilder(sourceAccount, {
      fee: baseFee ? baseFee.toString() : cfg.stellar.baseFee.toString(),
      timebounds,
      memo,
      networkPassphrase: cfg.stellar.network,
    });
    if (!timebounds) {
      this.builder.setTimeout(cfg.stellar.defaultTimeout);
    }
  }

  // ALEC TODO - move types?
  sponsoring(
    sponsorAccount: AccountKeypair,
    buildingFunction: (SponsoringBuilder) => SponsoringBuilder,
    sponsoredAccount?: AccountKeypair,
  ): TransactionBuilder {
    new SponsoringBuilder(
      sponsoredAccount ? sponsoredAccount.publicKey : this.sourceAddress,
      sponsorAccount,
      this.operations,
      buildingFunction,
    );
    // ALEC TODO - make sure the operations array is updated

    return this;
  }

  createAccount(
    newAccount: AccountKeypair,
    startingBalance: number = 1,
  ): TransactionBuilder {
    if (startingBalance < 1) {
      throw new InsufficientStartingBalanceError();
    }

    this.operations.push(
      StellarSdk.Operation.createAccount({
        destination: newAccount.publicKey,
        startingBalance: startingBalance.toString(),
        source: this.sourceAddress,
      }),
    );
    return this;
  }

  transfer(
    destinationAddress: string,
    assetId: StellarAssetId,
    amount: string,
  ): TransactionBuilder {
    this.operations.push(
      StellarSdk.Operation.payment({
        destination: destinationAddress,
        asset: assetId.toAsset(),
        amount,
      }),
    );
    return this;
  }

  addOperation(op: xdr.Operation): TransactionBuilder {
    this.builder.addOperation(op);
    return this;
  }

  setMemo(memo: Memo): TransactionBuilder {
    this.builder.addMemo(memo);
    return this;
  }

  build(): Transaction {
    this.operations.forEach((op) => {
      this.builder.addOperation(op);
    });
    return this.builder.build();
  }

  transferWithdrawalTransaction(
    transaction: WithdrawTransaction,
    assetId: StellarAssetId,
  ): TransactionBuilder {
    if (transaction.status !== TransactionStatus.pending_user_transfer_start) {
      throw new WithdrawalTxNotPendingUserTransferStartError(
        transaction.status,
      );
    }

    if (!(transaction.withdraw_memo_type && transaction.withdraw_memo)) {
      throw new WithdrawalTxMissingMemoError();
    }

    return this.setMemo(
      new Memo(transaction.withdraw_memo_type, transaction.withdraw_memo),
    ).transfer(
      transaction.withdraw_anchor_account,
      assetId,
      transaction.amount_in,
    );
  }
}
