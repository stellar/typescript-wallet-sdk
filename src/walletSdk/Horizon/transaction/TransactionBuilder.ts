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
import { InsufficientStartingBalanceError } from "../../Exceptions";
import { IssuedAssetId } from "../../Asset";

export class TransactionBuilder {
  private network: Networks;
  private operations: Array<xdr.Operation>;
  private builder: StellarTransactionBuilder;

  sourceAccount: string;

  constructor(
    cfg: Config,
    sourceAccount: StellarAccount,
    baseFee?: number,
    memo?: Memo,
    timebounds?: Server.Timebounds,
  ) {
    this.network = cfg.stellar.network;
    this.operations = [];
    this.builder = new StellarTransactionBuilder(sourceAccount, {
      fee: baseFee ? baseFee.toString() : cfg.stellar.baseFee.toString(),
      timebounds,
      memo,
      networkPassphrase: cfg.stellar.network,
    });
    if (!timebounds) {
      this.builder.setTimeout(cfg.stellar.defaultTimeout);
    }

    this.sourceAccount = sourceAccount.accountId();
  }

  createAccount(newAccount: AccountKeypair, startingBalance: number = 1) {
    if (startingBalance < 1) {
      throw new InsufficientStartingBalanceError();
    }

    this.operations.push(
      StellarSdk.Operation.createAccount({
        destination: newAccount.publicKey,
        startingBalance: startingBalance.toString(),
        source: this.sourceAccount,
      }),
    );
    return this;
  }

  addOperation(op: xdr.Operation) {
    this.builder.addOperation(op);
  }

  addAssetSupport(asset: IssuedAssetId, trustLimit?: string) {
    this.operations.push(
      StellarSdk.Operation.changeTrust({
        asset: asset.toAsset(),
        limit: trustLimit,
        source: this.sourceAccount,
      }),
    );
    return this;
  }

  removeAssetSupport(asset: IssuedAssetId) {
    return this.addAssetSupport(asset, "0");
  }

  build(): Transaction {
    this.operations.forEach((op) => {
      this.builder.addOperation(op);
    });
    return this.builder.build();
  }
}
