import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import os from "os";
import path from "path";
import { type DatasetMap } from "@chartroom/core";
import { initRenderer, renderChart as rendererRenderChart } from "@chartroom/renderer";
import type { Browser, Page } from "playwright";

let browser: Browser | null = null;
let page: Page | null = null;

async function getPage(): Promise<Page> {
  if (!page || !browser) {
    const result = await initRenderer(1);
    browser = result.browser;
    page = result.pages[0];
  }
  return page;
}

// Cleanup on process exit
process.on("exit", () => {
  if (browser) browser.close().catch(() => {});
});

export function registerRenderChart(server: McpServer, datasets: DatasetMap) {
  server.tool(
    "render_chart",
    "Render a Vega-Lite spec to a PNG image. Returns the file path of the saved image.",
    {
      spec: z.record(z.string(), z.unknown()).describe("Vega-Lite chart specification"),
      theme: z.string().optional().describe("Theme ID (default, dark, excel, fivethirtyeight, ggplot2, googlecharts, latimes, powerbi, quartz, urbaninstitute, vox)"),
      outputPath: z.string().optional().describe("Custom output path for the PNG file"),
    },
    async ({ spec, theme, outputPath }) => {
      try {
        const p = await getPage();
        const dataRows: Record<string, Record<string, unknown>[]> = {};
        for (const [name, parsed] of Object.entries(datasets)) {
          dataRows[name] = parsed.data;
        }

        const result = await rendererRenderChart(p, spec, dataRows, theme ?? "default");

        if ("error" in result && result.error) {
          return {
            content: [{ type: "text" as const, text: `Render error: ${result.error}` }],
            isError: true,
          };
        }

        const { png, warnings } = result as { png: Buffer; warnings: string[] };

        // Save PNG
        const tmpDir = path.join(os.tmpdir(), "chartroom");
        fs.mkdirSync(tmpDir, { recursive: true });
        const filePath = outputPath ?? path.join(tmpDir, `chart-${Date.now()}.png`);
        fs.writeFileSync(filePath, png);

        const warningText = warnings.length > 0
          ? `\nWarnings:\n${warnings.map(w => `- ${w}`).join("\n")}`
          : "";

        return {
          content: [{ type: "text" as const, text: `Chart rendered and saved to: ${filePath}${warningText}\n\nUse the Read tool to view the image and evaluate it.` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
