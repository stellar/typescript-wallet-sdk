import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

/**
 * React Native's Hermes runtime provides none of Buffer, Event, EventTarget or
 * process. Loading each published bundle in a context without them catches the
 * two failure modes this SDK has actually shipped: a reliance on the Buffer
 * global, and dependencies that subclass the DOM Event globals at module scope.
 *
 * The sandbox also *grants* a few globals that a real RN app must supply
 * itself, so this file is explicit about what environment it is modelling:
 *
 * - `crypto`: Hermes/RN does not provide this either. A real RN app needs
 *   `react-native-get-random-values` (or equivalent) for stellar-sdk's RNG
 *   path. This was already true under v16 and is not new to this migration.
 * - `btoa`/`atob`: see the dedicated comment below.
 * - `TextEncoder`/`TextDecoder`: see the dedicated comment below.
 */
const BANNED = ["Buffer", "Event", "EventTarget", "process"];

const makeHermesLikeContext = ({
  includeBase64 = true,
  includeTextCodec = true,
} = {}) => {
  const sandbox: Record<string, unknown> = {
    console,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    crypto: globalThis.crypto,
    fetch: globalThis.fetch,
    module: { exports: {} },
    exports: {},
  };

  if (includeTextCodec) {
    // TextEncoder/TextDecoder are a real consumer requirement, not a test
    // convenience, and the requirement is unavoidable: uint8array-extras@1.5.0
    // — a direct dependency of ours and a transitive dependency of
    // stellar-sdk — constructs both at module initialization, unguarded:
    // `new globalThis.TextDecoder('utf8')` (index.js:113, inside a
    // module-scope object literal) and `new globalThis.TextEncoder()`
    // (index.js:128). By contrast, @exodus/bytes DOES guard this —
    // fallback/platform.native.js only constructs them when
    // `isNative(globalThis.TextDecoder)` holds, falling back to pure-JS
    // decoding otherwise — so the requirement traces specifically to
    // uint8array-extras, not to @exodus/bytes. Granting them here models an
    // environment that satisfies this prerequisite. We cannot verify from
    // here whether React Native itself provides them (this file makes no
    // claim either way), but RN apps commonly polyfill TextEncoder/TextDecoder
    // already for other libraries. Remove them and every bundle throws
    // "TypeError: globalThis.TextDecoder is not a constructor" at load —
    // before any of our own code runs. See the test below that enforces this.
    sandbox.TextEncoder = TextEncoder;
    sandbox.TextDecoder = TextDecoder;
  }

  if (includeBase64) {
    // btoa/atob are a real consumer requirement of this release, not a test
    // convenience. stellar-sdk v17's xdr.encodeBytes(bytes, "base64") routes
    // through its own lib/cjs/base/util/base64.js, which calls the bare `btoa`
    // identifier with no fallback, and Task 2 removed the browser bundle's
    // Buffer polyfill that used to cover it. Hermes provides btoa/atob
    // natively as of React Native 0.74 (facebook/hermes#1255, #1256); React
    // Native's own JS layer has never defined them, so RN < 0.74 and
    // non-Hermes engines (JSC, V8) need a polyfill such as `base-64`.
    // Granting them here models a supported RN >= 0.74 Hermes app. Remove
    // them and every base64 path throws "ReferenceError: btoa is not
    // defined"; hex and base32/StrKey still work, being pure JS.
    sandbox.btoa = globalThis.btoa;
    sandbox.atob = globalThis.atob;
  }

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

  for (const [name, relativePath] of bundles) {
    it(`fails to load the ${name} bundle without TextEncoder/TextDecoder`, () => {
      const bundlePath = path.resolve(__dirname, relativePath);
      const context = makeHermesLikeContext({ includeTextCodec: false });
      const code = fs.readFileSync(bundlePath, "utf8");

      // uint8array-extras constructs its TextDecoder/TextEncoder at module
      // initialization (see the comment in makeHermesLikeContext), so the
      // failure happens at load time, before any of our own code runs. This
      // turns the assumption granted above into an enforced, documented
      // contract rather than a silent one.
      expect(() =>
        vm.runInContext(code, context, { filename: `${name}.js` }),
      ).toThrow(/TextDecoder is not a constructor/);
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

  it("requires btoa/atob for base64 paths, while base32/StrKey keypair creation stays pure JS", () => {
    const context = makeHermesLikeContext({ includeBase64: false });
    const code = fs.readFileSync(
      path.resolve(__dirname, "../../lib/bundle_browser.js"),
      "utf8",
    );
    vm.runInContext(code, context, { filename: "bundle_browser.js" });

    // Keypair generation and the public key's StrKey encoding are pure JS
    // (base32, not base64), so they must work even without btoa/atob.
    const publicKey = vm.runInContext(
      `(() => {
        const { Wallet } = module.exports;
        return Wallet.TestNet().stellar().account().createKeypair().publicKey;
      })()`,
      context,
    ) as string;
    expect(publicKey).toMatch(/^G[A-Z2-7]{55}$/);

    // Sep7Pay.addSignature's base64 encode step has no fallback: without
    // btoa this must fail loudly rather than silently degrade.
    expect(() =>
      vm.runInContext(
        `(() => {
          const { Wallet, Sep7Pay } = module.exports;
          const kp = Wallet.TestNet().stellar().account().createKeypair();
          const uri = Sep7Pay.forDestination(kp.publicKey);
          return uri.addSignature(kp.keypair);
        })()`,
        context,
      ),
    ).toThrow(/btoa is not defined/);
  });
});
