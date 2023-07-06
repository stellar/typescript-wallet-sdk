import * as walletSdk from "./walletSdk";
import { Keypair } from "stellar-sdk";

/**
 * Types
 */
// import * as Types from "./types";

// export { Types };

// /**
//  * Constants
//  */
// export { EffectType } from "./constants/data";
// export { KeyType } from "./constants/keys";
// export { TransferResponseType, TransactionStatus } from "./constants/transfers";
// export { ApprovalResponseStatus, ActionResult } from "./constants/sep8";

// /**
//  * Classes
//  */
// export { KeyManager } from "./KeyManager";
// export { KeyManagerPlugins } from "./KeyManagerPlugins";
// export { DepositProvider, getKycUrl, WithdrawProvider } from "./transfers";


// TODO - figure out why Keypair used in parent codebase throws error
export { walletSdk, Keypair };
export default { walletSdk };
