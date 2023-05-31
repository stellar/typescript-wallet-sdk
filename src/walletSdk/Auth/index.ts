import StellarSdk, { Keypair } from "stellar-sdk";

import {
  InvalidMemoError,
  ClientDomainWithMemoError,
  ServerRequestFailedError,
} from "../exception";
import { WalletSigner } from "./WalletSigner";

// Do not create this object directly, use the Wallet class.
export class Auth {
  private cfg;
  private webAuthEndpoint = "";
  private httpClient;

  constructor(cfg, webAuthEndpoint, httpClient) {
    this.cfg = cfg;
    this.webAuthEndpoint = webAuthEndpoint;
    this.httpClient = httpClient;
  }

  async authenticate(
    accountKp: Keypair,
    walletSigner?: WalletSigner,
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
      challengeResponse,
      walletSigner ?? this.cfg.app.defaultSigner
    );
    return await this.getToken(signedTx);
  }

  private async challenge(
    accountKp: Keypair,
    memoId?: string,
    clientDomain?: string
  ) {
    if (memoId && parseInt(memoId) < 0) {
      throw new InvalidMemoError();
    }
    if (clientDomain && memoId) {
      throw new ClientDomainWithMemoError();
    }
    const url = `${this.webAuthEndpoint}?account=${accountKp.publicKey()}${
      memoId ? `&memo=${memoId}` : ""
    }${clientDomain ? `&client_domain=${clientDomain}` : ""}`;
    try {
      const auth = await this.httpClient.get(url);
      return auth.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  private sign(
    accountKp: Keypair,
    challengeResponse: {
      transaction: string;
      network_passphrase: string;
    },
    walletSigner: WalletSigner
  ) {
    let transaction = StellarSdk.TransactionBuilder.fromXDR(
      challengeResponse.transaction,
      challengeResponse.network_passphrase
    );

    // check if verifying client domain as well
    for (const op of transaction.operations) {
      if (op.type === "manageData" && op.name === "client_domain") {
        transaction = walletSigner.signWithDomainAccount(
          challengeResponse.transaction,
          challengeResponse.network_passphrase,
          accountKp
        );
      }
    }

    walletSigner.signWithClientAccount(transaction, accountKp);
    return transaction;
  }

  private async getToken(signedTx) {
    try {
      const resp = await this.httpClient.post(this.webAuthEndpoint, {
        transaction: signedTx.toXDR(),
      });
      return resp.data.token;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }
}
