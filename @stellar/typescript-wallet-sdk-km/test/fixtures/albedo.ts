import {
  Keypair,
  Networks,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

// The tx intent's `network` param takes a network name or that network's
// passphrase, and Albedo signs with the matching passphrase.
const albedoPassphrases: { [network: string]: string } = {
  public: Networks.PUBLIC,
  testnet: Networks.TESTNET,
  [Networks.PUBLIC]: Networks.PUBLIC,
  [Networks.TESTNET]: Networks.TESTNET,
};

// Stands in for albedo.link answering a tx intent: it signs the XDR with the
// user's account for the requested network ("public" when none is given) and
// echoes that network back.
export function albedoSigningWith(signer: Keypair) {
  return ({ xdr: envelope, network }: { xdr: string; network?: string }) => {
    const responseNetwork = network || "public";
    const tx = TransactionBuilder.fromXdr(
      envelope,
      albedoPassphrases[responseNetwork],
    ) as Transaction;
    tx.sign(signer);

    return Promise.resolve({
      intent: "tx",
      pubkey: signer.publicKey(),
      network: responseNetwork,
      xdr: envelope,
      tx_hash: xdr.encodeBytes(tx.hash(), "hex"),
      signed_envelope_xdr: tx.toXdr(),
    });
  };
}
