import { MemoType } from "@stellar/stellar-sdk";
import { Optional } from "utility-types";

import { AuthToken } from "./auth";
import { Sep24AssetInfo, Sep24AssetInfoMap, Sep24Info } from "./sep24";

/**
 * @deprecated Please use Sep24Info interface instead.
 */
export type AnchorServiceInfo = Sep24Info;
/**
 * @deprecated Please use Sep24AssetInfoMap interface instead.
 */
export type AssetInfoMap = Sep24AssetInfoMap;
/**
 * @deprecated Please use Sep24AssetInfo interface instead.
 */
export type AnchorServiceAsset = Sep24AssetInfo;

export interface BaseTransaction {
  id: string;
  kind: string;
  status: TransactionStatus;
  more_info_url: string;
  started_at: string;
  message?: string;
}

export interface ProcessingAnchorTransaction extends BaseTransaction {
  status_eta?: number;
  kyc_verified?: boolean;
  amount_in_asset?: string;
  amount_in: string;
  amount_out_asset?: string;
  amount_out: string;
  amount_fee_asset?: string;
  quote_id?: string;
  amount_fee: string;
  completed_at?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  refunds?: Refunds;
}

export interface DepositTransaction extends ProcessingAnchorTransaction {
  from?: string;
  to?: string;
  deposit_memo?: string;
  deposit_memo_type?: MemoType;
  claimable_balance_id?: string;
}

export interface WithdrawTransaction extends ProcessingAnchorTransaction {
  from: string;
  to?: string;
  withdraw_memo?: string;
  withdraw_memo_type: MemoType;
  withdraw_anchor_account?: string;
}

export type Sep6Transaction = DepositTransaction &
  WithdrawTransaction & {
    from?: string;
    external_extra?: string;
    external_extra_text?: string;
    required_info_message?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    required_info_updates?: any;
    required_customer_info_message?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    required_customer_info_updates?: any;
    instructions?: {
      value: string;
      description: string;
    };
  };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ErrorTransaction
  extends Optional<DepositTransaction & WithdrawTransaction> {}

export type AnchorTransaction =
  | DepositTransaction
  | WithdrawTransaction
  | ErrorTransaction;

export interface Refunds {
  amount_refunded: string;
  amount_fee: string;
  payments: Payment[];
}

export interface Payment {
  id: string;
  id_type: string;
  amount: string;
  fee: string;
}

export type GetTransactionParams = {
  authToken: AuthToken;
  id?: string;
  stellarTransactionId?: string;
  externalTransactionId?: string;
  lang?: string;
};

export type GetTransactionsParams = {
  authToken: AuthToken;
  assetCode: string;
  noOlderThan?: string;
  limit?: number;
  kind?: string;
  pagingId?: string;
  lang?: string;
};

export enum TransactionStatus {
  /**
   * There is not yet enough information for this transaction to be initiated. Perhaps the user has
   * not yet entered necessary info in an interactive flow
   */
  incomplete = "incomplete",

  /**
   * The user has not yet initiated their transfer to the anchor. This is the next necessary step in
   * any deposit or withdrawal flow after transitioning from `incomplete`
   */
  pending_user_transfer_start = "pending_user_transfer_start",

  /**
   * The Stellar payment has been successfully received by the anchor and the off-chain funds are
   * available for the customer to pick up. Only used for withdrawal transactions.
   */
  pending_user_transfer_complete = "pending_user_transfer_complete",

  /**
   * Pending External deposit/withdrawal has been submitted to external network, but is not yet
   * confirmed. This is the status when waiting on Bitcoin or other external crypto network to
   * complete a transaction, or when waiting on a bank transfer.
   */
  pending_external = "pending_external",

  /**
   * Deposit/withdrawal is being processed internally by anchor. This can also be used when the
   * anchor must verify KYC information prior to deposit/withdrawal.
   */
  pending_anchor = "pending_anchor",

  /**
   * Deposit/withdrawal operation has been submitted to Stellar network, but is not yet confirmed.
   */
  pending_stellar = "pending_stellar",

  /** The user must add a trustline for the asset for the deposit to complete. */
  pending_trust = "pending_trust",

  /**
   * The user must take additional action before the deposit / withdrawal can complete, for example
   * an email or 2fa confirmation of a withdrawal.
   */
  pending_user = "pending_user",

  /** Deposit/withdrawal fully completed */
  completed = "completed",

  /** The deposit/withdrawal is fully refunded */
  refunded = "refunded",

  /**
   * Funds were never received by the anchor and the transaction is considered abandoned by the
   * user. Anchors are responsible for determining when transactions are considered expired.
   */
  expired = "expired",

  /**
   * Could not complete deposit because no satisfactory asset/XLM market was available to create the
   * account
   */
  no_market = "no_market",

  /** Deposit/withdrawal size less than min_amount. */
  too_small = "too_small",

  /** Deposit/withdrawal size exceeded max_amount. */
  too_large = "too_large",

  /** Catch-all for any error not enumerated above. */
  error = "error",
  /** deposit/withdrawal is currently on hold for additional checks after receiving user's funds.
   * Anchor may use this status to indicate to the user that transaction is being reviewed (for example,
   * for compliance reasons). Once this status cleared, transaction should follow the regular flow */
  on_hold = "on_hold",
}
