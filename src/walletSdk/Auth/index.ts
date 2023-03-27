import axios from "axios";
import StellarSdk, { Keypair } from "stellar-sdk";

import {
  InvalidMemoError,
  ClientDomainWithMemoError,
  ServerRequestFailedError,
} from "../exception";

export class Auth {
  private webAuthEndpoint = "";

  // TODO - add config and custom httpClient functionality
  constructor(webAuthEndpoint) {
    this.webAuthEndpoint = webAuthEndpoint;
  }

  async authenticate(
    accountKp: Keypair,
    memoId?: string,
    clientDomain?: string
  ) {
    const challengeResponse = await this.challenge(
      accountKp,
      memoId,
      clientDomain
    );
    const signedTx = this.sign(
      accountKp,
      challengeResponse.transaction,
      challengeResponse.network_passphrase
    );
    return await this.getToken(signedTx);
  }

  async challenge(accountKp: Keypair, memoId?: string, clientDomain?: string) {
    if (memoId && parseInt(memoId) < 0) {
      throw new InvalidMemoError();
    }
    if (clientDomain && memoId) {
      throw new ClientDomainWithMemoError();
    }
    const url = `${this.webAuthEndpoint}?account=${accountKp.publicKey()}${
      memoId ? `&memo=$[memoId}` : ""
    }${clientDomain ? `&client_domain=${clientDomain}` : ""}`;
    try {
      const auth = await axios.get(url);
      return auth.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  // TODO - add signing with client account functionality
  sign(accountKp: Keypair, challengeTx, network) {
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      challengeTx,
      network
    );
    transaction.sign(accountKp);
    return transaction;
  }

  async getToken(signedTx) {
    try {
      const resp = await axios.post(this.webAuthEndpoint, {
        transaction: signedTx.toXDR(),
      });
      return resp.data.token;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}
