import * as walletSdk from "./walletSdk";
import { Keypair } from "stellar-sdk";

/**
 * Types
 */
import * as Types from "./walletSdk/Types";

export { Types };

// TODO - figure out why Keypair used in parent codebase throws error
export { walletSdk, Keypair };
export default { walletSdk };
