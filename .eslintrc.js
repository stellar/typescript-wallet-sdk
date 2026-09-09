module.exports = {
  ignorePatterns: ["lib/", "node_modules/", "docs/"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: [
      "@stellar/typescript-wallet-sdk/examples/tsconfig.json",
      "@stellar/typescript-wallet-sdk/tsconfig.json",
      "@stellar/typescript-wallet-sdk/test/tsconfig.json",
      "@stellar/typescript-wallet-sdk-km/tsconfig.json",
      "@stellar/typescript-wallet-sdk-km/test/tsconfig.json",
      "@stellar/typescript-wallet-sdk-soroban/tsconfig.json",
      "@stellar/typescript-wallet-sdk-soroban/test/tsconfig.json",
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
    "jsdoc/check-indentation": "off",

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
  },
  overrides: [
    {
      files: ["**/test/**", "@stellar/typescript-wallet-sdk/examples/**"],
      rules: {
        "@typescript-eslint/no-shadow": "off",
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
    {
      files: ["@stellar/*/src/**/*.ts"],
      rules: {
        "no-restricted-globals": [
          "error",
          {
            name: "Buffer",
            message:
              "React Native has no Buffer global. Use Uint8Array with xdr.encodeBytes/decodeBytes.",
          },
        ],
        "no-restricted-syntax": [
          "error",
          {
            // Scoped to encoding-string literals rather than any argument:
            // the bug class this guards is `bytes.toString("hex"|"base64")`
            // on a Uint8Array. A bare arguments.length>0 selector also
            // rejects a legitimate numeric radix such as n.toString(16),
            // with a message about byte encodings that makes no sense there.
            selector:
              "CallExpression[callee.property.name='toString'][arguments.0.type='Literal'][arguments.0.value=/^(hex|base64|base64url|utf-?8|ascii|latin1|binary|ucs-?2|utf-?16le)$/i]",
            message:
              "Uint8Array.toString() ignores its encoding argument and returns comma-joined decimals. Use xdr.encodeBytes(bytes, 'hex'|'base64').",
          },
          {
            selector:
              "MemberExpression[object.name=/^(globalThis|global)$/][property.name='Buffer']",
            message:
              "React Native has no Buffer global. Use Uint8Array with xdr.encodeBytes/decodeBytes.",
          },
          {
            // Defeats the two bypasses of the selector above: a computed
            // access such as globalThis["Buffer"], and a typed cast such as
            // (globalThis as { Buffer?: unknown }).Buffer, which is not
            // caught by no-explicit-any.
            selector:
              "MemberExpression[computed=true][property.value='Buffer']",
            message:
              "React Native has no Buffer global. Use Uint8Array with xdr.encodeBytes/decodeBytes.",
          },
          {
            selector:
              "MemberExpression[object.type=/^TS(As|Satisfies|NonNull)Expression$/][property.name='Buffer']",
            message:
              "React Native has no Buffer global. Use Uint8Array with xdr.encodeBytes/decodeBytes.",
          },
        ],
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "buffer",
                message:
                  "React Native has no Buffer global. Use Uint8Array with xdr.encodeBytes/decodeBytes.",
              },
              {
                name: "node:buffer",
                message:
                  "React Native has no Buffer global. Use Uint8Array with xdr.encodeBytes/decodeBytes.",
              },
            ],
          },
        ],
      },
    },
  ],
};
