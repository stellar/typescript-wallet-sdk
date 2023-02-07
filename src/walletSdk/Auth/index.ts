export class Auth {
  constructor() {}

  authenticate() {
    const challengeTx = challenge();
    const signedTx = sign(challengeTx);
    return getToken(signedTx);
  }

  challenge() {}

  sign() {}

  getToken() {}
}
