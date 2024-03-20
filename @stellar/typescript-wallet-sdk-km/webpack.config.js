const path = require("path");
const webpack = require("webpack");

module.exports = (env = { NODE: false }) => ({
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
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      stream: require.resolve("stream-browserify"),
      url: require.resolve("url"),
      util: require.resolve("util"),
      vm: require.resolve("vm-browserify"),
      "process/browser": require.resolve("process/browser"),
    },
  },
  output: {
    library: "WalletSdkKm",
    libraryTarget: "umd",
    globalObject: "this",
    filename: `bundle${!env.NODE ? "_browser" : ""}.js`,
    path: path.resolve(__dirname, "lib"),
  },
  target: env.NODE ? "node" : "web",
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ],
});
