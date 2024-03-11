const commonConfigs = {
  transform: {
    "^.+\\.(js|jsx|ts|tsx|mjs)$": ["babel-jest"],
  },
};

module.exports = {
  projects: [
    {
      displayName: "Wallet SDK",
      roots: ["./@stellar/typescript-wallet-sdk"],
      testPathIgnorePatterns: ["/node_modules/", "/integration/"],
      ...commonConfigs,
    },
    {
      displayName: "Wallet SDK KM",
      roots: ["./@stellar/typescript-wallet-sdk-km"],
      testPathIgnorePatterns: ["/node_modules/"],
      ...commonConfigs,
    },
  ],
};
