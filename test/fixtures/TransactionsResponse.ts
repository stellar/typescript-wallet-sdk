import {
  AnchorTransaction,
  TransactionStatus,
} from "../../src/walletSdk/Types";

export const TransactionsResponse: AnchorTransaction[] = [
  {
    id: "db15d166-5a5e-4d5c-ba5d-271c32cd8cf0",
    kind: "withdrawal",
    status: TransactionStatus.pending_user_transfer_start,
    status_eta: null,
    amount_in: "50.55",
    amount_in_asset:
      "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
    amount_out: "75.08",
    amount_out_asset: "iso4217:USD",
    amount_fee: "1.00",
    amount_fee_asset:
      "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
    started_at: "2023-05-26T14:12:35.128156Z",
    completed_at: null,
    stellar_transaction_id: null,
    external_transaction_id: null,
    more_info_url:
      "https://testanchor.stellar.org/sep24/transaction/more_info?id=db15d166-5a5e-4d5c-ba5d-271c32cd8cf0",
    message: "waiting on the user to transfer funds",
    to: null,
    from: "GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5",
    withdraw_memo_type: "hash",
    withdraw_memo: "AAAAAAAAAAAAAAAAAAAAANsV0WZaXk1cul0nHDLNjPA=",
    withdraw_anchor_account:
      "GCSGSR6KQQ5BP2FXVPWRL6SWPUSFWLVONLIBJZUKTVQB5FYJFVL6XOXE",
  },
  {
    id: "hgt1576b-ac28-4c02-a521-ddbfd9ae7poi",
    kind: "deposit",
    status: TransactionStatus.pending_anchor,
    status_eta: null,
    amount_in: "120.45",
    amount_out: "119.45",
    amount_fee: "1.00",
    started_at: "2023-05-26T10:11:27.227597Z",
    completed_at: null,
    stellar_transaction_id: null,
    external_transaction_id: null,
    more_info_url:
      "https://testanchor.stellar.org/sep24/transaction/more_info?id=hgt1576b-ac28-4c02-a521-ddbfd9ae7poi",
    message: "waiting for anchor to process the transaction",
    claimable_balance_id: null,
    to: "GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5",
    from: null,
    deposit_memo_type: "hash",
    deposit_memo: null,
  },
  {
    id: "ac71576b-ac28-4c02-a521-ddbfd9ae73cc",
    kind: "deposit",
    status: TransactionStatus.pending_trust,
    status_eta: null,
    amount_in: "123.45",
    amount_out: "122.45",
    amount_fee: "1.00",
    started_at: "2023-05-26T14:11:27.227597Z",
    completed_at: null,
    stellar_transaction_id: null,
    external_transaction_id: null,
    more_info_url:
      "https://testanchor.stellar.org/sep24/transaction/more_info?id=ac71576b-ac28-4c02-a521-ddbfd9ae73cc",
    message: "waiting for a trustline to be established",
    claimable_balance_id: null,
    to: "GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5",
    from: null,
    deposit_memo_type: "hash",
    deposit_memo: null,
  },
  {
    id: "a20f35fc-f1b0-4657-b0b2-28f77d489df4",
    kind: "deposit",
    status: TransactionStatus.incomplete,
    status_eta: null,
    amount_in: null,
    amount_out: null,
    amount_fee: null,
    started_at: "2023-05-25T18:56:31.727086Z",
    completed_at: null,
    stellar_transaction_id: null,
    external_transaction_id: null,
    more_info_url:
      "https://testanchor.stellar.org/sep24/transaction/more_info?id=a20f35fc-f1b0-4657-b0b2-28f77d489df4",
    message: "incomplete",
    claimable_balance_id: null,
    to: "GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5",
    from: null,
    deposit_memo_type: "hash",
    deposit_memo: null,
  },
  {
    id: "325cf7c4-927d-4b7a-8a1f-d7188ebdde0f",
    kind: "withdrawal",
    status: TransactionStatus.incomplete,
    status_eta: null,
    amount_in: null,
    amount_out: null,
    amount_fee: null,
    started_at: "2023-05-25T18:56:29.615274Z",
    completed_at: null,
    stellar_transaction_id: null,
    external_transaction_id: null,
    more_info_url:
      "https://testanchor.stellar.org/sep24/transaction/more_info?id=325cf7c4-927d-4b7a-8a1f-d7188ebdde0f",
    message: "incomplete",
    to: null,
    from: "GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5",
    withdraw_memo_type: "hash",
    withdraw_memo: null,
    withdraw_anchor_account: null,
  },
  {
    id: "hytcf7c4-927d-4b7a-8a1f-d7188ebddu8i",
    kind: "withdrawal",
    status: TransactionStatus.expired,
    status_eta: null,
    amount_in: null,
    amount_out: null,
    amount_fee: null,
    started_at: "2023-05-25T18:56:29.615274Z",
    completed_at: null,
    stellar_transaction_id: null,
    external_transaction_id: null,
    more_info_url:
      "https://testanchor.stellar.org/sep24/transaction/more_info?id=hytcf7c4-927d-4b7a-8a1f-d7188ebddu8i",
    message: "transaction has expired",
    to: null,
    from: "GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5",
    withdraw_memo_type: "hash",
    withdraw_memo: null,
    withdraw_anchor_account: null,
  },
  {
    id: "def5d166-5a5e-4d5c-ba5d-271c32cd8abc",
    kind: "withdrawal",
    status: TransactionStatus.refunded,
    status_eta: null,
    amount_in: "95.35",
    amount_in_asset:
      "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
    amount_out: "144.48",
    amount_out_asset: "iso4217:USD",
    amount_fee: "1.00",
    amount_fee_asset:
      "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
    started_at: "2023-05-25T13:12:35.128156Z",
    completed_at: "2023-05-26T15:12:35.128156Z",
    stellar_transaction_id:
      "abu0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9cdega",
    external_transaction_id: null,
    more_info_url:
      "https://testanchor.stellar.org/sep24/transaction/more_info?id=def5d166-5a5e-4d5c-ba5d-271c32cd8abc",
    refunds: {
      amount_refunded: "95.35",
      amount_fee: "5",
      payments: [
        {
          id: "1937103",
          id_type: "external",
          amount: "40.0",
          fee: "5",
        },
        {
          id: "b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020",
          id_type: "stellar",
          amount: "55.35",
          fee: "0",
        },
      ],
    },
    message: null,
    to: null,
    from: "GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5",
    withdraw_memo_type: "hash",
    withdraw_memo: "AAAAAAAAAAAAAAAAAAAAANsV0WZaXk1cul0nHDLNjPA=",
    withdraw_anchor_account:
      "GCSGSR6KQQ5BP2FXVPWRL6SWPUSFWLVONLIBJZUKTVQB5FYJFVL6XOXE",
  },
  {
    id: "duh5d166-5a5e-4d5c-ba5d-271c32cd8pok",
    kind: "withdrawal",
    status: TransactionStatus.completed,
    status_eta: null,
    amount_in: "95.35",
    amount_in_asset:
      "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
    amount_out: "144.48",
    amount_out_asset: "iso4217:USD",
    amount_fee: "1.00",
    amount_fee_asset:
      "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
    started_at: "2023-05-27T13:12:35.128156Z",
    completed_at: "2023-05-28T15:12:35.128156Z",
    stellar_transaction_id:
      "hut0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9cdjiu",
    external_transaction_id: null,
    more_info_url:
      "https://testanchor.stellar.org/sep24/transaction/more_info?id=duh5d166-5a5e-4d5c-ba5d-271c32cd8pok",
    refunds: {
      amount_refunded: "35.35",
      amount_fee: "0",
      payments: [
        {
          id: "urh0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9cuhrt",
          id_type: "stellar",
          amount: "35.35",
          fee: "0",
        },
      ],
    },
    message: null,
    to: null,
    from: "GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5",
    withdraw_memo_type: "hash",
    withdraw_memo: "AAAAAAAAAAAAAAAAAAAAANsV0WZaXk1cul0nHDLNjPA=",
    withdraw_anchor_account:
      "GCSGSR6KQQ5BP2FXVPWRL6SWPUSFWLVONLIBJZUKTVQB5FYJFVL6XOXE",
  },
  {
    id: "uyt1576b-ac28-4c02-a521-ddbfd9ae7oiu",
    kind: "deposit",
    status: TransactionStatus.completed,
    status_eta: null,
    amount_in: "150.45",
    amount_out: "149.45",
    amount_fee: "1.00",
    started_at: "2023-05-22T12:11:27.227597Z",
    completed_at: "2023-05-22T18:11:27.227597Z",
    stellar_transaction_id:
      "pokib2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9cbngt",
    external_transaction_id: null,
    more_info_url:
      "https://testanchor.stellar.org/sep24/transaction/more_info?id=uyt1576b-ac28-4c02-a521-ddbfd9ae7oiu",
    message: "deposit completed!",
    claimable_balance_id: null,
    to: "GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5",
    from: null,
    deposit_memo_type: "hash",
    deposit_memo: null,
  },
];
