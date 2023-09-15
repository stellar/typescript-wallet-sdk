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
export { Sep24 } from "./walletSdk/Anchor/Sep24";
export { IssuedAssetId, NativeAssetId, FiatAssetId } from "./walletSdk/Asset";
export { Sep10, WalletSigner, DefaultSigner } from "./walletSdk/Auth";
export {
  AccountKeypair,
  PublicKeypair,
  SigningKeypair,
  AccountService,
  Stellar,
  TransactionBuilder,
  SponsoringBuilder,
} from "./walletSdk/Horizon";
export { Recovery } from "./walletSdk/Recovery";
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

import * as walletSdk from "./walletSdk";
import { Keypair } from "stellar-sdk";
// TODO - figure out why Keypair used in parent codebase throws error
export { walletSdk, Keypair };
export default { walletSdk };
