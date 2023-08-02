import { Networks, Horizon } from "stellar-sdk";
import { AnchorTransaction, FLOW_TYPE } from "../Types";

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
    super(`Submit transaction failed ${response}`);
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
