import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_PATH = path.resolve(__dirname, "bundle/renderer.js");

export async function buildBundle(): Promise<void> {
  console.log("Building vega-embed bundle for browser...");
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, "bundle-entry.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    outfile: BUNDLE_PATH,
  });
  console.log("Bundle built successfully.");
}

// Allow running as standalone script
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("build-bundle.ts")) {
  buildBundle()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
