export class DomainSigningModifiedError extends Error {
  constructor() {
    super(
      "Domain signer returned a transaction whose body differs from the original challenge. Only the client_domain signature should be added.",
    );
    Object.setPrototypeOf(this, DomainSigningModifiedError.prototype);
  }
}
