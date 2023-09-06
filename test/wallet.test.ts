import axios, { AxiosInstance } from "axios";
import sinon from "sinon";
import StellarSdk, { Keypair, Memo, MemoText } from "stellar-sdk";

import {
  Anchor,
  ApplicationConfiguration,
  StellarConfiguration,
  Wallet,
} from "../src";
import { DefaultClient } from "../src/walletSdk";
import { ServerRequestFailedError } from "../src/walletSdk/Exceptions";
import { Watcher } from "../src/walletSdk/Watcher";
import { TransactionStatus, AnchorTransaction } from "../src/walletSdk/Types";
import {
  WalletSigner,
  DefaultSigner,
} from "../src/walletSdk/Auth/WalletSigner";
import { SigningKeypair } from "../src/walletSdk/Horizon/Account";
import { Sep24 } from "../src/walletSdk/Anchor/Sep24";
import { DomainSigner } from "../src/walletSdk/Auth/WalletSigner";

import { TransactionsResponse } from "../test/fixtures/TransactionsResponse";

const originalSetTimeout = global.setTimeout;
function sleep(time: number) {
  return new Promise((resolve) => {
    originalSetTimeout(resolve, time);
  });
}

describe("Wallet", () => {
  it("should init", () => {
    Wallet.TestNet();
    Wallet.MainNet();
  });
  it("should be able return a client", async () => {
    let appConfig = new ApplicationConfiguration();
    let wal = new Wallet({
      stellarConfiguration: StellarConfiguration.TestNet(),
      applicationConfiguration: appConfig,
    });
  });
  it("should be able to customize a client", async () => {
    const customClient: AxiosInstance = axios.create({
      baseURL: "https://some-url.com/api",
      timeout: 1000,
      headers: { "X-Custom-Header": "foobar" },
    });
    let appConfig = new ApplicationConfiguration(DefaultSigner, customClient);
    let wal = new Wallet({
      stellarConfiguration: StellarConfiguration.TestNet(),
      applicationConfiguration: appConfig,
    });
  });
});

describe("SEP-24 flow", () => {
  it("should init a wallet with network and domain", () => {
    const Wal = Wallet.TestNet();
    Wal.anchor({ homeDomain: "anchor-domain" });
  });
});

let anchor: Anchor;
let accountKp: SigningKeypair;
let authToken: string;
describe("Anchor", () => {
  beforeAll(() => {
    const Wal = Wallet.TestNet();
    anchor = Wal.anchor({ homeDomain: "testanchor.stellar.org" });
    accountKp = SigningKeypair.fromSecret(
      "SDXC3OHSJZEQIXKEWFDNEZEQ7SW5DWBPW7RKUWI36ILY3QZZ6VER7TXV",
    );
  });
  it("should give TOML info", async () => {
    const resp = await anchor.sep1();

    expect(resp.webAuthEndpoint).toBe("https://testanchor.stellar.org/auth");
    expect(resp.currencies.length).toBe(2);
  });
  it("should be able to authenticate", async () => {
    const auth = await anchor.sep10();

    authToken = await auth.authenticate({ accountKp });
    expect(authToken).toBeTruthy();
    expect(typeof authToken).toBe("string");
  });

  it("should be able to authenticate with client domain", async () => {
    // The Sep10.challenge and Sep10.sign functions are private so lint is
    // complaining about it on a few lines below. So let's mock this auth
    // instance as "any" to work around that.
    const auth = (await anchor.sep10()) as any;
    let signedByClient = false;
    let signedByDomain = false;

    const walletSigner: WalletSigner = {
      signWithClientAccount: ({ transaction, accountKp }) => {
        transaction.sign(accountKp.keypair);
        signedByClient = true;
        return transaction;
      },
      signWithDomainAccount: async ({
        transactionXDR,
        networkPassphrase,
        accountKp,
      }) => {
        // dummy secret key for signing
        const clientDomainKp = Keypair.fromSecret(
          "SC7PKBRGRI5X4XP4QICBZ2NL67VUJJVKFKXDTGSPI3SQYZGC4NZWONIH",
        );
        const transaction = StellarSdk.TransactionBuilder.fromXDR(
          transactionXDR,
          networkPassphrase,
        );
        transaction.sign(clientDomainKp);
        signedByDomain = true;
        return transaction;
      },
    };

    // because using dummy sk and not real demo wallet sk, lets just check that signing is called
    const challengeResponse = await auth.challenge({
      accountKp,
      clientDomain: "demo-wallet-server.stellar.org",
    });
    const txn = await auth.sign({ accountKp, challengeResponse, walletSigner });
    expect(txn).toBeTruthy();
    expect(signedByClient).toBe(true);
    expect(signedByDomain).toBe(true);
  });
  it("should get anchor services info", async () => {
    const serviceInfo = await anchor.sep24().getServicesInfo();

    expect(serviceInfo.deposit).toBeTruthy();
    expect(serviceInfo.withdraw).toBeTruthy();
  });

  it("should give interactive deposit url", async () => {
    const assetCode = "SRT";
    const resp = await anchor.sep24().deposit({
      destinationAccount: accountKp.publicKey,
      assetCode,
      authToken,
      lang: "en-US",
      extraFields: {
        wallet_name: "Test Wallet",
        wallet_url: "https://stellar.org/",
      },
    });

    expect(resp.url).toBeTruthy();
    expect(resp.id).toBeTruthy();
  });

  it("should give interactive deposit url without giving account and giving memo", async () => {
    const assetCode = "SRT";
    const resp = await anchor.sep24().deposit({
      assetCode,
      authToken,
      lang: "en-US",
      destinationMemo: new Memo(MemoText, "test-memo"),
      extraFields: {
        wallet_name: "Test Wallet",
        wallet_url: "https://stellar.org/",
      },
    });

    expect(resp.url).toBeTruthy();
    expect(resp.id).toBeTruthy();
  });

  it("should give interactive withdraw url", async () => {
    const assetCode = "SRT";
    const resp = await anchor.sep24().withdraw({
      withdrawalAccount: accountKp.publicKey,
      assetCode,
      authToken,
      lang: "en-US",
      extraFields: {
        wallet_name: "Test Wallet",
        wallet_url: "https://stellar.org/",
      },
    });

    expect(resp.url).toBeTruthy();
    expect(resp.id).toBeTruthy();
  });

  it("should fetch new transaction by id", async () => {
    const assetCode = "SRT";

    // creates new 'incomplete' deposit transaction
    const { id: transactionId } = await anchor.sep24().deposit({
      assetCode,
      authToken,
    });

    // fetches transaction that has just been created
    const transaction = await anchor.sep24().getTransactionBy({
      authToken,
      id: transactionId,
    });

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
      await anchor.sep24().getTransactionBy({
        authToken,
        id: nonExistingTransactionId,
      });
    }).rejects.toThrowError(ServerRequestFailedError);
  });

  it("should fetch 5 existing transactions by token code", async () => {
    const transactions = await anchor.sep24().getTransactionsForAsset({
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
    const transactions = await anchor.sep24().getTransactionsForAsset({
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
    const transactions = await anchor.sep24().getTransactionsForAsset({
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
      await anchor.sep24().getTransactionsForAsset({
        authToken,
        assetCode: "SRT",
        lang: "en-US",
        pagingId: "randomPagingId",
      });
    }).rejects.toThrowError(ServerRequestFailedError);
  });

  describe("watchAllTransactions", () => {
    let clock: sinon.SinonFakeTimers;
    let watcher: Watcher;

    beforeEach(async () => {
      clock = sinon.useFakeTimers(0);
      watcher = anchor.sep24().watcher();
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
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue(TransactionsResponse);

      // start watching
      const { stop } = watcher.watchAllTransactions({
        authToken,
        assetCode: "SRT",
        lang: "en-US",
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

      // stops watching
      stop();
    });

    test("Return pending and incomplete + watchlist", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThan(9);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });

      // mock default transactions response
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue(TransactionsResponse);

      // start watching
      const { stop } = watcher.watchAllTransactions({
        authToken,
        assetCode: "SRT",
        lang: "en-US",
        onMessage,
        onError,
        // transactions from watchlist should ALWAYS be returned regardless of their statuses
        watchlist: [
          "hytcf7c4-927d-4b7a-8a1f-d7188ebddu8i", // expired
          "def5d166-5a5e-4d5c-ba5d-271c32cd8abc", // refunded
          "uyt1576b-ac28-4c02-a521-ddbfd9ae7oiu", // completed
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

      // stops watching
      stop();
    });

    test("Watch three transaction updates", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThan(9);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });

      // mock default transactions response
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue(TransactionsResponse);

      // start watching
      const { stop } = watcher.watchAllTransactions({
        authToken,
        assetCode: "SRT",
        lang: "en-US",
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
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue(updatedTransactions);

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
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue(updatedTransactions);

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
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue(updatedTransactions);

      clock.next();
      await sleep(1);

      // 5 pending & incomplete + 1 recently completed + 1 recently refunded + 1 recently pending
      expect(onMessage.callCount).toBe(8);
      expect(onError.callCount).toBe(0);

      // stops watching
      stop();
    });

    test("Stops watching after 2 transaction updates", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThan(8);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });

      // mock default transactions response
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue(TransactionsResponse);

      // start watching
      const { stop } = watcher.watchAllTransactions({
        authToken,
        assetCode: "SRT",
        lang: "en-US",
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
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue(updatedTransactions);

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
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue(updatedTransactions);

      clock.next();
      await sleep(1);

      // 5 pending & incomplete + 1 recently completed + 1 recently refunded
      expect(onMessage.callCount).toBe(7);
      expect(onError.callCount).toBe(0);

      // stops watching before next transaction update
      stop();

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
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue(updatedTransactions);

      clock.next();
      await sleep(1);

      // nothing should change or happen after watcher has stopped
      expect(onMessage.callCount).toBe(7);
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
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue([]);

      // start watching
      const { stop } = watcher.watchAllTransactions({
        authToken,
        assetCode: "SRT",
        lang: "en-US",
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

      const completedTransaction: AnchorTransaction = {
        id: "uyt1576b-ac28-4c02-a521-ddbfd9ae7oiu",
        kind: "deposit",
        status: TransactionStatus.completed,
        status_eta: undefined,
        amount_in: "150.45",
        amount_out: "149.45",
        amount_fee: "1.00",
        started_at: "2023-05-22T12:11:27.227597Z",
        completed_at: "2023-05-22T18:11:27.227597Z",
        stellar_transaction_id:
          "pokib2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9cbngt",
        external_transaction_id: undefined,
        more_info_url:
          "https://testanchor.stellar.org/sep24/transaction/more_info?id=uyt1576b-ac28-4c02-a521-ddbfd9ae7oiu",
        message: "deposit completed!",
        claimable_balance_id: undefined,
        to: "GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5",
        from: undefined,
        deposit_memo_type: "hash",
        deposit_memo: undefined,
      };

      // add a new success message
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue([completedTransaction]);

      clock.next();
      await sleep(1);

      // should have a success
      expect(onMessage.callCount).toBe(1);
      expect(onError.callCount).toBe(0);

      // getting the same thing again should change nothing
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue([completedTransaction]);

      clock.next();
      await sleep(1);

      // 1 immediate completed
      expect(onMessage.callCount).toBe(1);
      expect(onError.callCount).toBe(0);

      const refundedTransaction: AnchorTransaction = {
        id: "def5d166-5a5e-4d5c-ba5d-271c32cd8abc",
        kind: "withdrawal",
        status: TransactionStatus.refunded,
        status_eta: undefined,
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
        external_transaction_id: undefined,
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
        message: undefined,
        to: undefined,
        from: "GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5",
        withdraw_memo_type: "hash",
        withdraw_memo: "AAAAAAAAAAAAAAAAAAAAANsV0WZaXk1cul0nHDLNjPA=",
        withdraw_anchor_account:
          "GCSGSR6KQQ5BP2FXVPWRL6SWPUSFWLVONLIBJZUKTVQB5FYJFVL6XOXE",
      };

      // add a new success message
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue([completedTransaction, refundedTransaction]);

      clock.next();
      await sleep(1);

      // 1 immediate completed + 1 immediate refunded
      expect(onMessage.callCount).toBe(2);
      expect(onError.callCount).toBe(0);

      // getting the same thing again should change nothing
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue([completedTransaction, refundedTransaction]);

      clock.next();
      await sleep(1);

      // no updates expected
      expect(onMessage.callCount).toBe(2);
      expect(onError.callCount).toBe(0);

      const expiredTransaction: AnchorTransaction = {
        id: "hytcf7c4-927d-4b7a-8a1f-d7188ebddu8i",
        kind: "withdrawal",
        status: TransactionStatus.expired,
        status_eta: undefined,
        amount_in: undefined,
        amount_out: undefined,
        amount_fee: undefined,
        started_at: "2023-05-25T18:56:29.615274Z",
        completed_at: undefined,
        stellar_transaction_id: undefined,
        external_transaction_id: undefined,
        more_info_url:
          "https://testanchor.stellar.org/sep24/transaction/more_info?id=hytcf7c4-927d-4b7a-8a1f-d7188ebddu8i",
        message: "transaction has expired",
        to: undefined,
        from: "GCZSYKPDWAKPGR7GYFBOIQB3TH352X7ELZL27WSJET5PDVFORDMGYTB5",
        withdraw_memo_type: "hash",
        withdraw_memo: undefined,
        withdraw_anchor_account: undefined,
      };

      // add a new success message
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue([
          completedTransaction,
          refundedTransaction,
          expiredTransaction,
        ]);

      clock.next();
      await sleep(1);

      // 1 immediate completed + 1 immediate refunded + 1 immediate expired
      expect(onMessage.callCount).toBe(3);
      expect(onError.callCount).toBe(0);

      // getting the same thing again should change nothing
      jest
        .spyOn(Sep24.prototype, "getTransactionsForAsset")
        .mockResolvedValue([
          completedTransaction,
          refundedTransaction,
          expiredTransaction,
        ]);

      clock.next();
      await sleep(1);

      // no updates expected
      expect(onMessage.callCount).toBe(3);
      expect(onError.callCount).toBe(0);

      // stops watching
      stop();
    });
  });

  describe("watchOneTransaction", () => {
    let clock: sinon.SinonFakeTimers;
    let watcher: Watcher;

    const makeTransaction = (eta: number, txStatus: TransactionStatus) => ({
      kind: "deposit",
      id: "TEST",
      status: txStatus,
      status_eta: eta,
    });

    beforeEach(async () => {
      clock = sinon.useFakeTimers(0);
      watcher = anchor.sep24().watcher();
      jest.resetAllMocks();
    });

    afterEach(() => {
      clock.restore();
    });

    test("One completed / refunded / expired successes", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBe(0);
      });

      const onSuccess = sinon.spy(() => {
        expect(onSuccess.callCount).toBeLessThanOrEqual(3);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });

      const successfulTransaction = makeTransaction(
        0,
        TransactionStatus.completed,
      );

      // queue up a success
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValue(successfulTransaction);

      // start watching
      const { stop: stop1 } = watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: successfulTransaction.id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      // wait a second, then onSuccess should call back
      await sleep(1);

      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(1);
      expect(onError.callCount).toBe(0);

      // stops watching transaction
      stop1();

      const refundedTransaction = makeTransaction(
        0,
        TransactionStatus.refunded,
      );

      // queue up a success
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValue(refundedTransaction);

      // start watching
      const { stop: stop2 } = watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: refundedTransaction.id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(1);
      expect(onError.callCount).toBe(0);

      // wait a second, then onSuccess should call back
      await sleep(1);

      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(2);
      expect(onError.callCount).toBe(0);

      // stops watching transaction
      stop2();

      const expiredTransaction = makeTransaction(0, TransactionStatus.expired);

      // queue up a success
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValue(expiredTransaction);

      // start watching
      const { stop: stop3 } = watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: expiredTransaction.id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(2);
      expect(onError.callCount).toBe(0);

      // wait a second, then onSuccess should call back
      await sleep(1);

      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(3);
      expect(onError.callCount).toBe(0);

      // stops watching transaction
      stop3();
    });

    test("One incomplete / pending_user_transfer_start messages", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThanOrEqual(2);
      });

      const onSuccess = sinon.spy(() => {
        expect(onSuccess.callCount).toBe(0);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });

      const incompleteTransaction = makeTransaction(
        0,
        TransactionStatus.incomplete,
      );

      // queue up an incomplete transaction response
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValue(incompleteTransaction);

      // start watching
      watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: incompleteTransaction.id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      // wait a second, then onMessage should call back
      await sleep(1);

      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      const pendingTransaction = makeTransaction(
        0,
        TransactionStatus.pending_user_transfer_start,
      );

      // queue up a pending transaction response
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValue(pendingTransaction);

      // start watching
      watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: pendingTransaction.id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      // wait a second, then onMessage should call back
      await sleep(1);

      expect(onMessage.callCount).toBe(2);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);
    });

    test("One error / no_market errors", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBe(0);
      });

      const onSuccess = sinon.spy(() => {
        expect(onSuccess.callCount).toBe(0);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeTruthy();
        expect(onError.callCount).toBeLessThanOrEqual(2);
      });

      const errorTransaction = makeTransaction(0, TransactionStatus.error);

      // queue up an error transaction response
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValue(errorTransaction);

      // start watching
      watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: errorTransaction.id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      // wait a second, then onMessage should call back
      await sleep(1);

      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(1);

      const noMarketTransaction = makeTransaction(
        0,
        TransactionStatus.no_market,
      );

      // queue up a "no market" transaction response
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValue(noMarketTransaction);

      // start watching
      watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: noMarketTransaction.id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(1);

      // wait a second, then onMessage should call back
      await sleep(1);

      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(2);
    });

    test("Several pending transactions, one completed, no more after that", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThanOrEqual(8);
      });

      const onSuccess = sinon.spy(() => {
        expect(onSuccess.callCount).toBeLessThanOrEqual(1);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });

      // queue up several pending status updates
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValueOnce(makeTransaction(0, TransactionStatus.incomplete))
        .mockResolvedValueOnce(
          makeTransaction(1, TransactionStatus.pending_user),
        )
        .mockResolvedValueOnce(
          makeTransaction(2, TransactionStatus.pending_anchor),
        )
        .mockResolvedValueOnce(
          makeTransaction(3, TransactionStatus.pending_external),
        )
        .mockResolvedValueOnce(
          makeTransaction(4, TransactionStatus.pending_stellar),
        )
        .mockResolvedValueOnce(
          makeTransaction(5, TransactionStatus.pending_trust),
        )
        .mockResolvedValueOnce(
          makeTransaction(6, TransactionStatus.pending_user_transfer_start),
        )
        .mockResolvedValueOnce(
          makeTransaction(7, TransactionStatus.pending_user_transfer_complete),
        )
        .mockResolvedValueOnce(makeTransaction(8, TransactionStatus.completed))
        .mockResolvedValueOnce(
          makeTransaction(9, TransactionStatus.pending_anchor),
        )
        .mockResolvedValueOnce(
          makeTransaction(10, TransactionStatus.pending_external),
        );

      // start watching
      watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: makeTransaction(0, TransactionStatus.incomplete).id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      // loop through all pending statuses updates
      await sleep(1);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      // 1 incomplete + 7 pending transactions
      expect(onMessage.callCount).toBe(8);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      clock.next();
      await sleep(1);

      // the next time a success should happen
      expect(onMessage.callCount).toBe(8);
      expect(onSuccess.callCount).toBe(1);
      expect(onError.callCount).toBe(0);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      // after success, nothing should change or run again
      expect(onMessage.callCount).toBe(8);
      expect(onSuccess.callCount).toBe(1);
      expect(onError.callCount).toBe(0);
    });

    test("Stops watching after 3 transaction updates", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThanOrEqual(3);
      });

      const onSuccess = sinon.spy(() => {
        expect(onSuccess.callCount).toBeLessThanOrEqual(0);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });

      // queue up several pending status updates
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValueOnce(makeTransaction(0, TransactionStatus.incomplete))
        .mockResolvedValueOnce(
          makeTransaction(1, TransactionStatus.pending_user),
        )
        .mockResolvedValueOnce(
          makeTransaction(2, TransactionStatus.pending_anchor),
        )
        .mockResolvedValueOnce(
          makeTransaction(3, TransactionStatus.pending_external),
        )
        .mockResolvedValueOnce(
          makeTransaction(4, TransactionStatus.pending_stellar),
        )
        .mockResolvedValueOnce(
          makeTransaction(5, TransactionStatus.pending_trust),
        );

      // start watching
      const { stop } = watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: makeTransaction(0, TransactionStatus.incomplete).id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      // loop through all pending statuses updates
      await sleep(1);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      // 1 incomplete + 2 pending transactions
      expect(onMessage.callCount).toBe(3);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      // stops watching after the third update
      stop();

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      // after stopping, nothing should change or run again
      expect(onMessage.callCount).toBe(3);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);
    });

    test("One pending, one completed, no more after that", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThanOrEqual(1);
      });

      const onSuccess = sinon.spy(() => {
        expect(onSuccess.callCount).toBeLessThanOrEqual(1);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });

      // queue up transactions
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValueOnce(
          makeTransaction(0, TransactionStatus.pending_user_transfer_complete),
        )
        .mockResolvedValueOnce(makeTransaction(1, TransactionStatus.completed))
        .mockResolvedValueOnce(
          makeTransaction(2, TransactionStatus.pending_anchor),
        )
        .mockResolvedValueOnce(
          makeTransaction(3, TransactionStatus.pending_external),
        );

      // start watching
      watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: makeTransaction(0, TransactionStatus.pending_user_transfer_complete)
          .id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      await sleep(1);

      // wait a second, then the pending should resolve
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      clock.next();
      await sleep(1);

      // the second time, a success should happen
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(1);
      expect(onError.callCount).toBe(0);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      // after success, nothing should change or run again
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(1);
      expect(onError.callCount).toBe(0);
    });

    test("One pending, one refunded, no more after that", async () => {
      const onMessage = sinon.spy((e) => {
        expect(onMessage.callCount).toBeLessThanOrEqual(1);
      });

      const onSuccess = sinon.spy(() => {
        expect(onSuccess.callCount).toBeLessThanOrEqual(1);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeUndefined();
      });

      // queue up transactions
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValueOnce(
          makeTransaction(0, TransactionStatus.pending_user_transfer_complete),
        )
        .mockResolvedValueOnce(makeTransaction(1, TransactionStatus.refunded))
        .mockResolvedValueOnce(
          makeTransaction(2, TransactionStatus.pending_anchor),
        )
        .mockResolvedValueOnce(
          makeTransaction(3, TransactionStatus.pending_external),
        );

      // start watching
      watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: makeTransaction(0, TransactionStatus.pending_user_transfer_complete)
          .id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      await sleep(1);

      // wait a second, then the pending should resolve
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      clock.next();
      await sleep(1);

      // the second time, a success should happen
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(1);
      expect(onError.callCount).toBe(0);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      // after success, nothing should change or run again
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(1);
      expect(onError.callCount).toBe(0);
    });

    test("One pending, one error, no more after that", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThanOrEqual(1);
      });

      const onSuccess = sinon.spy(() => {
        expect(onSuccess.callCount).toBe(0);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeTruthy();
        expect(onError.callCount).toBeLessThanOrEqual(1);
      });

      // queue up transactions
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValueOnce(
          makeTransaction(0, TransactionStatus.pending_user_transfer_start),
        )
        .mockResolvedValueOnce(makeTransaction(1, TransactionStatus.error))
        .mockResolvedValueOnce(
          makeTransaction(2, TransactionStatus.pending_anchor),
        )
        .mockResolvedValueOnce(
          makeTransaction(3, TransactionStatus.pending_external),
        );

      // start watching
      watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: makeTransaction(0, TransactionStatus.pending_user_transfer_start)
          .id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      await sleep(1);

      // wait a second, then the pending should resolve
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      clock.next();
      await sleep(1);

      // the second time, a error should happen
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(1);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      // after error, nothing should change or run again
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(1);
    });

    test("One pending, one no_market, no more after that", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThanOrEqual(1);
      });

      const onSuccess = sinon.spy(() => {
        expect(onSuccess.callCount).toBe(0);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeTruthy();
        expect(onError.callCount).toBeLessThanOrEqual(1);
      });

      // queue up transactions
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValueOnce(
          makeTransaction(0, TransactionStatus.pending_user_transfer_start),
        )
        .mockResolvedValueOnce(makeTransaction(1, TransactionStatus.no_market))
        .mockResolvedValueOnce(
          makeTransaction(2, TransactionStatus.pending_anchor),
        )
        .mockResolvedValueOnce(
          makeTransaction(3, TransactionStatus.pending_external),
        );

      // start watching
      watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: makeTransaction(0, TransactionStatus.pending_user_transfer_start)
          .id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      await sleep(1);

      // wait a second, then the pending should resolve
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      clock.next();
      await sleep(1);

      // the second time, a error should happen
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(1);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      // after error, nothing should change or run again
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(1);
    });

    test("Two pending, one error, no more after that", async () => {
      const onMessage = sinon.spy(() => {
        expect(onMessage.callCount).toBeLessThanOrEqual(2);
      });

      const onSuccess = sinon.spy(() => {
        expect(onSuccess.callCount).toBe(0);
      });

      const onError = sinon.spy((e) => {
        expect(e).toBeTruthy();
        expect(onError.callCount).toBeLessThanOrEqual(1);
      });

      // queue up transactions
      jest
        .spyOn(Sep24.prototype, "getTransactionBy")
        .mockResolvedValueOnce(
          makeTransaction(0, TransactionStatus.pending_user_transfer_start),
        )
        .mockResolvedValueOnce(
          makeTransaction(1, TransactionStatus.pending_user_transfer_complete),
        )
        .mockResolvedValueOnce(makeTransaction(2, TransactionStatus.error))
        .mockResolvedValueOnce(
          makeTransaction(3, TransactionStatus.pending_anchor),
        )
        .mockResolvedValueOnce(
          makeTransaction(4, TransactionStatus.pending_external),
        );

      // start watching
      watcher.watchOneTransaction({
        authToken,
        assetCode: "SRT",
        id: makeTransaction(0, TransactionStatus.pending_user_transfer_start)
          .id,
        onMessage,
        onSuccess,
        onError,
        timeout: 1,
        lang: "en-US",
      });

      // nothing should run at first
      expect(onMessage.callCount).toBe(0);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      await sleep(1);

      // wait a second, then the pending should resolve
      expect(onMessage.callCount).toBe(1);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      clock.next();
      await sleep(1);

      // the next time, another pending
      expect(onMessage.callCount).toBe(2);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(0);

      clock.next();
      await sleep(1);

      // the next time, an error
      expect(onMessage.callCount).toBe(2);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(1);

      clock.next();
      await sleep(1);

      clock.next();
      await sleep(1);

      // after error, nothing should change or run again
      expect(onMessage.callCount).toBe(2);
      expect(onSuccess.callCount).toBe(0);
      expect(onError.callCount).toBe(1);
    });
  });
});

describe("DomainSigner", () => {
  it("should work", async () => {
    jest.spyOn(DefaultClient, "post").mockResolvedValue({
      data: {
        transaction:
          "AAAAAgAAAADVJRbxdB+qXZjUMLcrL/VVoS6megW1ReSxIO33pvO61AAAB9AAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAACwAAAAAAAAACAAAAAAAAAAA=",
      },
    });
    const signer = new DomainSigner("example url");
    const txn = await signer.signWithDomainAccount({
      transactionXDR: "test-xdr",
      networkPassphrase: "Test SDF Network ; September 2015",
      accountKp: SigningKeypair.fromSecret(
        "SBYAW5H46NNDGCECWMWWM32DE4DPNN3RHVMNTR3BXXZX2DJF6LZWBMWZ",
      ),
    });
    expect(txn).toBeTruthy();
  });
});

describe("Http client", () => {
  it("should work with http", async () => {
    const accountKp = Keypair.fromSecret(
      "SDXC3OHSJZEQIXKEWFDNEZEQ7SW5DWBPW7RKUWI36ILY3QZZ6VER7TXV",
    );
    const client = DefaultClient;

    const resp = await client.get(
      `http://testanchor.stellar.org/auth?account=${accountKp.publicKey()}`,
    );
    expect(resp.data.transaction).toBeTruthy();
  });
});
