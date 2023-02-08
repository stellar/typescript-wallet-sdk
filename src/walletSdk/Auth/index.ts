import axios from "axios";
import StellarSdk, { Keypair } from "stellar-sdk";

export class Auth {
  authEndpoint = "";
  keypair: Keypair = null;

  constructor(authEndpoint, privateKey) {
    this.authEndpoint = authEndpoint;

    // ALEC TODO - handle bad private key case
    this.keypair = StellarSdk.Keypair.fromSecret(privateKey);
  }

  async authenticate() {
    const challengeTx = await this.challenge();
    // ALEC TODO - dont hardcode
    const signedTx = this.sign(
      challengeTx,
      "Test SDF Network ; September 2015"
    );
    return await this.getToken(signedTx);
  }

  async challenge() {
    const url = `${this.authEndpoint}?account=${this.keypair.publicKey()}`;
    const auth = await axios.get(url);

    // ALEC TODO - handle error case
    const challengeTx = auth.data.transaction;
    return challengeTx;
  }

  sign(challengeTx, network) {
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      challengeTx,
      network
    );
    transaction.sign(this.keypair);
    return transaction;
  }

  async getToken(signedTx) {
    const resp = await axios.post(this.authEndpoint, {
      transaction: signedTx.toXDR(),
    });
    // ALEC TODO - handle error case
    return resp.data.token;
  }
}
