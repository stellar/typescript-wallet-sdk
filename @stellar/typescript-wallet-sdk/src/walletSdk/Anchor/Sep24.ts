import { AxiosInstance } from "axios";

import { Anchor } from "../Anchor";
import {
  AssetNotSupportedError,
  ServerRequestFailedError,
  MissingTransactionIdError,
} from "../Exceptions";
import {
  FLOW_TYPE,
  Sep24PostParams,
  Sep24PostResponse,
  AnchorTransaction,
  GetTransactionParams,
  GetTransactionsParams,
  AnchorServiceInfo,
  WatcherSepType,
  Sep24Info,
} from "../Types";
import {
  Watcher,
  _getTransactionsForAsset,
  _getTransactionBy,
} from "../Watcher";
import { camelToSnakeCaseObject } from "../Utils";

// Let's prevent exporting this constructor type as
// we should not create this Sep24 class directly.
type Sep24Params = {
  anchor: Anchor;
  httpClient: AxiosInstance;
};

/**
 * @alias Interactive alias for Sep24 class.
 */
export type Interactive = Sep24;

/**
 * Interactive flow for deposit and withdrawal using SEP-24.
 * @see {@link https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md}
 * Do not create this object directly, use the Anchor class.
 * @class
 */
export class Sep24 {
  private anchor: Anchor;
  private httpClient: AxiosInstance;
  private anchorInfo: Sep24Info;

  /**
   * Creates a new instance of the Sep24 class.
   * @constructor
   * @param {Sep24Params} params - Parameters to initialize the Sep24 instance.
   */
  constructor(params: Sep24Params) {
    const { anchor, httpClient } = params;

    this.anchor = anchor;
    this.httpClient = httpClient;
  }

  /**
   * Get SEP-24 anchor information.
   * If `shouldRefresh` is set to `true`, it fetches fresh values; otherwise, it returns cached values if available.
   * @param {boolean} [shouldRefresh=false] - Flag to force a refresh of TOML values.
   * @param {string} [lang=this.anchor.language] - The language in which to retrieve information.
   * @returns {Promise<Sep24Info>} - SEP-24 information about the anchor.
   * @throws {ServerRequestFailedError} If the server request to fetch information fails.
   */
  async info(
    shouldRefresh?: boolean,
    lang: string = this.anchor.language,
  ): Promise<Sep24Info> {
    if (this.anchorInfo && !shouldRefresh) {
      return this.anchorInfo;
    }

    const { transferServerSep24 } = await this.anchor.sep1();
    try {
      const resp = await this.httpClient.get(
        `${transferServerSep24}/info?lang=${lang}`,
      );
      this.anchorInfo = resp.data;
      return resp.data;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
   * @deprecated Please use info() instead.
   *
   * Get SEP-24 anchor information.
   * @returns {Promise<AnchorServiceInfo>} - SEP-24 information about the anchor.
   * @throws {ServerRequestFailedError} If the server request to fetch information fails.
   */
  async getServicesInfo(): Promise<AnchorServiceInfo> {
    return this.info();
  }

  /**
   * Initiates a deposit request.
   * @param {Sep24PostParams} params - The SEP-24 Post params.
   * @param {string} params.assetCode - The asset to deposit.
   * @param {AuthToken} params.authToken - Authentication token for the request.
   * @param {string} [params.lang] - The language for the request (defaults to the Anchor's language).
   * @param {ExtraFields} [params.extraFields] - Additional fields for the request.
   * @param {Memo} [params.destinationMemo] - Memo information for the destination account.
   * @param {string} [params.destinationAccount] - The destination account for the deposit.
   * @returns {Promise<Sep24PostResponse>} The Sep24 response.
   * @throws {AssetNotSupportedError} If the asset is not supported for deposit.
   */
  async deposit({
    assetCode,
    authToken,
    lang,
    extraFields,
    destinationMemo,
    destinationAccount,
  }: Sep24PostParams): Promise<Sep24PostResponse> {
    return this.flow({
      assetCode,
      authToken,
      lang,
      extraFields,
      destinationMemo,
      account: destinationAccount,
      type: FLOW_TYPE.DEPOSIT,
    });
  }

  /**
   * Initiates a withdrawal request.
   * @param {Sep24PostParams} params - The SEP-24 Post params.
   * @param {string} params.assetCode - The asset to withdraw.
   * @param {AuthToken} params.authToken - Authentication token for the request.
   * @param {string} [params.lang] - The language for the request (defaults to the Anchor's language).
   * @param {ExtraFields} [params.extraFields] - Additional fields for the request.
   * @param {string} [params.withdrawalAccount] - The withdrawal account.
   * @returns {Promise<Sep24PostResponse>} The Sep24 response.
   * @throws {AssetNotSupportedError} If the asset is not supported for withdrawal.
   */
  async withdraw({
    assetCode,
    authToken,
    lang,
    extraFields,
    withdrawalAccount,
  }: Sep24PostParams): Promise<Sep24PostResponse> {
    return this.flow({
      assetCode,
      authToken,
      lang,
      extraFields,
      account: withdrawalAccount,
      type: FLOW_TYPE.WITHDRAW,
    });
  }

  private async flow(
    params: Sep24PostParams & { type: FLOW_TYPE },
  ): Promise<Sep24PostResponse> {
    const {
      assetCode,
      authToken,
      lang = this.anchor.language,
      extraFields,
      destinationMemo,
      account,
      type,
    } = params;

    const toml = await this.anchor.sep1();
    const transferServerEndpoint = toml.transferServerSep24;

    const sep24Info = await this.info();

    let assets: string[];
    if (type === FLOW_TYPE.DEPOSIT) {
      assets = Object.keys(sep24Info.deposit);
    } else {
      assets = Object.keys(sep24Info.withdraw);
    }
    if (!assets.includes(assetCode)) {
      throw new AssetNotSupportedError(type, assetCode);
    }
    const memoMap = {};
    if (destinationMemo) {
      memoMap["memo_type"] = destinationMemo.type;
      memoMap["memo"] = destinationMemo.value;
    }

    try {
      const resp = await this.httpClient.post(
        `${transferServerEndpoint}/transactions/${type}/interactive`,
        {
          asset_code: assetCode,
          lang,
          account,
          ...memoMap,
          ...extraFields,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken.token}`,
          },
        },
      );

      const interactiveResponse: Sep24PostResponse = resp.data;

      return interactiveResponse;
    } catch (e) {
      throw new ServerRequestFailedError(e);
    }
  }

  /**
   * Creates a new instance of the Watcher class, to watch sep24 transactions.
   * @returns {Watcher} A new Watcher instance.
   */
  watcher(): Watcher {
    return new Watcher(this.anchor, WatcherSepType.SEP24);
  }

  /**
   * Get single transaction's current status and details from the anchor.
   * @param {GetTransactionParams} params - The Get Transactions params.
   * @param {AuthToken} params.authToken - The authentication token for the account authenticated with the anchor.
   * @param {string} [params.id] - The transaction ID.
   * @param {string} [params.stellarTransactionId] - The Stellar transaction ID.
   * @param {string} [params.externalTransactionId] - The external transaction ID.
   * @param {string} [params.lang] - The language setting.
   * @returns {Promise<AnchorTransaction>} The transaction object.
   * @throws {MissingTransactionIdError} If none of the ID parameters is provided.
   * @throws {InvalidTransactionResponseError} If the anchor returns an invalid transaction response.
   * @throws {ServerRequestFailedError} If the server request fails.
   */
  async getTransactionBy({
    authToken,
    id,
    stellarTransactionId,
    externalTransactionId,
    lang = this.anchor.language,
  }: GetTransactionParams): Promise<AnchorTransaction> {
    if (!id && !stellarTransactionId && !externalTransactionId) {
      throw new MissingTransactionIdError();
    }

    const toml = await this.anchor.sep1();
    const transferServerEndpoint = toml.transferServerSep24;

    // Let's convert all params to snake case for the API call
    const apiParams = camelToSnakeCaseObject({
      id,
      stellarTransactionId,
      externalTransactionId,
      lang,
    });

    return _getTransactionBy<AnchorTransaction>(
      authToken,
      apiParams,
      transferServerEndpoint,
      this.httpClient,
    );
  }

  /**
   * Get account's transactions specified by asset and other params.
   * @param {GetTransactionParams} params - The Get Transactions params.
   * @param {AuthToken} params.authToken - The authentication token for the account authenticated with the anchor.
   * @param {string} params.assetCode - The target asset to query for.
   * @param {string} [params.noOlderThan] - The response should contain transactions starting on or after this date & time.
   * @param {string} [params.limit] - The response should contain at most 'limit' transactions.
   * @param {string} [params.kind] - The kind of transaction that is desired. E.g.: 'deposit', 'withdrawal'.
   * @param {string} [params.pagingId] - The response should contain transactions starting prior to this ID (exclusive).
   * @param {string} [params.lang] - The desired language (localization), it can also accept locale in the format 'en-US'.
   * @returns {Promise<AnchorTransaction[]>} A list of transactions as requested by the client, sorted in time-descending order.
   * @throws {InvalidTransactionsResponseError} Anchor returns an invalid response.
   * @throws {ServerRequestFailedError} If server request fails.
   */
  async getTransactionsForAsset({
    authToken,
    assetCode,
    noOlderThan,
    limit,
    kind,
    pagingId,
    lang = this.anchor.language,
  }: GetTransactionsParams): Promise<AnchorTransaction[]> {
    const toml = await this.anchor.sep1();
    const transferServerEndpoint = toml.transferServerSep24;

    // Let's convert all params to snake case for the API call
    const apiParams = camelToSnakeCaseObject({
      assetCode,
      noOlderThan,
      limit,
      kind,
      pagingId,
      lang,
    });

    return _getTransactionsForAsset<AnchorTransaction>(
      authToken,
      apiParams,
      transferServerEndpoint,
      this.httpClient,
    );
  }
}
