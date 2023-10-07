import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import CssMinimizerWebpackPlugin from "css-minimizer-webpack-plugin";
import EsLintWebpackPlugin from "eslint-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import * as path from "path";
import ReactRefreshTypeScript from "react-refresh-typescript";
import { Configuration, RuleSetUse } from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import "webpack-dev-server";

const modes = ["development", "production"] as const;

type Mode = (typeof modes)[number];

function isValidMode(value: string): value is Mode {
  return (modes as ReadonlyArray<string>).includes(value);
}

const mode =
  process.env.NODE_ENV && isValidMode(process.env.NODE_ENV) ? process.env.NODE_ENV : "production";

function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

function compact<T>(values: Array<T>): Array<NonNullable<T>> {
  return values.filter(isNonNullable);
}

/**
 * style-loader must be fist in the list
 */
const cssLoaders: RuleSetUse = [
  mode === "production" ? MiniCssExtractPlugin.loader : "style-loader",
  "css-loader",
  {
    loader: "postcss-loader",
    options: {
      postcssOptions: {
        plugins: [require("tailwindcss"), require("autoprefixer")],
      },
    },
  },
];

export default {
  mode,
  entry: {
    bundle: path.resolve(__dirname, "src/index.tsx"),
  },
  output: {
    clean: true,
    filename: "[name].[contenthash].js",
    path: path.resolve(__dirname, "build"),
  },
  devServer: {
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    compress: true,
    historyApiFallback: true,
    hot: true,
    open: false,
    port: 3000,
    static: {
      directory: path.resolve(__dirname, "build"),
    },
  },
  devtool: mode === "development" ? "source-map" : false,
  module: {
    rules: [
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/,
        type: "asset/resource",
      },
      {
        test: /\.css$/,
        use: cssLoaders,
      },
      {
        test: /\.scss$/,
        use: [...cssLoaders, "sass-loader"],
      },
      {
        exclude: /node_modules/,
        test: /\.(ts|tsx)$/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: mode === "development",
            getCustomTransformers: () => ({
              before: compact([mode === "development" ? ReactRefreshTypeScript() : null]),
            }),
          },
        },
      },
    ],
  },
  optimization: {
    concatenateModules: mode === "production",
    minimize: mode === "production",
    minimizer: [new CssMinimizerWebpackPlugin(), "..."],
    /* TODO understand what's going on here :) */
    splitChunks: {
      cacheGroups: {
        defaultVendors: {
          chunks: "all",
          name: "vendors",
          priority: -10,
          reuseExistingChunk: true,
          test: /[\\/]node_modules[\\/]/,
        },
      },
      chunks: "async",
    },
  },
  plugins: compact([
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "public/index.html",
    }),
    mode === "production" ? new CleanWebpackPlugin() : null,
    mode === "production" ? new MiniCssExtractPlugin() : null,
    mode === "production"
      ? new CopyWebpackPlugin({
        patterns: [
          {
            from: "public",
            /* Copy everything but index.html */
            filter: (path) => !path.endsWith("index.html"),
          },
        ],
      })
      : null,
    /* Output TS errors in the console */
    mode === "development" ? new ForkTsCheckerWebpackPlugin() : null,
    mode === "development" ? new ReactRefreshWebpackPlugin({ overlay: true }) : null,
    mode === "development"
      ? new EsLintWebpackPlugin({ extensions: ["ts", "tsx"], failOnError: false, files: "./src" })
      : null,
    /* Weird TS error here */
    Boolean(process.env.ANALYZE) ? (new BundleAnalyzerPlugin() as never) : null,
  ]),
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
    },
    extensions: [".tsx", ".ts", ".js"],
    symlinks: true,
  },
  /**
   * Control what bundle information gets displayed
   */
  stats: {
    preset: "errors-warnings",
  },
} satisfies Configuration;
