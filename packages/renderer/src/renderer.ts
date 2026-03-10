import { chromium, type Browser, type Page } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bundled (npm): assets at dist/renderer/  |  Dev (workspace): assets at packages/renderer/src/
const bundledRoot = path.resolve(__dirname, "renderer");
const devRoot = path.resolve(__dirname, "../../renderer/src");
const localRoot = path.resolve(__dirname, "..", "src");
const RENDERER_ROOT = fs.existsSync(path.resolve(bundledRoot, "renderer-page.html"))
  ? bundledRoot
  : fs.existsSync(path.resolve(devRoot, "renderer-page.html"))
    ? devRoot
    : localRoot;

const BUNDLE_PATH = path.resolve(RENDERER_ROOT, "bundle/renderer.js");
const HTML_PAGE = path.resolve(RENDERER_ROOT, "renderer-page.html");

export async function initRenderer(pageCount = 1): Promise<{ browser: Browser; pages: Page[] }> {
  if (!fs.existsSync(BUNDLE_PATH)) {
    throw new Error(
      `Vega-embed bundle not found at ${BUNDLE_PATH}. Run "bun run build:bundle" first.`
    );
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
