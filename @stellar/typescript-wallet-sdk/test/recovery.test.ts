import axios from "axios";
import { xdr } from "@stellar/stellar-sdk";

import { Recovery, SigningKeypair, Wallet } from "../src";
import {
  DuplicateAccountSignerError,
  DuplicateRecoverySignerError,
  RecoverySignerEqualsDeviceKeyError,
  SignerKeyEqualsMasterKeyError,
} from "../src/walletSdk/Exceptions";

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

describe("Recovery / Signer set validation", () => {
  const deviceKp = SigningKeypair.fromSecret(
    "SC2VAILFM6DTF7MLDKFMK2RWQ4YTOYSKLMMXVNSRPYZ3VIA6L5WNCK4C",
  );

  const recoverySigner1Kp = SigningKeypair.fromSecret(
    "SB42ZOPNSEGUGXBX4VE7ZQ6C5RRVX3JD3NU6V37QTWNPC4VF2LA2EXUF",
  );

  const recoverySigner2Kp = SigningKeypair.fromSecret(
    "SANCUS65KI66LSQI2REKJODIWISJVJKYONMCFP4DF76IUFDCNHKVFHFD",
  );

  const threshold = { low: 10, medium: 10, high: 10 };

  // Stand in for the SEP-30 enrolment round trip so these tests exercise the
  // validation alone, with no recovery server or SEP-10 auth involved.
  const mockEnrollment = (
    signers: { serverKey: string; signerKey: string }[],
  ) =>
    jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(Recovery.prototype as any, "enrollWithRecoveryServer")
      .mockResolvedValue(signers);

  const recoverableWalletConfig = () => ({
    accountAddress: testingAccountKp,
    deviceAddress: deviceKp,
    accountThreshold: threshold,
    accountIdentity: {},
    signerWeight: { device: 10, recoveryServer: 5 },
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("registerRecoveryServerSigners", () => {
    it("rejects a signer set containing the same address twice", async () => {
      await expect(
        wallet.recovery({ servers: {} }).registerRecoveryServerSigners(
          testingAccountKp,
          [
            { address: recoverySigner1Kp, weight: 5 },
            { address: recoverySigner1Kp, weight: 5 },
            { address: deviceKp, weight: 10 },
          ],
          threshold,
        ),
      ).rejects.toThrow(DuplicateAccountSignerError);
    });

    it("names the duplicated address", async () => {
      await expect(
        wallet.recovery({ servers: {} }).registerRecoveryServerSigners(
          testingAccountKp,
          [
            { address: recoverySigner1Kp, weight: 5 },
            { address: recoverySigner1Kp, weight: 5 },
          ],
          threshold,
        ),
      ).rejects.toThrow(recoverySigner1Kp.publicKey);
    });

    it("rejects a signer equal to the account being locked", async () => {
      await expect(
        wallet.recovery({ servers: {} }).registerRecoveryServerSigners(
          testingAccountKp,
          [
            { address: testingAccountKp, weight: 5 },
            { address: deviceKp, weight: 10 },
          ],
          threshold,
        ),
      ).rejects.toThrow(SignerKeyEqualsMasterKeyError);
    });

    it("validates before reaching the network", async () => {
      const getInfo = jest.spyOn(wallet.stellar().account(), "getInfo");

      await expect(
        wallet.recovery({ servers: {} }).registerRecoveryServerSigners(
          testingAccountKp,
          [
            { address: recoverySigner1Kp, weight: 5 },
            { address: recoverySigner1Kp, weight: 5 },
          ],
          threshold,
        ),
      ).rejects.toThrow(DuplicateAccountSignerError);

      expect(getInfo).not.toHaveBeenCalled();
    });

    it("accepts a distinct signer set", async () => {
      const transaction = await wallet
        .recovery({ servers: {} })
        .registerRecoveryServerSigners(
          testingAccountKp,
          [
            { address: recoverySigner1Kp, weight: 5 },
            { address: recoverySigner2Kp, weight: 5 },
            { address: deviceKp, weight: 10 },
          ],
          threshold,
        );

      expect(transaction.toXDR()).toBeTruthy();
    });
  });

  describe("createRecoverableWallet", () => {
    it("rejects two servers returning the same signer key", async () => {
      mockEnrollment([
        { serverKey: "server1", signerKey: recoverySigner1Kp.publicKey },
        { serverKey: "server2", signerKey: recoverySigner1Kp.publicKey },
      ]);

      await expect(
        wallet
          .recovery({ servers: {} })
          .createRecoverableWallet(recoverableWalletConfig()),
      ).rejects.toThrow(DuplicateRecoverySignerError);
    });

    it("names both offending servers and the shared key", async () => {
      mockEnrollment([
        { serverKey: "server1", signerKey: recoverySigner1Kp.publicKey },
        { serverKey: "server2", signerKey: recoverySigner1Kp.publicKey },
      ]);

      const error = await wallet
        .recovery({ servers: {} })
        .createRecoverableWallet(recoverableWalletConfig())
        .catch((e) => e);

      expect(error.message).toContain("server1");
      expect(error.message).toContain("server2");
      expect(error.message).toContain(recoverySigner1Kp.publicKey);
    });

    it("rejects a server returning the device key", async () => {
      mockEnrollment([
        { serverKey: "server1", signerKey: recoverySigner1Kp.publicKey },
        { serverKey: "server2", signerKey: deviceKp.publicKey },
      ]);

      await expect(
        wallet
          .recovery({ servers: {} })
          .createRecoverableWallet(recoverableWalletConfig()),
      ).rejects.toThrow(RecoverySignerEqualsDeviceKeyError);
    });

    it("rejects a server returning the account key", async () => {
      mockEnrollment([
        { serverKey: "server1", signerKey: recoverySigner1Kp.publicKey },
        { serverKey: "server2", signerKey: testingAccountKp.publicKey },
      ]);

      await expect(
        wallet
          .recovery({ servers: {} })
          .createRecoverableWallet(recoverableWalletConfig()),
      ).rejects.toThrow(SignerKeyEqualsMasterKeyError);
    });

    it("installs one distinct signer per server plus the device", async () => {
      mockEnrollment([
        { serverKey: "server1", signerKey: recoverySigner1Kp.publicKey },
        { serverKey: "server2", signerKey: recoverySigner2Kp.publicKey },
      ]);

      const { transaction, signers } = await wallet
        .recovery({ servers: {} })
        .createRecoverableWallet(recoverableWalletConfig());

      expect(signers).toEqual([
        recoverySigner1Kp.publicKey,
        recoverySigner2Kp.publicKey,
      ]);

      // This is the assertion that would have caught the original bug: the
      // signer set reaching the ledger must have the cardinality we intended,
      // because SetOptions overwrites rather than accumulates.
      const signerAddresses = transaction.operations
        .filter((op) => op.type === "setOptions" && op.signer)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((op: any) => op.signer.ed25519PublicKey);

      expect(new Set(signerAddresses).size).toBe(3);
      expect(signerAddresses).toEqual(
        expect.arrayContaining([
          recoverySigner1Kp.publicKey,
          recoverySigner2Kp.publicKey,
          deviceKp.publicKey,
        ]),
      );
    });

    it("produces the weight profile the integration test asserts on-chain", async () => {
      mockEnrollment([
        { serverKey: "server1", signerKey: recoverySigner1Kp.publicKey },
        { serverKey: "server2", signerKey: recoverySigner2Kp.publicKey },
      ]);

      const { transaction } = await wallet
        .recovery({ servers: {} })
        .createRecoverableWallet(recoverableWalletConfig());

      // Mirrors test/integration/recovery.test.ts, which asserts the submitted
      // account ends up with signer weights [0, 5, 5, 10]. Guards against the
      // new validation false-rejecting a correct two-server enrolment.
      const weights = transaction.operations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((op: any) => op.type === "setOptions" && op.signer)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((op: any) => op.signer.weight)
        .concat(0) // the locked master key
        .sort((a: number, b: number) => a - b);

      expect(weights).toEqual([0, 5, 5, 10]);
    });
  });
});
