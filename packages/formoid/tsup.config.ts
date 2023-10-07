import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  clean: true,
  config: "tsconfig.build.json",
  dts: true,
  entry: ["src/index.ts"],
  format: "esm",
  minify: true,
  outDir: "lib",
  sourcemap: Boolean(options.watch),
  treeshake: true,
}));
