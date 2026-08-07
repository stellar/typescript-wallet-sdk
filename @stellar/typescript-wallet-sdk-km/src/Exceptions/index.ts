export class DomainSigningModifiedError extends Error {
  constructor() {
    super(
      "Domain signer returned a transaction that differs from the original challenge. Only the client_domain signature should be added — the operations, source account, sequence number, memo and network passphrase must all be left unchanged.",
    );
    this.name = "DomainSigningModifiedError";
    Object.setPrototypeOf(this, DomainSigningModifiedError.prototype);
  }
}
