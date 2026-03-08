import { chromium, type Browser, type Page } from "playwright";
import * as esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
  });
  console.log("Bundle built successfully.");
}

function bundleIsStale(): boolean {
  if (!fs.existsSync(BUNDLE_PATH)) return true;
  const bundleMtime = fs.statSync(BUNDLE_PATH).mtimeMs;
  const srcFiles = [
    path.resolve(__dirname, "bundle-entry.ts"),
    path.resolve(__dirname, "renderer-page.html"),
  ];
  for (const file of srcFiles) {
    if (fs.existsSync(file) && fs.statSync(file).mtimeMs > bundleMtime) return true;
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
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>,
  themeId: string = "default"
): Promise<{ png: Buffer; warnings: string[]; error?: undefined } | { png?: undefined; warnings?: undefined; error: string }> {
  try {
    const warnings: string[] = [];
    const onConsole = (msg: import("playwright").ConsoleMessage) => {
      if (msg.type() === "warning") {
        warnings.push(msg.text());
      }
    };
    page.on("console", onConsole);

    const evalError = await page.evaluate(
      ([spec, datasets, themeId]) => {
        const fn = (window as unknown as {
          renderVegaLite: (s: unknown, d: unknown, t?: string) => Promise<void>;
        }).renderVegaLite;
        return fn(spec, datasets, themeId).then(() => null).catch((err: unknown) =>
          err instanceof Error ? err.message : String(err)
        );
      },
      [spec, datasets, themeId] as [unknown, unknown, string]
    );

    await page.waitForTimeout(300);
    page.off("console", onConsole);

    if (evalError) {
      return { error: evalError };
    }

    const container = page.locator("#chart-container");
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
