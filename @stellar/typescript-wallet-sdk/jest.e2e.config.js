module.exports = {
  rootDir: "./",
  preset: "ts-jest",
  // @stellar/stellar-sdk v16 pulls in several ESM-only packages (directly or
  // transitively) that must be transformed to run under Jest's CommonJS runtime.
  transformIgnorePatterns: [
    `/node_modules/(?!${[
      "@stablelib",
      "@noble",
      "uint8array-extras",
      "smol-toml",
      "eventsource",
    ].join("|")})`,
  ],
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  testMatch: ["**/e2e/*.test.ts"],
};
