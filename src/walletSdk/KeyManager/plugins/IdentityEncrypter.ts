import { DecryptParams, Encrypter, EncryptParams } from "../../Types";

const NAME = "IdentityEncrypter";

/**
 * "Encrypt" keys in a very basic, naive way.
 */
export const IdentityEncrypter: Encrypter = {
  name: NAME,
  encryptKey(params: EncryptParams) {
    const { key } = params;
    const { type, privateKey, publicKey, path, extra, ...props } = key;

    return Promise.resolve({
      ...props,
      encryptedBlob: JSON.stringify({
        type,
        publicKey,
        privateKey,
        path,
        extra,
      }),
      encrypterName: NAME,
      salt: "identity",
    });
  },

  decryptKey(params: DecryptParams) {
    const { encryptedKey } = params;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { encrypterName, salt, encryptedBlob, ...props } =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      encryptedKey as any;

    const data = JSON.parse(encryptedBlob);

    return Promise.resolve({ ...props, ...data });
  },
};
