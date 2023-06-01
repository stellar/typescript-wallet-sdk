export class ServerRequestFailedError extends Error {
    constructor(e) {
        super(`server request failed with error: ${e}`);
        Object.setPrototypeOf(this, ServerRequestFailedError.prototype);
    }
}

export class AssetNotSupportedError extends Error {
    constructor(type, assetCode) {
        super(`asset ${assetCode} not supported for ${type}`);
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

// TODO - test how error is being printed
export class MissingAuthenticationError extends Error {
    constructor() {
        super(`Authentication is required. Either provide an 'authToken' value as function param or set it through Anchor's 'setAuthToken'.`);
        Object.setPrototypeOf(this, MissingAuthenticationError.prototype);
    }
}

export class MissingTransactionIdError extends Error {
    constructor() {
        super(`One of id, stellarTransactionId or externalTransactionId is required`);
        Object.setPrototypeOf(this, MissingTransactionIdError.prototype);
    }
}

export class InvalidTransactionResponseError extends Error {
    constructor(transactionResponse) {
        super(`Invalid transaction in response data: ${JSON.stringify(transactionResponse)}`);
        Object.setPrototypeOf(this, InvalidTransactionResponseError.prototype);
    }
}

export class InvalidTransactionsResponseError extends Error {
    constructor(transactionsResponse) {
        super(`Invalid transactions in response data: ${JSON.stringify(transactionsResponse)}`);
        Object.setPrototypeOf(this, InvalidTransactionsResponseError.prototype);
    }
}
