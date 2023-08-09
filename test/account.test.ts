import StellarSdk, {
  TransactionBuilder,
  Networks,
  Server,
  Keypair,
  Memo,
  MemoText,
} from "stellar-sdk";
import { PublicKeypair } from "../src/walletSdk/Horizon/Account";
import crypto from "crypto";

import sdk from "../src";
const { walletSdk } = sdk;

let wal;
let account;
describe("Account", () => {
  beforeEach(() => {
    wal = walletSdk.Wallet.TestNet();
    account = wal.stellar().account();
  });
  it("should create keypair and sign", () => {
    const kp = account.createKeypair();
    expect(kp.publicKey).toBeTruthy();
    expect(kp.secretKey).toBeTruthy();

    const tx = TransactionBuilder.fromXDR(
      "AAAAAgAAAADk/TqnRl6sFK79yasH46qlX/dFxQ8R023aHRxAkUmE8wAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADk/TqnRl6sFK79yasH46qlX/dFxQ8R023aHRxAkUmE8wAAAAAAAAAABfXhAAAAAAAAAAAA",
      Networks.TESTNET,
    );
    kp.sign(tx);
    expect(tx.signatures.length).toBe(1);
    tx.sign(kp.keypair);
    expect(tx.signatures.length).toBe(2);
  });
  it("should create keypair from random", () => {
    const rand = crypto.randomBytes(32);
    const kp = account.createKeypairFromRandom(rand);
    expect(kp.publicKey).toBeTruthy();
    expect(kp.secretKey).toBeTruthy();
  });
  it("can init from string", () => {
    const kp = PublicKeypair.fromPublicKey(
      "GCPECGTX5RZWBJNH7Q3FNN4742R7OKMSP6G4ECCUX7Q5IGDCYYG2I447",
    );
    expect(kp.publicKey).toBeTruthy();
  });
});
