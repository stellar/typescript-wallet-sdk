import { TransactionBuilder, Networks, Server } from "stellar-sdk";
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

// ALEC TODO - change file name to horizon?
// ALEC TODO - test creating new account with decimal balance - number correct type?
describe("Stellar", () => {
  // ALEC TODO - name
  it("should init", async () => {
    console.log({ Server }); // ALEC TODO - remove

    const wal = walletSdk.Wallet.TestNet();
    const stellar = wal.stellar();

    // ALEC TODO - how to make sure account is funded and exists
    const kp = PublicKeypair.fromPublicKey(
      "GBMPTWD752SEBXPN4OF6A6WEDVNB4CJY4PR63J5L6OOYR3ISMG3TA6JZ"
    );

    const builder = await stellar.transaction(kp, 100, "test memo", {
      minTime: 0,
      maxTime: 1,
    });
    // console.log({ builder }); // ALEC TODO - remove

    // const test = builder.createAccount(kp, 2);
    // console.log({ test }); // ALEC TODO - remove

    const tx = builder.createAccount(kp, 2).build();
    console.log({ tx }); // ALEC TODO - remove
  });
});
