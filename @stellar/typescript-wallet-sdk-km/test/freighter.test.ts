import {
  Keypair,
  Networks,
  Account,
  TransactionBuilder,
  Operation,
  Transaction,
  Asset,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import freighterApi from "@stellar/freighter-api";

import { freighterHandler } from "../src/Handlers/freighter";
import { Key, KeyType } from "../src/Types";

jest.mock("@stellar/freighter-api", () => ({
  __esModule: true,
  default: {
    signTransaction: jest.fn(),
  },
}));

const mockSignTransaction = freighterApi.signTransaction as jest.Mock;

function buildTestTransaction(networkPassphrase: string): Transaction {
  const keypair = Keypair.random();
  const account = new Account(keypair.publicKey(), "100");
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: Keypair.random().publicKey(),
        asset: Asset.native(),
        amount: "10",
      }),
    )
    .setTimeout(30)
    .build();
  return tx;
}

function makeFreighterKey(overrides: Partial<Key> = {}): Key {
  return {
    id: "freighter-test-key",
    privateKey: "",
    publicKey: Keypair.random().publicKey(),
    type: KeyType.freighter,
    ...overrides,
  };
}

describe("freighterHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("has keyType of KeyType.freighter", () => {
    expect(freighterHandler.keyType).toBe(KeyType.freighter);
  });

  it("successfully signs a transaction", async () => {
    const networkPassphrase = Networks.TESTNET;
    const tx = buildTestTransaction(networkPassphrase);
    const key = makeFreighterKey();

    // Build a signed version of the XDR to return from freighter
    const signedTxXdr = tx.toXDR();
    const signerAddress = key.publicKey;

    mockSignTransaction.mockResolvedValue({
      signedTxXdr,
      signerAddress,
    });

    const result = await freighterHandler.signTransaction({
      transaction: tx,
      key,
      custom: { networkPassphrase },
    });

    expect(result).toBeInstanceOf(Transaction);
    expect(mockSignTransaction).toHaveBeenCalledTimes(1);
    expect(mockSignTransaction).toHaveBeenCalledWith(tx.toXDR(), {
      networkPassphrase,
      address: undefined,
    });
  });

  it("passes custom.address through to freighter", async () => {
    const networkPassphrase = Networks.TESTNET;
    const tx = buildTestTransaction(networkPassphrase);
    const key = makeFreighterKey();
    const address = Keypair.random().publicKey();

    mockSignTransaction.mockResolvedValue({
      signedTxXdr: tx.toXDR(),
      signerAddress: address,
    });

    await freighterHandler.signTransaction({
      transaction: tx,
      key,
      custom: { networkPassphrase, address },
    });

    expect(mockSignTransaction).toHaveBeenCalledWith(tx.toXDR(), {
      networkPassphrase,
      address,
    });
  });

  it("throws when key has a non-empty privateKey", async () => {
    const tx = buildTestTransaction(Networks.TESTNET);
    const key = makeFreighterKey({ privateKey: "SECRET_KEY_VALUE" });

    await expect(
      freighterHandler.signTransaction({
        transaction: tx,
        key,
        custom: { networkPassphrase: Networks.TESTNET },
      }),
    ).rejects.toThrow("Non-Freighter key sent to Freighter handler");
  });

  it("throws when freighter returns an error response", async () => {
    const networkPassphrase = Networks.TESTNET;
    const tx = buildTestTransaction(networkPassphrase);
    const key = makeFreighterKey();

    mockSignTransaction.mockResolvedValue({
      signedTxXdr: "",
      signerAddress: "",
      error: { message: "User declined", code: 1 },
    });

    await expect(
      freighterHandler.signTransaction({
        transaction: tx,
        key,
        custom: { networkPassphrase },
      }),
    ).rejects.toThrow(
      "Freighter signTransaction failed: User declined (code 1)",
    );
  });

  it("throws with error code when freighter error has no message", async () => {
    const networkPassphrase = Networks.TESTNET;
    const tx = buildTestTransaction(networkPassphrase);
    const key = makeFreighterKey();

    mockSignTransaction.mockResolvedValue({
      signedTxXdr: "",
      signerAddress: "",
      error: { message: "", code: 3 },
    });

    await expect(
      freighterHandler.signTransaction({
        transaction: tx,
        key,
        custom: { networkPassphrase },
      }),
    ).rejects.toThrow("Freighter signTransaction failed with code 3");
  });

  it("propagates errors when freighter signTransaction rejects", async () => {
    const networkPassphrase = Networks.TESTNET;
    const tx = buildTestTransaction(networkPassphrase);
    const key = makeFreighterKey();

    mockSignTransaction.mockRejectedValue(new Error("Extension not installed"));

    await expect(
      freighterHandler.signTransaction({
        transaction: tx,
        key,
        custom: { networkPassphrase },
      }),
    ).rejects.toThrow("Extension not installed");
  });

  describe("network passphrase resolution", () => {
    it("uses custom.networkPassphrase when provided, even if key.network is set", async () => {
      const customPassphrase = "Custom Passphrase";
      const tx = buildTestTransaction(customPassphrase);
      const key = makeFreighterKey({ network: Networks.TESTNET });

      mockSignTransaction.mockResolvedValue({
        signedTxXdr: tx.toXDR(),
        signerAddress: key.publicKey,
      });

      await freighterHandler.signTransaction({
        transaction: tx,
        key,
        custom: { networkPassphrase: customPassphrase },
      });

      expect(mockSignTransaction).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ networkPassphrase: customPassphrase }),
      );
    });

    it("falls back to key.network when custom.networkPassphrase is not set", async () => {
      const keyNetwork = Networks.TESTNET;
      const tx = buildTestTransaction(keyNetwork);
      const key = makeFreighterKey({ network: keyNetwork });

      mockSignTransaction.mockResolvedValue({
        signedTxXdr: tx.toXDR(),
        signerAddress: key.publicKey,
      });

      await freighterHandler.signTransaction({
        transaction: tx,
        key,
        custom: {},
      });

      expect(mockSignTransaction).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ networkPassphrase: keyNetwork }),
      );
    });

    it("falls back to Networks.PUBLIC when neither custom.networkPassphrase nor key.network is set", async () => {
      const tx = buildTestTransaction(Networks.PUBLIC);
      const key = makeFreighterKey();

      mockSignTransaction.mockResolvedValue({
        signedTxXdr: tx.toXDR(),
        signerAddress: key.publicKey,
      });

      await freighterHandler.signTransaction({
        transaction: tx,
        key,
      });

      expect(mockSignTransaction).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ networkPassphrase: Networks.PUBLIC }),
      );
    });
  });
});
