import { Networks, Horizon } from "stellar-sdk";
import { AnchorTransaction, FLOW_TYPE, GetCustomerParams } from "../Types";

export class ServerRequestFailedError extends Error {
  constructor(e: Error) {
    super(`Server request failed with error: ${e}`);
    Object.setPrototypeOf(this, ServerRequestFailedError.prototype);
  }
}

export class AssetNotSupportedError extends Error {
  constructor(type: FLOW_TYPE, assetCode: string) {
    super(`Asset ${assetCode} not supported` + (type ? ` for ${type}` : ""));
    Object.setPrototypeOf(this, AssetNotSupportedError.prototype);
  }
}

export class InvalidMemoError extends Error {
  constructor() {
    super(`Memo ID must be a positive integer`);
    Object.setPrototypeOf(this, InvalidMemoError.prototype);
  }
}

export class ClientDomainWithMemoError extends Error {
  constructor() {
    super(`Client domain cannot be used with memo`);
    Object.setPrototypeOf(this, ClientDomainWithMemoError.prototype);
  }
}

export class MissingTransactionIdError extends Error {
  constructor() {
    super(
      `One of id, stellarTransactionId or externalTransactionId is required`,
    );
    Object.setPrototypeOf(this, MissingTransactionIdError.prototype);
  }
}

export class InvalidTransactionResponseError extends Error {
  constructor(transactionResponse: AnchorTransaction) {
    super(
      `Invalid transaction in response data: ${JSON.stringify(
        transactionResponse,
      )}`,
    );
    Object.setPrototypeOf(this, InvalidTransactionResponseError.prototype);
  }
}

export class InvalidTransactionsResponseError extends Error {
  constructor(transactionsResponse: AnchorTransaction[]) {
    super(
      `Invalid transactions in response data: ${JSON.stringify(
        transactionsResponse,
      )}`,
    );
    Object.setPrototypeOf(this, InvalidTransactionsResponseError.prototype);
  }
}

export class AccountDoesNotExistError extends Error {
  constructor(network: Networks) {
    super(`source account does not exist on network ${network}`);
    Object.setPrototypeOf(this, AccountDoesNotExistError.prototype);
  }
}

export class TransactionSubmitFailedError extends Error {
  constructor(response: Horizon.SubmitTransactionResponse) {
    super(`Submit transaction failed ${JSON.stringify(response)}`);
    Object.setPrototypeOf(this, TransactionSubmitFailedError.prototype);
  }
}

export class InsufficientStartingBalanceError extends Error {
  constructor() {
    super(`Insufficient starting balance`);
    Object.setPrototypeOf(this, InsufficientStartingBalanceError.prototype);
  }
}

export class MissingTokenError extends Error {
  constructor() {
    super("Token was not returned");
    Object.setPrototypeOf(this, MissingTokenError.prototype);
  }
}

export class InvalidTokenError extends Error {
  constructor() {
    super(`Invalid token given`);
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

export class ExpiredTokenError extends Error {
  constructor(expiresAt: number) {
    super(`Token has already expired. Expiration time: ${expiresAt}`);
    Object.setPrototypeOf(this, ExpiredTokenError.prototype);
  }
}

export class TransactionSubmitWithFeeIncreaseFailedError extends Error {
  constructor(maxFee: number, e: Error) {
    super(
      `Submitting transasction with fee increase failed due to reaching max fee of ${maxFee}: ${e}`,
    );
    Object.setPrototypeOf(
      this,
      TransactionSubmitWithFeeIncreaseFailedError.prototype,
    );
  }
}

export class SignerRequiredError extends Error {
  constructor() {
    super(`Either a SigningKeypair or a signerFunction required`);
    Object.setPrototypeOf(this, SignerRequiredError.prototype);
  }
}

export class OperationsLimitExceededError extends Error {
  constructor(maxLimit: number) {
    super(`Maximum limit is ${maxLimit} operations`);
    Object.setPrototypeOf(this, OperationsLimitExceededError.prototype);
  }
}

export class WithdrawalTxNotPendingUserTransferStartError extends Error {
  constructor(status: string) {
    super(
      `Transaction status needs to be pending_user_transfer_start, given: ${status}`,
    );
    Object.setPrototypeOf(
      this,
      WithdrawalTxNotPendingUserTransferStartError.prototype,
    );
  }
}

export class WithdrawalTxMissingMemoError extends Error {
  constructor() {
    super(`Withdrawal transaction missing memo`);
    Object.setPrototypeOf(this, WithdrawalTxMissingMemoError.prototype);
  }
}

export class PathPayOnlyOneAmountError extends Error {
  constructor() {
    super("Must give sendAmount or destAmount value, but not both");
    Object.setPrototypeOf(this, PathPayOnlyOneAmountError.prototype);
  }
}

export class WithdrawalTxMemoError extends Error {
  constructor() {
    super(`Error parsing withdrawal transaction memo`);
    Object.setPrototypeOf(this, WithdrawalTxMemoError.prototype);
  }
}

export class Sep9InfoRequiredError extends Error {
  constructor() {
    super(`Sep-9 info required`);
    Object.setPrototypeOf(this, Sep9InfoRequiredError.prototype);
  }
}

export class CustomerNotFoundError extends Error {
  constructor(params: GetCustomerParams) {
    super(`Customer not found using params ${JSON.stringify(params)}`);
    Object.setPrototypeOf(this, CustomerNotFoundError.prototype);
  }
}

export class KYCServerNotFoundError extends Error {
  constructor() {
    super(`Required KYC server URL not found`);
    Object.setPrototypeOf(this, KYCServerNotFoundError.prototype);
  }
}

export class RecoveryServerNotFoundError extends Error {
  constructor(serverKey: string) {
    super(`Server with key ${serverKey} was not found`);
    Object.setPrototypeOf(this, RecoveryServerNotFoundError.prototype);
  }
}

export class RecoveryIdentityNotFoundError extends Error {
  constructor(serverKey: string) {
    super(`Account identity for server ${serverKey} was not specified`);
    Object.setPrototypeOf(this, RecoveryIdentityNotFoundError.prototype);
  }
}

export class NotAllSignaturesFetchedError extends Error {
  constructor() {
    super(`Didn't get all recovery server signatures`);
    Object.setPrototypeOf(this, NotAllSignaturesFetchedError.prototype);
  }
}

export class LostSignerKeyNotFound extends Error {
  constructor() {
    super(`Lost key doesn't belong to the account`);
    Object.setPrototypeOf(this, LostSignerKeyNotFound.prototype);
  }
}

export class NoDeviceKeyForAccountError extends Error {
  constructor() {
    super(`No device key is setup for this account`);
    Object.setPrototypeOf(this, NoDeviceKeyForAccountError.prototype);
  }
}

export class UnableToDeduceKeyError extends Error {
  constructor() {
    super(`Couldn't deduce lost key. Please provide lost key explicitly`);
    Object.setPrototypeOf(this, UnableToDeduceKeyError.prototype);
  }
}

export class NoAccountSignersError extends Error {
  constructor() {
    super(`There are no signers on this recovery server`);
    Object.setPrototypeOf(this, NoAccountSignersError.prototype);
  }
}

export class DeviceKeyEqualsMasterKeyError extends Error {
  constructor() {
    super(`Device key must be different from master (account) key`);
    Object.setPrototypeOf(this, DeviceKeyEqualsMasterKeyError.prototype);
  }
}

export class NoAccountAndNoSponsorError extends Error {
  constructor() {
    super(`Account does not exist and is not sponsored`);
    Object.setPrototypeOf(this, NoAccountAndNoSponsorError.prototype);
  }
}

export class Sep12MissingInfoError extends Error {
  constructor(missingFields) {
    super(
      `SEP-12 KYC info missing. Submit to anchor missing fields: ${missingFields}`,
    );
    Object.setPrototypeOf(this, Sep12MissingInfoError.prototype);
  }
}

export class Sep6DepositDeniedError extends Error {
  constructor(data) {
    super(
      `Sep-6 information is either still being processed or not accepted. ${data}`,
    );
    Object.setPrototypeOf(this, Sep6DepositDeniedError.prototype);
  }
}
