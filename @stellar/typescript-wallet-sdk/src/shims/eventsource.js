/**
 * Lazy `eventsource` facade.
 *
 * eventsource v4 subclasses the DOM globals `Event`/`EventTarget` at module
 * scope, which React Native's Hermes does not provide. Horizon's CallBuilder
 * requires this module eagerly but only reads it inside `stream()`, so deferring
 * evaluation to first property access keeps imports working everywhere while
 * leaving streaming intact wherever those globals exist.
 *
 * Aliased in webpack.config.js: `eventsource$` resolves here, `eventsource-real$`
 * to the real package.
 */
let realModule;

const load = () => {
  if (!realModule) {
    try {
      // eslint-disable-next-line global-require
      realModule = require("eventsource-real");
    } catch (cause) {
      // CallBuilder.stream() catches this and retries on a timer, so make the
      // error it reports to onerror self-explanatory.
      throw new Error(
        "Horizon streaming needs the DOM Event/EventTarget globals and a " +
          "streaming fetch body, which React Native does not provide. Alias " +
          '"eventsource" to a native SSE client (e.g. react-native-sse) to use ' +
          `CallBuilder.stream(). Original error: ${cause.message}`,
      );
    }
  }

  return realModule;
};

Object.defineProperty(exports, "EventSource", {
  enumerable: true,
  configurable: true,
  get: () => load().EventSource,
});

Object.defineProperty(exports, "ErrorEvent", {
  enumerable: true,
  configurable: true,
  get: () => load().ErrorEvent,
});
