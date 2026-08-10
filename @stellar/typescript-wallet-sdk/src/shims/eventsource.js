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
    // eslint-disable-next-line global-require
    realModule = require("eventsource-real");
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
