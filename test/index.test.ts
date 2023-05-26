import sinon from "sinon";
import { Keypair } from "stellar-sdk";

import sdk from "../src";
import { ServerRequestFailedError } from "../src/walletSdk/exception";
import { TransactionStatus } from "../src/walletSdk/Anchor/Types";

import { TransactionsResponse } from "../test/fixtures/TransactionsResponse";

const originalSetTimeout = global.setTimeout;
function sleep(time: number) {
  return new Promise((resolve) => {
    originalSetTimeout(resolve, time);
  });
}

const { walletSdk } = sdk;
describe("Wallet", () => {
  it("should init", () => {
    walletSdk.Wallet.TestNet();
    walletSdk.Wallet.MainNet();
  });
});

describe("SEP-24 flow", () => {
  it("should init a wallet with network and domain", () => {
    const Wal = walletSdk.Wallet.TestNet();
    Wal.anchor("anchor-domain");
  });
});

let anchor;
let accountKp;
let authToken;
describe("Anchor", () => {
  beforeEach(() => {
    const Wal = walletSdk.Wallet.TestNet();
    anchor = Wal.anchor("testanchor.stellar.org");
    accountKp = Keypair.fromSecret(
      "SDXC3OHSJZEQIXKEWFDNEZEQ7SW5DWBPW7RKUWI36ILY3QZZ6VER7TXV"
    );
  });

  it("should be able to authenticate", async () => {
    const auth = await anchor.auth();
    authToken = await auth.authenticate(accountKp);

    expect(authToken).toBeTruthy();
    expect(typeof authToken).toBe("string");
  });

  it("should give TOML info", async () => {
    const resp = await anchor.getInfo();

    expect(resp.webAuthEndpoint).toBe("https://testanchor.stellar.org/auth");
    expect(resp.currencies.length).toBe(2);
  });

  it("should get anchor services info", async () => {
    const serviceInfo = await anchor.getServicesInfo();

    expect(serviceInfo.deposit).toBeTruthy();
    expect(serviceInfo.withdraw).toBeTruthy();
  });

  it("should give interactive deposit url", async () => {
    const assetCode = "SRT";
    const resp = await anchor
      .interactive()
      .deposit(accountKp.publicKey(), assetCode, authToken);

    expect(resp.url).toBeTruthy();
    expect(resp.id).toBeTruthy();
  });

  it("should give interactive withdraw url", async () => {
    const assetCode = "SRT";
    const resp = await anchor
      .interactive()
      .withdraw(accountKp.publicKey(), assetCode, authToken);

    expect(resp.url).toBeTruthy();
    expect(resp.id).toBeTruthy();
  });

  it("should fetch new transaction by id", async () => {
    const assetCode = "SRT";

    // creates new 'incomplete' deposit transaction
    const { id: transactionId } = await anchor
      .interactive()
      .deposit(accountKp.publicKey(), assetCode, authToken);

    // fetches transaction that has just been created
    const transaction = await anchor
      .getTransactionBy({ authToken, id: transactionId });
  
    const { id, kind, status, amount_in, amount_out } = transaction;

    expect(transaction).toBeTruthy();
    expect(id === transactionId).toBeTruthy;
    expect(kind === "deposit").toBeTruthy;
    expect(status === "incomplete").toBeTruthy;
    // we expect fresh 'incomplete' transactions to not have amounts set yet
    expect(amount_in).toBeFalsy;
    expect(amount_out).toBeFalsy;
  });

  it("should error fetching non-existing transaction by id", async () => {
    await expect(async () => { 
      const nonExistingTransactionId = "da8575e9-edc6-4f99-98cf-2b302f203cc7";
      await anchor.getTransactionBy({ authToken, id: nonExistingTransactionId });
    }).rejects.toThrowError(ServerRequestFailedError)
  });

  it("should fetch 5 existing transactions by token code", async () => {
    const transactions = await anchor
      .getTransactionsForAsset({
        authToken,  
        assetCode: "SRT",
        limit: 5,
        lang: "en-US",
      });

    transactions.forEach(({ status }) => {
      expect(status).toBeTruthy();
      expect(typeof status).toBe("string");
    });

    expect(transactions.length === 5).toBeTruthy();
  });

  it("should fetch 3 existing deposit transactions by token code", async () => {
    const transactions = await anchor
      .getTransactionsForAsset({ 
        authToken, 
        assetCode: "SRT",
        limit: 3,
        kind: "deposit",
        lang: "en-US",
      });

    transactions.forEach(({ kind }) => {
      expect(kind === "deposit").toBeTruthy();    
    });

    expect(transactions.length === 3).toBeTruthy();
  });

  it("should fetch 2 existing withdrawal transactions by token code", async () => {
    const transactions = await anchor
      .getTransactionsForAsset({
        authToken,  
        assetCode: "SRT",
        limit: 2,
        kind: "withdrawal",
        lang: "en-US",
      });

    transactions.forEach(({ kind }) => {
      expect(kind === "withdrawal").toBeTruthy();    
    });

    expect(transactions.length === 2).toBeTruthy();
  });

  it("should error fetching transactions with invalid pading id", async () => {
    await expect(async () => { 
      await anchor
      .getTransactionsForAsset({
        authToken,  
        assetCode: "SRT",
        lang: "en-US",
        pagingId: "randomPagingId",
      });
    }).rejects.toThrowError(ServerRequestFailedError)
  });

  describe("watchAllTransactions", () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(async () => {
      clock = sinon.useFakeTimers(0);
    });
  
    afterEach(() => {
      clock.restore();
    });
  
    test("Return only pending and incomplete", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThan(6);
      });
  
      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });
  
      // mock default transactions response
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue(TransactionsResponse);

      // start watching
      anchor.watchAllTransactions({
        authToken, 
        requestParams: {
          assetCode: "SRT",
          lang: "en-US",
        },
        onMessage,
        onError,
        timeout: 1,
      });

      // nothing should run at first (async api call in progress)
      expect(onMessage.callCount).toBe(0);
      expect(onError.callCount).toBe(0);
  
      await sleep(1);
      
      // 5 pending & incomplete
      expect(onMessage.callCount).toBe(5);
      expect(onError.callCount).toBe(0);
    });
  
    test("Return pending and incomplete + watchlist", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThan(9);
      });
  
      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });
  
      // mock default transactions response
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue(TransactionsResponse);

      // start watching
      anchor.watchAllTransactions({
        authToken, 
        requestParams: {
          assetCode: "SRT",
          lang: "en-US",
        },
        onMessage,
        onError,
        // transactions from watchlist should ALWAYS be returned regardless of their statuses
        watchlist: [
          "hytcf7c4-927d-4b7a-8a1f-d7188ebddu8i", // expired
          "def5d166-5a5e-4d5c-ba5d-271c32cd8abc", // refunded
          "uyt1576b-ac28-4c02-a521-ddbfd9ae7oiu"  // completed
        ],
        timeout: 1,
      });

      // nothing should run at first (async api call in progress)
      expect(onMessage.callCount).toBe(0);
      expect(onError.callCount).toBe(0);
  
      await sleep(1);
      
      // 5 pending & incomplete + 3 from watchlist
      expect(onMessage.callCount).toBe(8);
      expect(onError.callCount).toBe(0);
    });

    test("Watch three transaction updates", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThan(9);
      });
  
      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });
  
      // mock default transactions response
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue(TransactionsResponse);
  
      // start watching
      anchor.watchAllTransactions({
        authToken, 
        requestParams: {
          assetCode: "SRT",
          lang: "en-US",
        },
        onMessage,
        onError,
        timeout: 1,
      });
  
      // nothing should run at first (async api call in progress)
      expect(onMessage.callCount).toBe(0);
      expect(onError.callCount).toBe(0);
  
      await sleep(1);
  
      // 5 pending & incomplete 
      expect(onMessage.callCount).toBe(5);
      expect(onError.callCount).toBe(0);
  
      // change one transaction to "completed"
      const [firstTxA, ...restA] = TransactionsResponse;
      let updatedTransactions = [
        {
          ...firstTxA,
          status: TransactionStatus.completed,
        },
        ...restA,
      ];
  
      // update mock with new transaction status
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue(updatedTransactions);
  
      clock.next();
      await sleep(1);
  
      // 5 pending & incomplete + 1 recently completed
      expect(onMessage.callCount).toBe(6);
      expect(onError.callCount).toBe(0);
  
      await sleep(1);
  
      // 5 pending & incomplete + 1 recently completed
      expect(onMessage.callCount).toBe(6);
      expect(onError.callCount).toBe(0);
  
      // change another transaction to "refunded"
      const [firstTxB, secondTxB, ...restB] = updatedTransactions;
      updatedTransactions = [
        firstTxB,
        {
          ...secondTxB,
          status: TransactionStatus.refunded,
        },
        ...restB,
      ];
  
      // update mock with new transaction status
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue(updatedTransactions);
  
      clock.next();
      await sleep(1);
  
      // 5 pending & incomplete + 1 recently completed + 1 recently refunded
      expect(onMessage.callCount).toBe(7);
      expect(onError.callCount).toBe(0);

      // change another transaction to "pending_user_transfer_start"
      const [firstTxC, secondTxC, thirdTxC, ...restC] = updatedTransactions;
      updatedTransactions = [
        firstTxC,
        secondTxC,
        {
          ...thirdTxC,
          status: TransactionStatus.pending_user_transfer_start,
        },
        ...restC,
      ];
  
      // update mock with new transaction status
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue(updatedTransactions);
  
      clock.next();
      await sleep(1);
  
      // 5 pending & incomplete + 1 recently completed + 1 recently refunded + 1 recently pending
      expect(onMessage.callCount).toBe(8);
      expect(onError.callCount).toBe(0);
    });
  
    test("Immediate completed|refunded|expired should get messages", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThan(4);
      });
  
      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });
  
      // mock an empty transactions array
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue([]);
  
      // start watching
      anchor.watchAllTransactions({
        authToken, 
        requestParams: {
          assetCode: "SRT",
          lang: "en-US",
        },
        onMessage,
        onError,
        timeout: 1,
      });
  
      // nothing should run at first (async api call in progress)
      expect(onMessage.callCount).toBe(0);
      expect(onError.callCount).toBe(0);
  
      await sleep(1);
  
      // still nothing
      expect(onMessage.callCount).toBe(0);
      expect(onError.callCount).toBe(0);
  
      const completedTransaction = {
        id: 'uyt1576b-ac28-4c02-a521-ddbfd9ae7oiu',
        kind: 'deposit',
        status: 'completed',
        status_eta: null,
        amount_in: '150.45',
        amount_out: '149.45',
        amount_fee: '1.00',
        started_at: '2023-05-22T12:11:27.227597Z',
        completed_at: '2023-05-22T18:11:27.227597Z',
        stellar_transaction_id: "pokib2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9cbngt",
        external_transaction_id: null,
        more_info_url: 'https://testanchor.stellar.org/sep24/transaction/more_info?id=uyt1576b-ac28-4c02-a521-ddbfd9ae7oiu',
        refunded: false,
        message: 'deposit completed!',
        claimable_balance_id: null,
        to: 'GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5',
        from: null,
        deposit_memo_type: 'hash',
        deposit_memo: null
      };

      // add a new success message
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue([completedTransaction]);
  
      clock.next();
      await sleep(1);
  
      // should have a success
      expect(onMessage.callCount).toBe(1);
      expect(onError.callCount).toBe(0);
  
      // getting the same thing again should change nothing
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue([completedTransaction]);
  
      clock.next();
      await sleep(1);
  
      // 1 immediate completed
      expect(onMessage.callCount).toBe(1);
      expect(onError.callCount).toBe(0);

      const refundedTransaction =   {
        id: 'def5d166-5a5e-4d5c-ba5d-271c32cd8abc',
        kind: 'withdrawal',
        status: 'refunded',
        status_eta: null,
        amount_in: '95.35',
        amount_in_asset: 'stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B',
        amount_out: '144.48',
        amount_out_asset: 'iso4217:USD',
        amount_fee: '1.00',
        amount_fee_asset: 'stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B',
        started_at: '2023-05-25T13:12:35.128156Z',
        completed_at: '2023-05-26T15:12:35.128156Z',
        stellar_transaction_id: "abu0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9cdega",
        external_transaction_id: null,
        more_info_url: 'https://testanchor.stellar.org/sep24/transaction/more_info?id=def5d166-5a5e-4d5c-ba5d-271c32cd8abc',
        refunded: true,
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
              id:"b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020",
              id_type: "stellar",
              amount: "55.35",
              fee: "0",
            },
          ],
        },
        message: null,
        to: null,
        from: 'GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5',
        withdraw_memo_type: 'hash',
        withdraw_memo: 'AAAAAAAAAAAAAAAAAAAAANsV0WZaXk1cul0nHDLNjPA=',
        withdraw_anchor_account: 'GCSGSR6KQQ5BP2FXVPWRL6SWPUSFWLVONLIBJZUKTVQB5FYJFVL6XOXE',
      };

      // add a new success message
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue([completedTransaction, refundedTransaction]);

      clock.next();
      await sleep(1);
  
      // 1 immediate completed + 1 immediate refunded
      expect(onMessage.callCount).toBe(2);
      expect(onError.callCount).toBe(0);
  
      // getting the same thing again should change nothing
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue([completedTransaction, refundedTransaction]);
  
      clock.next();
      await sleep(1);
  
      // no updates expected
      expect(onMessage.callCount).toBe(2);
      expect(onError.callCount).toBe(0);

      const expiredTransaction = {
        id: 'hytcf7c4-927d-4b7a-8a1f-d7188ebddu8i',
        kind: 'withdrawal',
        status: 'expired',
        status_eta: null,
        amount_in: null,
        amount_out: null,
        amount_fee: null,
        started_at: '2023-05-25T18:56:29.615274Z',
        completed_at: null,
        stellar_transaction_id: null,
        external_transaction_id: null,
        more_info_url: 'https://testanchor.stellar.org/sep24/transaction/more_info?id=hytcf7c4-927d-4b7a-8a1f-d7188ebddu8i',
        refunded: false,
        message: 'transaction has expired',
        to: null,
        from: 'GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5',
        withdraw_memo_type: 'hash',
        withdraw_memo: null,
        withdraw_anchor_account: null
      };

      // add a new success message
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue([
        completedTransaction, 
        refundedTransaction, 
        expiredTransaction
      ]);

      clock.next();
      await sleep(1);
  
      // 1 immediate completed + 1 immediate refunded + 1 immediate expired
      expect(onMessage.callCount).toBe(3);
      expect(onError.callCount).toBe(0);
  
      // getting the same thing again should change nothing
      jest.spyOn(anchor, "getTransactionsForAsset").mockResolvedValue([
        completedTransaction, 
        refundedTransaction, 
        expiredTransaction
      ]);
  
      clock.next();
      await sleep(1);
  
      // no updates expected
      expect(onMessage.callCount).toBe(3);
      expect(onError.callCount).toBe(0);
    });
  });
});


