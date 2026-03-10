import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  dts: true,
  tsconfig: "tsconfig.build.json",
  splitting: false,
  clean: true,
  noExternal: ["@chartroom/core", "@chartroom/renderer"],
  external: ["playwright", "zod"],
});
