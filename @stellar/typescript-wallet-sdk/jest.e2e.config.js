module.exports = {
  rootDir: "./",
  preset: "ts-jest",
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  testMatch: ["**/e2e/*.test.ts"],
};
