import sinon from "sinon";

import { testKeyStore, testEncrypter } from "./pluginTesting";
import {
  BrowserStorageArea,
  createBrowserStorageArea,
} from "./fixtures/browserStorage";
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

describe("BrowserStorageKeyStore with an in-memory storage area", () => {
  const encryptedKey: EncryptedKey = {
    id: "PURIFIER",
    encryptedBlob: "BLOB",
    encrypterName: "Test",
    salt: "SLFKJSDLKFJLSKDJFLKSJD",
  };

  let storage: BrowserStorageArea;
  let testStore: BrowserStorageKeyStore;

  beforeEach(async () => {
    storage = createBrowserStorageArea();
    testStore = new BrowserStorageKeyStore();
    await testStore.configure({ storage });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("passes PluginTesting", async () => {
    expect(await testKeyStore(testStore)).toEqual(true);
  });

  it("passes PluginTesting with a custom prefix", async () => {
    await testStore.configure({ storage, prefix: "mywallet" });

    expect(await testKeyStore(testStore)).toEqual(true);
  });

  it("updates a stored key", async () => {
    await testStore.storeKeys([encryptedKey]);
    const updatedKey = { ...encryptedKey, encryptedBlob: "NEW BLOB" };

    expect(await testStore.updateKeys([updatedKey])).toEqual([
      { id: "PURIFIER" },
    ]);
    expect(await storage.get(null)).toEqual({
      "stellarkeys:PURIFIER": updatedKey,
    });
  });

  it("rejects an update naming only the missing keys, and writes none", async () => {
    await testStore.storeKeys([encryptedKey]);

    await expect(
      testStore.updateKeys([
        { ...encryptedKey, encryptedBlob: "NEW BLOB" },
        { ...encryptedKey, id: "ARCHANGEL", encryptedBlob: "OTHER BLOB" },
      ]),
    ).rejects.toEqual("Some keys couldn't be found in the keystore: ARCHANGEL");
    expect(await storage.get(null)).toEqual({
      "stellarkeys:PURIFIER": encryptedKey,
    });
  });

  it("rejects an update when the storage write fails", async () => {
    await testStore.storeKeys([encryptedKey]);
    sinon.stub(storage, "set").rejects(new Error("QUOTA_BYTES exceeded"));

    await expect(
      testStore.updateKeys([{ ...encryptedKey, encryptedBlob: "NEW BLOB" }]),
    ).rejects.toThrow("QUOTA_BYTES exceeded");
  });

  it("loads only the keys stored under its own prefix", async () => {
    const walletStore = new BrowserStorageKeyStore();
    await walletStore.configure({ storage, prefix: "mywallet" });
    const walletKeys = [
      { ...encryptedKey, encryptedBlob: "WALLET BLOB" },
      { ...encryptedKey, id: "ARCHANGEL", encryptedBlob: "OTHER BLOB" },
    ];

    await testStore.storeKeys([encryptedKey]);
    await walletStore.storeKeys(walletKeys);
    await storage.set({ settings: { theme: "dark" } });

    expect(await walletStore.loadAllKeys()).toEqual(walletKeys);
    expect(await testStore.loadAllKeys()).toEqual([encryptedKey]);
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
