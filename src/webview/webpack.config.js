const path = require("path");

module.exports = {
  entry: "./src/webview/index.tsx",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "../../dist"), // Output to the 'dist' directory
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  mode: "production", // Change to 'development' for easier debugging
};
