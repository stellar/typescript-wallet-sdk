import { EncryptedKey, KeyMetadata } from "../Types";

export function getKeyMetadata(encryptedKey: EncryptedKey): KeyMetadata {
  const { id } = encryptedKey;

  return {
    id,
  };
}
