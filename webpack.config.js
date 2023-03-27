const path = require("path");

module.exports = {
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
  },
  output: {
    library: "MyLibrary",
    libraryTarget: "umd",
    globalObject: "this",
    filename: "bundle.js",
    path: path.resolve(__dirname, "lib"),
  },
};
