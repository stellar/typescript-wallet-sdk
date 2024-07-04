const commonConfigs = {
  transformIgnorePatterns: [`/node_modules/(?!${["@stablelib"].join("|")})`],
  transform: {
    "^.+\\.(js|jsx|ts|tsx|mjs)$": ["babel-jest"],
  },
};

module.exports = {
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
