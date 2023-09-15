import { WalletSigner } from "walletSdk/Auth";
import { AuthToken } from "./auth";

export type RecoveryServerKey = string;

export type RecoveryServerSigning = {
  signerAddress: string;
  authToken: AuthToken;
};

/**
 * Recovery server configuration
 *
 * @property endpoint main endpoint (root domain) of SEP-30 recovery server. E.g.
 * `https://testanchor.stellar.org`
 * @property authEndpoint SEP-10 auth endpoint to be used. Should be in format
 * `<https://domain/auth>`. E.g. `https://testanchor.stellar.org/auth`)
 * @property homeDomain is a SEP-10 home domain. E.g. `testanchor.stellar.org`
 * @property walletSigner optional [WalletSigner] used to sign authentication
 */
export type RecoveryServer = {
  endpoint: string;
  authEndpoint: string;
  homeDomain: string;
  walletSigner?: WalletSigner;
  clientDomain?: string;
};

export type RecoveryServerSigningMap = {
  [key: RecoveryServerKey]: RecoveryServerSigning;
};

export type RecoveryServerMap = {
  [key: RecoveryServerKey]: RecoveryServer;
};
