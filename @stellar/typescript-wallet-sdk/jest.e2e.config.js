module.exports = {
  rootDir: "./",
  preset: "ts-jest",
  transformIgnorePatterns: [`/node_modules/(?!${["@stablelib"].join("|")})`],
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  testMatch: ["**/e2e/*.test.ts"],
};
