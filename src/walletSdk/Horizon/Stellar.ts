import StellarSdk, {
  TransactionBuilder as StellarTransactionBuilder,
  Account as StellarAccount,
  Transaction,
  Server,
} from "stellar-sdk";
import { Config } from "walletSdk";
import { AccountService } from "./AccountService";
import { AccountKeypair } from "./Account";

// ALEC TODO - move all this stuff
// ALEC TODO - need this base class?
// ALEC TODO - abstract class?
abstract class CommonTransactionBuilder {
  // ALEC TODO - need?
  // ALEC TODO - any
  // private abstract operations: Array<any>;
}
class TransactionBuilder extends CommonTransactionBuilder {
  // ALEC TODO - types
  private network;
  private maxBaseFeeInStroops;
  // ALEC TODO - any
  private operations: Array<any>;
  private builder: StellarTransactionBuilder;

  // ALEC TODO - move to Common?
  sourceAccount: any;

  // ALEC TODO - any
  constructor(
    cfg: Config,
    sourceAccount: any,
    baseFee: any,
    memo: any,
    timebounds: any
  ) {
    // ALEC TODO - parent constructor
    super();
    this.network = cfg.stellar.network;
    // // ALEC TODO - make sure right type
    this.maxBaseFeeInStroops = cfg.stellar.baseFee;
    this.operations = [];
    // ALEC TODO
    this.builder = new StellarTransactionBuilder(sourceAccount, {
      fee: baseFee,
    });

    this.sourceAccount = sourceAccount;
  }

  // ALEC TODO - what does = building in kotlin mean?
  createAccount(newAccount: AccountKeypair, startingBalance: number = 1) {
    if (startingBalance < 1) {
      // ALEC TODO - error
      throw new Error("insufficient starting balance");
    }

    this.operations.push(
      StellarSdk.Operation.createAccount({
        destination: newAccount.publicKey,
        startingBalance: startingBalance.toString(),
        // ALEC TODO - how to make sure works if not given, need a default
        source: this.sourceAccount.publicKey,
      })
    );
    return this;
  }

  build(): Transaction {
    this.operations.forEach((op) => {
      this.builder.addOperation(op);
    });
    return this.builder.build();
  }
}

// Do not create this object directly, use the Wallet class.
export class Stellar {
  private cfg: Config;
  server: Server;

  constructor(cfg: Config) {
    this.cfg = cfg;
    this.server = cfg.stellar.server;
  }

  account(): AccountService {
    return new AccountService(this.cfg);
  }

  // ALEC TODO - make params optional
  // ALEC TODO - any
  async transaction(
    sourceAddress: AccountKeypair,
    baseFee: number,
    memo: any,
    timebounds: Server.Timebounds
  ): Promise<TransactionBuilder> {
    let sourceAccount: StellarAccount;
    try {
      sourceAccount = await this.cfg.stellar.server.loadAccount(
        sourceAddress.publicKey
      );
    } catch (e) {
      // ALEC TODO - check error is not found error
      throw new Error(
        `source account does not exist on network ${this.cfg.stellar.network}`
      );
    }

    return new TransactionBuilder(
      this.cfg,
      sourceAccount,
      baseFee,
      memo,
      timebounds
    );
  }

  // ALEC TODO
  // // ALEC TODO - make basFee optional
  // // ALEC TODO - types
  // transaction(
  //   sourceAddress: any,
  //   timeout: any,
  //   baseFee: any
  // ): TransactionBuilder {
  //   return transaction(sourceAddress, baseFee, memo, timeout.toTimeBounds());
  // }
}
