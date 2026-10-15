import {
  Keypair,
  Networks,
  Account,
  TransactionBuilder,
  Operation,
  Transaction,
  Asset,
  BASE_FEE,
  WebAuth,
} from "@stellar/stellar-sdk";
import albedo from "@albedo-link/intent";

import { albedoSigningWith } from "./fixtures/albedo";
import { albedoHandler } from "../src/Handlers/albedo";
import { Key, KeyType } from "../src/Types";

jest.mock("@albedo-link/intent", () => ({
  __esModule: true,
  default: {
    tx: jest.fn(),
  },
}));

const mockTx = albedo.tx as jest.Mock;

function buildTestTransaction(
  source: Keypair,
  networkPassphrase: string,
): Transaction {
  return new TransactionBuilder(new Account(source.publicKey(), "100"), {
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
}

function makeAlbedoKey(signer: Keypair, overrides: Partial<Key> = {}): Key {
  return {
    id: "albedo-test-key",
    privateKey: "",
    publicKey: signer.publicKey(),
    type: KeyType.albedo,
    ...overrides,
  };
}

describe("albedoHandler", () => {
  let signer: Keypair;

  beforeEach(() => {
    jest.clearAllMocks();
    signer = Keypair.random();
    mockTx.mockImplementation(albedoSigningWith(signer));
  });

  it("signs for the network the key is scoped to", async () => {
    const tx = buildTestTransaction(signer, Networks.TESTNET);
    const key = makeAlbedoKey(signer, { network: Networks.TESTNET });

    const result = await albedoHandler.signTransaction({
      transaction: tx,
      key,
    });

    expect(result.networkPassphrase).toBe(Networks.TESTNET);
    expect(WebAuth.verifyTxSignedBy(result, signer.publicKey())).toBe(true);
  });

  it("signs for custom.networkPassphrase over the key's network", async () => {
    const tx = buildTestTransaction(signer, Networks.TESTNET);
    const key = makeAlbedoKey(signer, { network: Networks.PUBLIC });

    const result = await albedoHandler.signTransaction({
      transaction: tx,
      key,
      custom: { networkPassphrase: Networks.TESTNET },
    });

    expect(result.networkPassphrase).toBe(Networks.TESTNET);
    expect(WebAuth.verifyTxSignedBy(result, signer.publicKey())).toBe(true);
  });

  it("asks Albedo for the public network when no network is set", async () => {
    const tx = buildTestTransaction(signer, Networks.PUBLIC);
    const key = makeAlbedoKey(signer);

    const result = await albedoHandler.signTransaction({
      transaction: tx,
      key,
    });

    expect(mockTx).toHaveBeenCalledWith(
      expect.objectContaining({ xdr: tx.toXdr(), network: "public" }),
    );
    expect(result.networkPassphrase).toBe(Networks.PUBLIC);
    expect(WebAuth.verifyTxSignedBy(result, signer.publicKey())).toBe(true);
  });

  it.each([
    ["Networks.FUTURENET", Networks.FUTURENET],
    ["a private network passphrase", "Private Network ; October 2026"],
  ])("refuses %s without opening Albedo", async (_, networkPassphrase) => {
    const tx = buildTestTransaction(signer, networkPassphrase);
    const key = makeAlbedoKey(signer, { network: networkPassphrase });

    await expect(
      albedoHandler.signTransaction({ transaction: tx, key }),
    ).rejects.toThrow(networkPassphrase);
    expect(mockTx).not.toHaveBeenCalled();
  });

  it.each([
    {
      setup: "a key without a network",
      txNetwork: Networks.TESTNET,
      keyNetwork: undefined,
      customNetwork: undefined,
    },
    {
      setup: "a key scoped to another network",
      txNetwork: Networks.PUBLIC,
      keyNetwork: Networks.TESTNET,
      customNetwork: undefined,
    },
    {
      setup: "custom.networkPassphrase for another network",
      txNetwork: Networks.TESTNET,
      keyNetwork: Networks.TESTNET,
      customNetwork: Networks.PUBLIC,
    },
  ])(
    "refuses a transaction for another network ($setup) without opening Albedo",
    async ({ txNetwork, keyNetwork, customNetwork }) => {
      const tx = buildTestTransaction(signer, txNetwork);
      const key = makeAlbedoKey(signer, { network: keyNetwork });

      await expect(
        albedoHandler.signTransaction({
          transaction: tx,
          key,
          custom: { networkPassphrase: customNetwork },
        }),
      ).rejects.toThrow(`"${txNetwork}"`);
      expect(mockTx).not.toHaveBeenCalled();
    },
  );

  it("refuses a key that holds a private key without opening Albedo", async () => {
    const tx = buildTestTransaction(signer, Networks.TESTNET);
    const key = makeAlbedoKey(signer, { privateKey: signer.secret() });

    await expect(
      albedoHandler.signTransaction({ transaction: tx, key }),
    ).rejects.toThrow(signer.publicKey());
    expect(mockTx).not.toHaveBeenCalled();
  });

  it("throws when Albedo returns no signed envelope", async () => {
    mockTx.mockResolvedValue({
      intent: "tx",
      pubkey: signer.publicKey(),
      network: "testnet",
      xdr: "",
      tx_hash: "",
      signed_envelope_xdr: "",
    });
    const tx = buildTestTransaction(signer, Networks.TESTNET);
    const key = makeAlbedoKey(signer, { network: Networks.TESTNET });

    await expect(
      albedoHandler.signTransaction({ transaction: tx, key }),
    ).rejects.toThrow("We couldn’t sign the transaction with Albedo");
  });
});
