import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

/**
 * React Native's Hermes runtime provides none of Buffer, Event, EventTarget or
 * process. Loading each published bundle in a context without them catches the
 * two failure modes this SDK has actually shipped: a reliance on the Buffer
 * global, and dependencies that subclass the DOM Event globals at module scope.
 */
const BANNED = ["Buffer", "Event", "EventTarget", "process"];

const makeHermesLikeContext = () => {
  const sandbox: Record<string, unknown> = {
    console,
    TextEncoder,
    TextDecoder,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    crypto: globalThis.crypto,
    fetch: globalThis.fetch,
    // Unlike Buffer, btoa/atob are real Hermes/React Native globals (RN's
    // core polyfills provide them), and uint8array-extras' base64 encoding
    // depends on them unconditionally with no Buffer fallback.
    btoa: globalThis.btoa,
    atob: globalThis.atob,
    module: { exports: {} },
    exports: {},
  };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;

  const context = vm.createContext(sandbox);
  for (const name of BANNED) {
    vm.runInContext(
      `if (typeof ${name} !== "undefined") { throw new Error("${name} leaked into the sandbox"); }`,
      context,
    );
  }
  return context;
};

const bundles = [
  ["core SDK", "../../lib/bundle_browser.js"],
  ["key manager", "../../../typescript-wallet-sdk-km/lib/bundle_browser.js"],
  ["soroban", "../../../typescript-wallet-sdk-soroban/lib/bundle_browser.js"],
] as const;

describe("React Native (Hermes-like) bundle compatibility", () => {
  for (const [name, relativePath] of bundles) {
    it(`loads the ${name} bundle without Buffer/Event/EventTarget/process`, () => {
      const bundlePath = path.resolve(__dirname, relativePath);
      expect(fs.existsSync(bundlePath)).toBe(true);

      const context = makeHermesLikeContext();
      const code = fs.readFileSync(bundlePath, "utf8");

      expect(() =>
        vm.runInContext(code, context, { filename: `${name}.js` }),
      ).not.toThrow();
    });
  }

  it("exercises the core SDK public API in the sandbox", () => {
    const context = makeHermesLikeContext();
    const code = fs.readFileSync(
      path.resolve(__dirname, "../../lib/bundle_browser.js"),
      "utf8",
    );
    vm.runInContext(code, context, { filename: "bundle_browser.js" });

    // Sep7Pay.addSignature is the densest no-Buffer path in our own code: it
    // runs concatUint8Arrays + stringToUint8Array to build the payload, signs
    // it, then base64-encodes via xdr.encodeBytes.
    const result = vm.runInContext(
      `(() => {
        const { Wallet, Sep7Pay } = module.exports;
        const kp = Wallet.TestNet().stellar().account().createKeypair();
        const uri = Sep7Pay.forDestination(kp.publicKey);
        return { publicKey: kp.publicKey, signature: uri.addSignature(kp.keypair) };
      })()`,
      context,
    ) as { publicKey: string; signature: string };

    expect(result.publicKey).toMatch(/^G[A-Z2-7]{55}$/);
    // The decisive assertion: base64 encoding worked without Buffer. A broken
    // encoder yields comma-joined decimals.
    expect(result.signature).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(result.signature).toHaveLength(88);
  });
});
