import StellarSdk, {
  Keypair,
  TransactionBuilder,
  Transaction,
  FeeBumpTransaction,
  Networks,
} from "stellar-sdk";
import { PublicKeypair } from "../src/walletSdk/Horizon/Account";

import sdk from "../src";
const { walletSdk } = sdk;

describe("Account", () => {
  it("should init keypair and sign", () => {
    const wal = walletSdk.Wallet.TestNet();
    const account = wal.stellar().account();
    const kp = account.createKeypair();
    expect(kp.publicKey).toBeTruthy();
    expect(kp.secretKey).toBeTruthy();

    const tx = TransactionBuilder.fromXDR(
      "AAAAAgAAAADk/TqnRl6sFK79yasH46qlX/dFxQ8R023aHRxAkUmE8wAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADk/TqnRl6sFK79yasH46qlX/dFxQ8R023aHRxAkUmE8wAAAAAAAAAABfXhAAAAAAAAAAAA",
      Networks.TESTNET
    );
    kp.sign(tx);
    expect(tx.signatures.length).toBe(1);
    tx.sign(kp.keypair);
    expect(tx.signatures.length).toBe(2);
  });
  it("can init from string", () => {
    const kp = PublicKeypair.fromPublicKey(
      "GCPECGTX5RZWBJNH7Q3FNN4742R7OKMSP6G4ECCUX7Q5IGDCYYG2I447"
    );
    expect(kp.publicKey).toBeTruthy();
  });
});
