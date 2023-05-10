import * as walletSdk from "./walletSdk";
import { Keypair } from "stellar-sdk";

// TODO - figure out why Keypair used in parent codebase throws error
export { walletSdk, Keypair };
export default { walletSdk };
