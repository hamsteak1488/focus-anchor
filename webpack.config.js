// webpack.config.js
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const Dotenv = require("dotenv-webpack");

module.exports = {
  entry: {
    main: [
      path.resolve(__dirname, "src", "main.ts"), // 팝업·UI 진입점
      path.resolve(__dirname, "scss", "main.scss"), // 전역 스타일
    ],
    background: path.resolve(__dirname, "src", "background.ts"),
    content: path.resolve(__dirname, "src", "content.ts"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  resolve: { extensions: [".ts", ".js"] },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: "ts-loader", exclude: /node_modules/ },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
      {
        test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf)$/i,
        type: "asset",
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "public", to: "." }, // 정적 자산
        { from: "manifest.json", to: "manifest.json" }, // 매니페스트
      ],
    }),
    new MiniCssExtractPlugin({ filename: "[name].css" }),
    new Dotenv(),
  ],

  devtool: "source-map", // 디버깅 편의용
};
