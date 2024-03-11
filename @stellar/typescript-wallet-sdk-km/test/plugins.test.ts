import sinon from "sinon";

import { testKeyStore, testEncrypter } from "./pluginTesting";
import { EncryptedKey, KeyType, Key } from "../src/Types";
import {
  BrowserStorageKeyStore,
  LocalStorageKeyStore,
  MemoryKeyStore,
  ScryptEncrypter,
  IdentityEncrypter,
} from "../src/Plugins";

import { LocalStorage } from "node-localstorage";
import os from "os";
import path from "path";

// tslint:disable-next-line
describe("BrowserStorageKeyStore", function () {
  let clock: sinon.SinonFakeTimers;
  let testStore: BrowserStorageKeyStore;
  const encryptedKey: EncryptedKey = {
    id: "PURIFIER",
    encryptedBlob: "BLOB",
    encrypterName: "Test",
    salt: "SLFKJSDLKFJLSKDJFLKSJD",
  };
  const keyMetadata = {
    id: "PURIFIER",
  };
  const chrome = {
    storage: {
      local: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        get: (_key?: string | string[] | object) => Promise.resolve({}),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        set: (_items: object) => Promise.resolve({}),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        remove: (_key: string | string[]) => Promise.resolve(),
      },
    },
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers(666);
    testStore = new BrowserStorageKeyStore();

    testStore.configure({ storage: chrome.storage.local });
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it("properly stores keys", async () => {
    const chromeStorageLocalGetStub = sinon.stub(chrome.storage.local, "get");

    /* first call returns empty to confirm keystore 
    doesn't already exist before storing */
    chromeStorageLocalGetStub.onCall(0).returns(Promise.resolve({}));
    const testMetadata = await testStore.storeKeys([encryptedKey]);

    expect(testMetadata).toEqual([keyMetadata]);

    // subsequent calls return the keystore as expected
    chromeStorageLocalGetStub.returns(
      Promise.resolve({ [`stellarkeys:${encryptedKey.id}`]: encryptedKey }),
    );
    const allKeys = await testStore.loadAllKeys();

    expect(allKeys).toEqual([{ ...encryptedKey, ...keyMetadata }]);
  });

  it("properly deletes keys", async () => {
    const chromeStorageLocalGetStub = sinon.stub(chrome.storage.local, "get");

    /* first call returns empty to confirm keystore 
    doesn't already exist before storing */
    chromeStorageLocalGetStub.onCall(0).returns(Promise.resolve({}));
    await testStore.storeKeys([encryptedKey]);

    // subsequent calls return the keystore as expected
    chromeStorageLocalGetStub.returns(
      Promise.resolve({ [`stellarkeys:${encryptedKey.id}`]: encryptedKey }),
    );

    const allKeys = await testStore.loadAllKeys();

    expect(allKeys).toEqual([{ ...encryptedKey, ...keyMetadata }]);

    const removalMetadata = await testStore.removeKey("PURIFIER");
    chromeStorageLocalGetStub.returns(Promise.resolve({}));

    expect(removalMetadata).toEqual(keyMetadata);
    const noKeys = await testStore.loadAllKeys();

    expect(noKeys).toEqual([]);
  });
});

// tslint:disable-next-line
describe("LocalStorageKeyStore", function () {
  let clock: sinon.SinonFakeTimers;
  let testStore: LocalStorageKeyStore;
  let localStorage: Storage;

  beforeEach(() => {
    clock = sinon.useFakeTimers(666);
    testStore = new LocalStorageKeyStore();
    localStorage = new LocalStorage(
      path.resolve(os.tmpdir(), "js-stellar-wallets"),
    );
    testStore.configure({ storage: localStorage });
  });

  afterEach(() => {
    clock.restore();
    localStorage.clear();
  });

  it("properly stores keys", async () => {
    const encryptedKey: EncryptedKey = {
      id: "PURIFIER",
      encryptedBlob: "BLOB",
      encrypterName: "Test",
      salt: "SLFKJSDLKFJLSKDJFLKSJD",
    };

    const keyMetadata = {
      id: "PURIFIER",
    };

    const testMetadata = await testStore.storeKeys([encryptedKey]);

    expect(testMetadata).toEqual([keyMetadata]);

    const allKeys = await testStore.loadAllKeys();

    expect(allKeys).toEqual([{ ...encryptedKey, ...keyMetadata }]);
  });

  it("properly deletes keys", async () => {
    const encryptedKey: EncryptedKey = {
      id: "PURIFIER",
      encrypterName: "Test",
      encryptedBlob: "BLOB",
      salt: "SLFKJSDLKFJLSKDJFLKSJD",
    };

    const keyMetadata = {
      id: "PURIFIER",
    };

    await testStore.storeKeys([encryptedKey]);

    const allKeys = await testStore.loadAllKeys();

    expect(allKeys).toEqual([{ ...encryptedKey, ...keyMetadata }]);

    const removalMetadata = await testStore.removeKey("PURIFIER");

    expect(removalMetadata).toEqual(keyMetadata);

    const noKeys = await testStore.loadAllKeys();

    expect(noKeys).toEqual([]);
  });

  it("passes PluginTesting", (done) => {
    testKeyStore(testStore)
      .then(() => {
        done();
      })
      .catch(done);
  });
});

// tslint:disable-next-line
describe("MemoryKeyStore", function () {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(666);
  });

  afterEach(() => {
    clock.restore();
  });

  it("properly stores keys", async () => {
    const testStore = new MemoryKeyStore();

    const encryptedKey: EncryptedKey = {
      id: "PURIFIER",
      encryptedBlob: "BLOB",
      encrypterName: "Test",
      salt: "SLFKJSDLKFJLSKDJFLKSJD",
    };

    const keyMetadata = {
      id: "PURIFIER",
    };

    const testMetadata = await testStore.storeKeys([encryptedKey]);

    expect(testMetadata).toEqual([keyMetadata]);

    const allKeys = await testStore.loadAllKeys();

    expect(allKeys).toEqual([{ ...encryptedKey, ...keyMetadata }]);
  });

  it("properly deletes keys", async () => {
    const testStore = new MemoryKeyStore();

    const encryptedKey: EncryptedKey = {
      id: "PURIFIER",
      encrypterName: "Test",
      encryptedBlob: "BLOB",
      salt: "SLFKJSDLKFJLSKDJFLKSJD",
    };

    const keyMetadata = {
      id: "PURIFIER",
    };

    await testStore.storeKeys([encryptedKey]);

    const allKeys = await testStore.loadAllKeys();

    expect(allKeys).toEqual([{ ...encryptedKey, ...keyMetadata }]);

    const removalMetadata = await testStore.removeKey("PURIFIER");

    expect(removalMetadata).toEqual(keyMetadata);

    const noKeys = await testStore.loadAllKeys();

    expect(noKeys).toEqual([]);
  });

  it("passes PluginTesting", (done) => {
    testKeyStore(new MemoryKeyStore())
      .then(() => {
        done();
      })
      .catch(done);
  });
});

describe("ScryptEncrypter", () => {
  test("encrypts and decrypts a key", async () => {
    const key = {
      type: KeyType.plaintextKey,
      publicKey: "AVACYN",
      privateKey: "ARCHANGEL",
      id: "PURIFIER",
      path: "PATH",
      extra: "EXTRA",
    };

    const password = "This is a really cool password and is good";

    const encryptedKey = await ScryptEncrypter.encryptKey({
      key,
      password,
    });

    expect(encryptedKey).toBeTruthy();
    expect(encryptedKey.encryptedBlob).toBeTruthy();
    expect(encryptedKey.encryptedBlob).not.toEqual(key.privateKey);

    const decryptedKey = await ScryptEncrypter.decryptKey({
      encryptedKey,
      password,
    });

    expect(decryptedKey.privateKey).not.toEqual(encryptedKey.encryptedBlob);
    expect(decryptedKey).toEqual(key);
  });

  it("passes PluginTesting", async () => {
    expect(await testEncrypter(ScryptEncrypter)).toEqual(true);
  });
});

describe("IdentityEncrypter", () => {
  const key: Key = {
    id: "PURIFIER",
    type: KeyType.plaintextKey,
    publicKey: "AVACYN",
    privateKey: "ARCHANGEL",
  };

  const encryptedKey: EncryptedKey = {
    id: "PURIFIER",
    encryptedBlob: JSON.stringify({
      type: KeyType.plaintextKey,
      publicKey: "AVACYN",
      privateKey: "ARCHANGEL",
    }),
    encrypterName: "IdentityEncrypter",
    salt: "identity",
  };

  it("encrypts to itself", async () => {
    expect(await IdentityEncrypter.encryptKey({ key, password: "" })).toEqual(
      encryptedKey,
    );
  });

  it("decrypts to itself", async () => {
    expect(
      await IdentityEncrypter.decryptKey({ encryptedKey, password: "" }),
    ).toEqual(key);
  });

  it("passes PluginTesting", async () => {
    expect(await testEncrypter(IdentityEncrypter)).toEqual(true);
  });
});
