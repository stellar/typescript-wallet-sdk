/**
 * Types
 */
import * as Types from "./walletSdk/Types";
export { Types };

/**
 * Classes
 */
export { Anchor } from "./walletSdk/Anchor";
export { Auth, WalletSigner, DefaultSigner } from "./walletSdk/Auth";
export { 
  PublicKeypair, 
  SigningKeypair, 
  AccountService, 
  Stellar 
} from "./walletSdk/Horizon";
export { Interactive } from "./walletSdk/Interactive";
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
