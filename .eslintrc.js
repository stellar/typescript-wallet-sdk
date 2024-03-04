module.exports = {
  ignorePatterns: ["lib/", "node_modules/", "docs/"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: [
      "examples/tsconfig.json",
      "@stellar/typescript-wallet-sdk/tsconfig.json",
      "@stellar/typescript-wallet-sdk/test/tsconfig.json",
    ],
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "jsdoc"],
  extends: [
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  rules: {
    // Off
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/prefer-regexp-exec": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/no-misused-promises": "off",
    "@typescript-eslint/no-base-to-string": "off",

    // Warn
    "jsdoc/check-param-names": "warn",
    "jsdoc/require-returns": "warn",
    "jsdoc/require-returns-description": "warn",
    "jsdoc/require-returns-type": "warn",
    "jsdoc/require-param": "warn",
    "jsdoc/check-types": "warn",
    "jsdoc/require-param-description": "warn",
    "jsdoc/require-param-name": "warn",
    "jsdoc/require-param-type": "warn",
    "jsdoc/require-property": "warn",
    "jsdoc/require-property-description": "warn",
    "jsdoc/require-property-name": "warn",
    "jsdoc/require-property-type": "warn",
    "jsdoc/check-property-names": "warn",
    "jsdoc/empty-tags": "warn",

    // Error
    "@typescript-eslint/no-shadow": "error",
    "@typescript-eslint/no-unused-expressions": "error",
    "@typescript-eslint/no-var-requires": "error",
    "@typescript-eslint/prefer-for-of": "error",
    "@typescript-eslint/prefer-function-type": "error",
    "@typescript-eslint/prefer-namespace-keyword": "error",
    "@typescript-eslint/triple-slash-reference": [
      "error",
      {
        path: "always",
        types: "prefer-import",
        lib: "always",
      },
    ],
    "@typescript-eslint/unified-signatures": "error",
    "@typescript-eslint/no-misused-new": "error",
    "@typescript-eslint/no-empty-function": "error",
    "@typescript-eslint/no-empty-interface": "error",
    "jsdoc/check-alignment": "error",
    "jsdoc/check-indentation": "error",
  },
  overrides: [
    {
      files: ["test/**", "examples/**"],
      rules: {
        "@typescript-eslint/no-shadow": "off",
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};
