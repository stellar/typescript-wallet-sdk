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
  constructor(keypair: Keypair) {
    super(keypair);
  }

  static fromPublicKey = (publicKey: string): PublicKeypair => {
    return new PublicKeypair(Keypair.fromPublicKey(publicKey));
  }
}

export class SigningKeypair extends AccountKeypair {
  constructor(keypair: Keypair) {
    if (!keypair.canSign()) {
      throw new Error("This keypair doesn't have a secret key and can't sign");
    }
    super(keypair);
  }

  static fromSecret = (secretKey: string): SigningKeypair => {
    return new SigningKeypair(Keypair.fromSecret(secretKey));
  }

  get secretKey(): string {
    return this.keypair.secret();
  }

  sign(
    transaction: Transaction | FeeBumpTransaction
  ): Transaction | FeeBumpTransaction {
    transaction.sign(this.keypair);
    return transaction;
  }
}
