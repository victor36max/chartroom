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
  console.log("Building specToPlot bundle for browser...");
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, "bundle-entry.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    outfile: BUNDLE_PATH,
    alias: {
      "@/types": path.resolve(ROOT, "src/types/index.ts"),
    },
  });
  console.log("Bundle built successfully.");
}

export async function initRenderer(): Promise<{ browser: Browser; page: Page }> {
  if (!fs.existsSync(BUNDLE_PATH)) {
    await buildBundle();
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await page.goto(`file://${HTML_PAGE}`);
  return { browser, page };
}

export async function renderChart(
  page: Page,
  spec: ChartSpec,
  data: Record<string, unknown>[]
): Promise<{ png: Buffer; error?: undefined } | { png?: undefined; error: string }> {
  try {
    const evalError = await page.evaluate(
      ([spec, data]) => {
        const container = document.getElementById("chart-container")!;
        container.innerHTML = "";
        try {
          const fn = (window as unknown as { specToPlot: (s: unknown, d: unknown) => HTMLElement })
            .specToPlot;
          const el = fn(spec, data);
          container.appendChild(el);
          return null;
        } catch (err) {
          return err instanceof Error ? err.message : String(err);
        }
      },
      [spec, data] as [unknown, unknown]
    );

    if (evalError) {
      return { error: evalError };
    }

    // Wait for SVG layout to settle
    await page.waitForTimeout(150);

    const container = page.locator("#chart-container");
    const png = await container.screenshot({ type: "png" });
    return { png };
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
