export class Auth {
  authEndpoint = "";
  publicKey = "";

  // ALEC TODO - include public key here?
  constructor(authEndpoint, publicKey) {
    this.authEndpoint = authEndpoint;
    this.publicKey = publicKey;
  }

  authenticate() {
    const challengeTx = challenge(this.publicKey);
    console.log({ challengeTx }); // ALEC TODO - remove
    // const signedTx = sign(challengeTx);
    // return getToken(signedTx);
  }

  challenge(publicKey) {
    const auth = await fetch(
      `${this.authEndpoint}?account=${this.publicKey}`
    );
    const { challengeTx } = await auth.json();
    console.log({ challengeTx }); // ALEC TODO - remove
    return challengeTx;
  }

  sign() {}

  getToken() {}
}
