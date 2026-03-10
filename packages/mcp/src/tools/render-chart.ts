import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import os from "os";
import path from "path";
import { type DatasetMap } from "@chartroom/core";
import { renderChart } from "@chartroom/core";

export function registerRenderChart(server: McpServer, datasets: DatasetMap) {
  server.tool(
    "render_chart",
    `Render a Vega-Lite spec to a PNG image. Returns the file path of the saved image.

After rendering, you MUST use the Read tool to view the PNG and evaluate its quality. If the chart has issues (wrong encoding, poor readability, missing labels, etc.), fix the spec and render again. Once the chart looks good, call the open_interactive tool with the same spec to open it in the user's browser.`,
    {
      spec: z.record(z.string(), z.unknown()).describe("Vega-Lite chart specification"),
      theme: z.string().optional().describe("Theme ID (default, dark, excel, fivethirtyeight, ggplot2, googlecharts, latimes, powerbi, quartz, urbaninstitute, vox)"),
      outputPath: z.string().optional().describe("Custom output path for the PNG file"),
    },
    async ({ spec, theme, outputPath }) => {
      try {
        const dataRows: Record<string, Record<string, unknown>[]> = {};
        for (const [name, parsed] of Object.entries(datasets)) {
          dataRows[name] = parsed.data;
        }

        const result = await renderChart(spec, dataRows, theme ?? "default");

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
          content: [{ type: "text" as const, text: `Chart rendered and saved to: ${filePath}${warningText}\n\nUse the Read tool to view the PNG and evaluate it. If the chart looks good, call open_interactive with the same spec to open it in the browser.` }],
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
