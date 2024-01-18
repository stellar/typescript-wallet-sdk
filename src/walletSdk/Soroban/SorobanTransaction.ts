import {
  authorizeEntry,
  SorobanRpc,
  Transaction,
  Memo,
  MemoType,
  Operation,
  StrKey,
  xdr,
} from "@stellar/stellar-sdk";
import { Wallet } from "../Wallet";

type Tx = Transaction<Memo<MemoType>, Operation[]>;

export class SorobanTransaction {
  public raw?: Tx;

  private wallet: Wallet;

  constructor(
    public options: SorobanRpc.AssembledTransactionOptions,
    wallet?: Wallet,
  ) {
    this.options = options;
    this.wallet = wallet || new Wallet();
  }

  signAndSend = async ({
    secondsToWait = 10,
    force = false,
  }: {
    /**
     * Wait `secondsToWait` seconds (default: 10) for both the transaction to SEND successfully (will keep trying if the server returns `TRY_AGAIN_LATER`), as well as for the transaction to COMPLETE (will keep checking if the server returns `PENDING`).
     */
    secondsToWait?: number;
    /**
     * If `true`, sign and send the transaction even if it is a read call.
     */
    force?: boolean;
  } = {}): Promise<SorobanRpc.SentTransaction<T>> => {
    if (!this.raw) {
      throw new Error("Transaction has not yet been simulated");
    }

    if (!force && SorobanRpc.AssembledTransaction.isReadCall) {
      throw new Error(
        "This is a read call. It requires no signature or sending. Use `force: true` to sign and send anyway.",
      );
    }

    if (!(await SorobanRpc.AssembledTransaction.hasRealInvoker())) {
      throw new SorobanRpc.AssembledTransaction.WalletDisconnectedError(
        "Wallet is not connected",
      );
    }

    if (this.raw.source !== (await this.wallet.getAccount()).accountId()) {
      throw new Error(
        `You must submit the transaction with the account that originally created it. Please switch to the wallet with "${this.raw.source}" as its public key.`,
      );
    }

    if (
      (await SorobanRpc.AssembledTransaction.needsNonInvokerSigningBy()).length
    ) {
      throw new SorobanRpc.AssembledTransaction.NeedsMoreSignaturesError(
        "Transaction requires more signatures. See `needsNonInvokerSigningBy` for details.",
      );
    }

    return await SorobanRpc.SentTransaction.init(
      this.options,
      this,
      secondsToWait,
    );
  };

  signAuthEntries = async (
    /**
     * When to set each auth entry to expire. Could be any number of blocks in
     * the future. Can be supplied as a promise or a raw number. Default:
     * contract's current `persistent` storage expiration date/ledger
     * number/block.
     */
    expiration:
      | number
      | Promise<number> = SorobanRpc.AssembledTransaction.getStorageExpiration(),
  ): Promise<void> => {
    if (!this.raw)
      throw new Error("Transaction has not yet been assembled or simulated");
    const needsNonInvokerSigningBy =
      await SorobanRpc.AssembledTransaction.needsNonInvokerSigningBy();

    if (!needsNonInvokerSigningBy)
      throw new SorobanRpc.AssembledTransaction.NoUnsignedNonInvokerAuthEntriesError(
        "No unsigned non-invoker auth entries; maybe you already signed?",
      );
    const publicKey = await this.wallet.getPublicKey();
    if (!publicKey)
      throw new Error(
        "Could not get public key from wallet; maybe not signed in?",
      );
    if (needsNonInvokerSigningBy.indexOf(publicKey) === -1)
      throw new Error(`No auth entries for public key "${publicKey}"`);
    const wallet = this.options.wallet;

    const rawInvokeHostFunctionOp = this.raw
      .operations[0] as Operation.InvokeHostFunction;

    const authEntries = rawInvokeHostFunctionOp.auth ?? [];

    for (const [i, entry] of authEntries.entries()) {
      if (
        entry.credentials().switch() !==
        xdr.SorobanCredentialsType.sorobanCredentialsAddress()
      ) {
        // if the invoker/source account, then the entry doesn't need explicit
        // signature, since the tx envelope is already signed by the source
        // account, so only check for sorobanCredentialsAddress
        continue;
      }
      const pk = StrKey.encodeEd25519PublicKey(
        entry.credentials().address().address().accountId().ed25519(),
      );

      // this auth entry needs to be signed by a different account
      // (or maybe already was!)
      if (pk !== publicKey) continue;

      authEntries[i] = await authorizeEntry(
        entry,
        async (preimage) =>
          Buffer.from(
            await wallet.signAuthEntry(preimage.toXDR("base64")),
            "base64",
          ),
        await expiration,
        this.options.networkPassphrase,
      );
    }
  };
}
