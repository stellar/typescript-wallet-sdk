import { Keypair, Transaction, FeeBumpTransaction } from "stellar-sdk";

class AccountKeypair {
  keypair: Keypair;
  constructor(keypair: Keypair) {
    this.keypair = keypair;
  }

  get publicKey(): string {
    return this.keypair.publicKey();
  }

  toString(): string {
    return `${this.constructor.name}(address=${this.publicKey})`;
  }
}

export class PublicKeypair extends AccountKeypair {
  keypair: Keypair;
  constructor(keypair: Keypair) {
    super(keypair);
  }
}

export class SigningKeypair extends AccountKeypair {
  keypair: Keypair;
  constructor(keypair: Keypair) {
    if (!keypair.canSign()) {
      throw new Error("This keypair doesn't have a private key and can't sign");
    }
    super(keypair);
  }

  static fromSecret = (secret: string): SigningKeypair => {
    return new SigningKeypair(Keypair.fromSecret(secret));
  };

  get secretKey(): string {
    return this.keypair.secret();
  }

  sign(
    transaction: Transaction | FeeBumpTransaction
  ): Transaction | FeeBumpTransaction {
    transaction.sign(this.keypair);
    return transaction;
  }

  toString(): string {
    return `${this.constructor.name}(address=${this.publicKey})`;
  }
}
