import { EncryptedKey } from "../Types";

export interface BrowserStorageConfigParams {
  prefix?: string;
  storage: {
    get: (
      key?: null | string | string[] | Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
    remove: (key: string | string[]) => Promise<void>;
    set: (items: Record<string, unknown>) => Promise<void>;
  };
}

const PREFIX = "stellarkeys";

/**
 * Facade for `BrowserStorageKeyStore` encapsulating the access to the actual
 * browser storage
 */
export class BrowserStorageFacade {
  private storage: Storage | null;
  private prefix: string;

  constructor() {
    this.storage = null;
    this.prefix = PREFIX;
  }

  public configure(params: BrowserStorageConfigParams) {
    Object.assign(this, params);
  }

  public async hasKey(id: string) {
    this.check();

    return this.storage !== null
      ? !!Object.keys(await this.storage.get(`${this.prefix}:${id}`)).length
      : null;
  }

  public async getKey(id: string) {
    this.check();
    const key = `${this.prefix}:${id}`;
    const itemObj = this.storage !== null ? await this.storage.get(key) : null;

    const item = itemObj[key];
    return item || null;
  }

  public setKey(id: string, key: EncryptedKey) {
    this.check();
    return this.storage !== null
      ? this.storage.set({ [`${this.prefix}:${id}`]: { ...key } })
      : null;
  }

  public setKeys(keys: EncryptedKey[]) {
    this.check();
    const items: Record<string, EncryptedKey> = {};

    for (const key of keys) {
      items[`${this.prefix}:${key.id}`] = { ...key };
    }

    return this.storage !== null ? this.storage.set(items) : null;
  }

  public removeKey(id: string) {
    this.check();
    return this.storage !== null
      ? this.storage.remove(`${this.prefix}:${id}`)
      : null;
  }

  public async getAllKeys() {
    this.check();
    const keyPrefix = `${this.prefix}:`;
    const keys: EncryptedKey[] = [];

    if (this.storage !== null) {
      const storageObj = await this.storage.get(null);
      const storageKeys = Object.keys(storageObj);
      for (const storageKey of storageKeys) {
        if (storageKey.startsWith(keyPrefix)) {
          const key = await this.getKey(storageKey.slice(keyPrefix.length));
          if (key !== null) {
            keys.push(key);
          }
        }
      }
    }
    return keys;
  }

  private check() {
    if (this.storage === null) {
      throw new Error("A storage object must have been set");
    }
    if (this.prefix === "") {
      throw new Error("A non-empty prefix must have been set");
    }
    return this.storage !== null && this.prefix !== "";
  }
}
