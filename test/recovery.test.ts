import axios from "axios";
import { xdr } from "stellar-sdk";

import { SigningKeypair, Wallet } from "../src";

const testingAccountKp = SigningKeypair.fromSecret(
  "SDZZHNNOHOLFCAQ7XZZREXTXFTEPPT3L527WB2LVYCXODEDGTT6KBUSL",
);

const accountSignerKp = SigningKeypair.fromSecret(
  "SDZF2OUDSU32XIQYVO53X2P4F7VYP72HJP7JR3RWTT3AFZSADENNL7YZ",
);

const sponsorAccountKp = SigningKeypair.fromSecret(
  "SCIKQPLKAARVTUX76R3PPJ5PY5KANAJ4H5TXKBAZA4L2JIQCHVGVFFGS",
);

let wallet: Wallet;

describe("Recovery / Register Signers", () => {
  beforeAll(async () => {
    wallet = Wallet.TestNet();
    const stellar = wallet.stellar();

    // make sure testing accounts exist
    try {
      await stellar.server.loadAccount(testingAccountKp.publicKey);
    } catch (e) {
      await axios.get(
        "https://friendbot.stellar.org/?addr=" + testingAccountKp.publicKey,
      );
    }

    try {
      await stellar.server.loadAccount(sponsorAccountKp.publicKey);
    } catch (e) {
      await axios.get(
        "https://friendbot.stellar.org/?addr=" + sponsorAccountKp.publicKey,
      );
    }
  }, 60000);

  it("defaults work", async () => {
    const transaction = await wallet
      .recovery({ servers: {} })
      .registerRecoveryServerSigners(
        testingAccountKp,
        [
          {
            address: accountSignerKp,
            weight: 10,
          },
        ],
        {
          low: 10,
          medium: 10,
          high: 10,
        },
      );

    expect(transaction.toXDR()).toBeTruthy();
    expect(transaction.toEnvelope()).toBeInstanceOf(xdr.TransactionEnvelope);
  });

  it("there are 3 operations in non-sponsored transaction", async () => {
    const transaction = await wallet
      .recovery({ servers: {} })
      .registerRecoveryServerSigners(
        testingAccountKp,
        [
          {
            address: accountSignerKp,
            weight: 10,
          },
        ],
        {
          low: 10,
          medium: 10,
          high: 10,
        },
      );

    expect(transaction.operations.length).toBe(3);
  });

  it("there are 5 operations in sponsored transaction", async () => {
    const transaction = await wallet
      .recovery({ servers: {} })
      .registerRecoveryServerSigners(
        testingAccountKp,
        [
          {
            address: accountSignerKp,
            weight: 10,
          },
        ],
        {
          low: 10,
          medium: 10,
          high: 10,
        },
        sponsorAccountKp,
      );

    expect(transaction.operations.length).toBe(5);
  });
});
