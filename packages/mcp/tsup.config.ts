import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  shims: true,
  dts: true,
  tsconfig: "tsconfig.build.json",
  splitting: false,
  clean: true,
  treeshake: true,
  noExternal: ["@chartroom/core"],
  external: ["@resvg/resvg-js", "vega", "vega-lite", "vega-themes", "zod"],
});
