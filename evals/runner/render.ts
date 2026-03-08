import { chromium, type Browser, type Page } from "playwright";
import * as esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { ChartSpec } from "../../src/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, "../..");
const BUNDLE_PATH = path.resolve(__dirname, "bundle/renderer.js");
const HTML_PAGE = path.resolve(__dirname, "renderer-page.html");

export async function buildBundle(): Promise<void> {
  console.log("Building vega-embed bundle for browser...");
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, "bundle-entry.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    outfile: BUNDLE_PATH,
    alias: {
      "@/types": path.resolve(ROOT, "src/types/index.ts"),
      "@/lib": path.resolve(ROOT, "src/lib"),
    },
  });
  console.log("Bundle built successfully.");
}

function bundleIsStale(): boolean {
  if (!fs.existsSync(BUNDLE_PATH)) return true;
  const bundleMtime = fs.statSync(BUNDLE_PATH).mtimeMs;
  // Check if any source file is newer than the bundle
  const srcDirs = [
    path.resolve(ROOT, "src/lib/chart"),
    path.resolve(ROOT, "src/types"),
    path.resolve(__dirname),
  ];
  for (const dir of srcDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".ts")) continue;
      const fileMtime = fs.statSync(path.join(dir, file)).mtimeMs;
      if (fileMtime > bundleMtime) return true;
    }
  }
  return false;
}

export async function initRenderer(pageCount = 1): Promise<{ browser: Browser; pages: Page[] }> {
  if (bundleIsStale()) {
    await buildBundle();
  }
  const browser = await chromium.launch();
  const pages = await Promise.all(
    Array.from({ length: pageCount }, async () => {
      const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
      await page.goto(`file://${HTML_PAGE}`);
      return page;
    })
  );
  return { browser, pages };
}

export async function renderChart(
  page: Page,
  spec: ChartSpec,
  datasets: Record<string, Record<string, unknown>[]>
): Promise<{ png: Buffer; warnings: string[]; error?: undefined } | { png?: undefined; warnings?: undefined; error: string }> {
  try {
    // Capture console warnings emitted by Vega-Lite during rendering
    const warnings: string[] = [];
    const onConsole = (msg: import("playwright").ConsoleMessage) => {
      if (msg.type() === "warning") {
        warnings.push(msg.text());
      }
    };
    page.on("console", onConsole);

    const evalError = await page.evaluate(
      ([spec, datasets]) => {
        const fn = (window as unknown as {
          renderVegaLite: (s: unknown, d: unknown) => Promise<void>;
        }).renderVegaLite;
        return fn(spec, datasets).then(() => null).catch((err: unknown) =>
          err instanceof Error ? err.message : String(err)
        );
      },
      [spec, datasets] as [unknown, unknown]
    );

    // Wait for Vega to finish rendering (and emitting warnings)
    await page.waitForTimeout(300);
    page.off("console", onConsole);

    if (evalError) {
      return { error: evalError };
    }

    const container = page.locator("#chart-container");
    // Resize viewport to fit the chart so nothing is clipped
    const box = await container.boundingBox();
    if (box) {
      const width = Math.ceil(box.x + box.width);
      const height = Math.ceil(box.y + box.height);
      await page.setViewportSize({ width, height });
    }
    const png = await container.screenshot({ type: "png" });
    return { png, warnings };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function closeRenderer(browser: Browser): Promise<void> {
  await browser.close();
}

// Allow running as standalone script for bundle building
if (process.argv.includes("--build-only")) {
  buildBundle()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
