interface Error {
  message: string; // general description message returned to the client app
  code: number; // unique error code
  ext?: Array<string>; // optional extended details
}

export interface Sep43Interface {
  /**
   * Function used to request the public key from the active account
   *
   * @return Promise<{ address: string } & { error?: Error }>
   */
  getAddress(): Promise<{ address: string } & { error?: Error }>;

  /**
   * A function to request a wallet to sign a built transaction in its XDR mode
   *
   * @param xdr - A Transaction or a FeeBumpTransaction
   * @param opts - Options compatible with https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0043.md#signtransaction
   * @param opts.networkPassphrase - The Stellar network to use when signing
   * @param opts.address - The public key of the account that should be used to sign
   * @param opts.path - This options is added for special cases like Hardware wallets
   *
   * @return Promise<{ signedTxXdr: string; signerAddress: string } & { error?: Error }>
   */
  signTransaction(
    xdr: string,
    opts?: {
      networkPassphrase?: string;
      address?: string;
      path?: string;
      submit?: boolean;
      submitUrl?: string;
    },
  ): Promise<
    { signedTxXdr: string; signerAddress?: string } & { error?: Error }
  >;

  /**
   * A function to request a wallet to sign an AuthEntry XDR.
   *
   * @param authEntry - An XDR string version of `HashIdPreimageSorobanAuthorization`
   * @param opts - Options compatible with https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0043.md#signauthentry
   * @param opts.networkPassphrase - The Stellar network to use when signing
   * @param opts.address - The public key of the account that should be used to sign
   * @param opts.path - This options is added for special cases like Hardware wallets
   *
   * @return - Promise<{ signedAuthEntry: string; signerAddress: string } & { error?: Error }>
   */
  signAuthEntry(
    authEntry: string,
    opts?: {
      networkPassphrase?: string;
      address?: string;
      path?: string;
    },
  ): Promise<
    { signedAuthEntry: string; signerAddress?: string } & { error?: Error }
  >;

  /**
   * A function to request a wallet to sign an AuthEntry XDR.
   *
   * @param message - An arbitrary string rather than a transaction or auth entry
   * @param opts - Options compatible with https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0043.md#signmessage
   * @param opts.networkPassphrase - The Stellar network to use when signing
   * @param opts.address - The public key of the account that should be used to sign
   * @param opts.path - This options is added for special cases like Hardware wallets
   *
   * @return - Promise<{ signedMessage: string; signerAddress: string } & { error?: Error }>
   */
  signMessage(
    message: string,
    opts?: {
      networkPassphrase?: string;
      address?: string;
      path?: string;
    },
  ): Promise<
    { signedMessage: string; signerAddress?: string } & { error?: Error }
  >;

  /**
   * A function to request the current selected network in the wallet. This comes
   * handy when you are dealing with a wallet that doesn't allow you to specify which network to use (For example Lobstr and Rabet)
   *
   * @return - Promise<{ network: string; networkPassphrase: string } & { error?: Error }>
   */
  getNetwork(): Promise<
    { network: string; networkPassphrase: string } & { error?: Error }
  >;
}
