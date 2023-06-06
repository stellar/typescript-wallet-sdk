import { MemoType } from "stellar-sdk";
import { TransactionStatus } from "../Watcher/Types";

export interface AnchorServiceInfo {
  deposit: { [key: string]: AnchorServiceAsset };
  withdraw: { [key: string]: AnchorServiceAsset };
  fee: { enabled: boolean };
  features: { account_creation: boolean; claimable_balances: boolean };
}

interface BaseTransaction {
  id: string;
  kind: string;
  status: TransactionStatus;
  more_info_url: string;
  started_at: string;
  message?: string;
}

interface ProcessingAnchorTransaction extends BaseTransaction {
  status_eta?: number;
  kyc_verified?: boolean;
  amount_in_asset?: string;
  amount_in: string;
  amount_out_asset?: string;
  amount_out: string;
  amount_fee_asset?: string;
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
  withdraw_anchor_account: string;
}

interface ErrorTransaction extends ProcessingAnchorTransaction {
  from?: string;
  to?: string;
  deposit_memo?: string;
  deposit_memo_type?: MemoType;
  claimable_balance_id?: string;
  withdraw_memo?: string;
  withdraw_memo_type?: MemoType;
  withdraw_anchor_account?: string;
}

export type AnchorTransaction =
  | DepositTransaction
  | WithdrawTransaction
  | ErrorTransaction;

interface Payment {
  id: string;
  id_type: string;
  amount: string;
  fee: string;
}

interface Refunds {
  amount_refunded: string;
  amount_fee: string;
  payments: Payment[];
}

interface AnchorServiceAsset {
  enabled: boolean;
  min_amount: number;
  max_amount: number;
  fee_fixed: number;
  fee_percent: number;
}
