/**
 * Types
 */
import * as Types from "./walletSdk/Types";
export { Types };

/**
 * Classes
 */
export {
  Wallet,
  Config,
  StellarConfiguration,
  ApplicationConfiguration,
} from "./walletSdk";
export { Anchor } from "./walletSdk/Anchor";
export { Sep6, Transfer } from "./walletSdk/Anchor/Sep6";
export { Sep24, Interactive } from "./walletSdk/Anchor/Sep24";
export { Sep38, Quote } from "./walletSdk/Anchor/Sep38";
export {
  StellarAssetId,
  IssuedAssetId,
  NativeAssetId,
  XLM,
  FiatAssetId,
} from "./walletSdk/Asset";
export {
  Sep10,
  Auth,
  WalletSigner,
  DefaultSigner,
  DomainSigner,
} from "./walletSdk/Auth";
export {
  AuthHeaderSigner,
  DefaultAuthHeaderSigner,
  DomainAuthHeaderSigner,
} from "./walletSdk/Auth/AuthHeaderSigner";
export { Sep12, Customer } from "./walletSdk/Customer";
export {
  AccountKeypair,
  PublicKeypair,
  SigningKeypair,
  AccountService,
  Stellar,
  CommonTransactionBuilder,
  TransactionBuilder,
  SponsoringBuilder,
} from "./walletSdk/Horizon";
export { Recovery } from "./walletSdk/Recovery";
export {
  Sep7Base,
  Sep7Pay,
  Sep7Tx,
  isValidSep7Uri,
  parseSep7Uri,
  sep7ReplacementsFromString,
  sep7ReplacementsToString,
} from "./walletSdk/Uri";
export { Watcher } from "./walletSdk/Watcher";

/**
 * Utils
 */
import * as Utils from "./walletSdk/Utils";
export { Utils };

/**
 * Exceptions
 */
import * as Exceptions from "./walletSdk/Exceptions";
export { Exceptions };

/**
 * Server
 */
import * as Server from "./walletSdk/Server";
export { Server };

import * as walletSdk from "./walletSdk";
import { Keypair } from "@stellar/stellar-sdk";
// TODO - figure out why Keypair used in parent codebase throws error
export { walletSdk, Keypair };
export default { walletSdk };
