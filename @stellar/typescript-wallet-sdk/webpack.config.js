const path = require("path");
const webpack = require("webpack");

module.exports = (env = { NODE: false }) => {
  const isBrowser = !env.NODE;

  return {
    mode: "development",
    entry: "./src/index.ts",
    devtool: "source-map",
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: [".js", ".json", ".ts"],
      fallback: isBrowser
        ? {
            crypto: require.resolve("crypto-browserify"),
            http: require.resolve("stream-http"),
            https: require.resolve("https-browserify"),
            stream: require.resolve("stream-browserify"),
            url: require.resolve("url"),
            util: require.resolve("util"),
            vm: require.resolve("vm-browserify"),
            "process/browser": require.resolve("process/browser"),
            buffer: require.resolve("buffer"),
          }
        : {},
    },
    output: {
      library: "WalletSDK",
      libraryTarget: "umd",
      globalObject: "this",
      filename: `bundle${isBrowser ? "_browser" : ""}.js`,
      path: path.resolve(__dirname, "lib"),
    },
    target: isBrowser ? "web" : "node",
    plugins: isBrowser
      ? [
          new webpack.ProvidePlugin({
            process: "process/browser",
          }),
          new webpack.ProvidePlugin({
            Buffer: ["buffer", "Buffer"],
          }),
        ]
      : [],
  };
};
