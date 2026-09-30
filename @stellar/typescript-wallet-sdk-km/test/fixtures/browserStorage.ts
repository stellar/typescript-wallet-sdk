import { BrowserStorageConfigParams } from "../../src/Plugins/BrowserStorageFacade";

export type BrowserStorageArea = BrowserStorageConfigParams["storage"];

/**
 * In-memory stand-in for a browser extension storage area such as
 * `chrome.storage.local`. Like the real API, values are serialized on write
 * and deserialized on read, so callers never share references with the store.
 * @returns {BrowserStorageArea} an empty storage area
 */
export function createBrowserStorageArea(): BrowserStorageArea {
  const items = new Map<string, string>();

  const read = (name: string, fallback?: unknown) =>
    items.has(name) ? JSON.parse(items.get(name)!) : fallback;

  return {
    get: (keys) => {
      const result: Record<string, unknown> = {};

      if (keys === null || keys === undefined) {
        items.forEach((_value, name) => {
          result[name] = read(name);
        });
      } else if (typeof keys === "string" || Array.isArray(keys)) {
        for (const name of typeof keys === "string" ? [keys] : keys) {
          if (items.has(name)) {
            result[name] = read(name);
          }
        }
      } else {
        // an object maps each key to the default returned when it's missing
        for (const [name, fallback] of Object.entries(keys)) {
          result[name] = read(name, fallback);
        }
      }

      return Promise.resolve(result);
    },
    set: (entries) => {
      for (const [name, value] of Object.entries(entries)) {
        items.set(name, JSON.stringify(value));
      }
      return Promise.resolve();
    },
    remove: (keys) => {
      for (const name of typeof keys === "string" ? [keys] : keys) {
        items.delete(name);
      }
      return Promise.resolve();
    },
  };
}
