const commonConfigs = {
  // @stellar/stellar-sdk v17 pulls in several ESM-only packages (directly or
  // transitively) that must be transformed by babel-jest to run under Jest's
  // CommonJS runtime.
  transformIgnorePatterns: [
    `/node_modules/(?!${[
      "@stablelib",
      "@exodus/bytes",
      "@noble",
      "uint8array-extras",
      "smol-toml",
      "eventsource",
    ].join("|")})`,
  ],
  transform: {
    "^.+\\.(js|jsx|ts|tsx|mjs)$": ["babel-jest"],
  },
};

module.exports = {
  // Several unit tests talk to testnet (friendbot, Horizon, testanchor), which
  // can take well over Jest's 5s default to respond. testTimeout is a global
  // option, so it can't go in commonConfigs.
  testTimeout: 30000,
  projects: [
    {
      displayName: "Wallet SDK",
      roots: ["./@stellar/typescript-wallet-sdk"],
      testPathIgnorePatterns: ["/node_modules/", "/integration/", "/e2e/"],
      ...commonConfigs,
    },
    {
      displayName: "Wallet SDK KM",
      roots: ["./@stellar/typescript-wallet-sdk-km"],
      testPathIgnorePatterns: ["/node_modules/"],
      ...commonConfigs,
    },
    {
      displayName: "Wallet SDK Soroban",
      roots: ["./@stellar/typescript-wallet-sdk-soroban"],
      testPathIgnorePatterns: ["/node_modules/"],
      ...commonConfigs,
    },
  ],
};
