const path = require("path");

module.exports = {
  entry: "./src/webview/index.tsx", // Entry point of your React app
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js", // Output bundle file
    libraryTarget: "var",
    library: "ReactApp",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"], // Resolve these extensions
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/, // For TypeScript and TSX files
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-react", "@babel/preset-typescript"], // Babel presets
            },
          },
          "ts-loader", // TypeScript loader
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/, // For CSS files (optional)
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devtool: "source-map",
};
