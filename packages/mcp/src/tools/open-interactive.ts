import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { injectData, getThemeConfig, type DatasetMap, type ThemeId } from "@chartroom/core";

function openInBrowser(filePath: string) {
  const cmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "start"
    : "xdg-open";
  execFile(cmd, [filePath]);
}

export function registerOpenInteractive(server: McpServer, datasets: DatasetMap) {
  server.tool(
    "open_interactive",
    "Open the chart interactively in the user's default browser with hover tooltips and panning.",
    {
      spec: z.record(z.string(), z.unknown()).describe("Vega-Lite chart specification"),
      theme: z.string().optional().describe("Theme ID (default, dark, excel, fivethirtyeight, ggplot2, googlecharts, latimes, powerbi, quartz, urbaninstitute, vox)"),
    },
    async ({ spec, theme }) => {
      try {
        const dataRows: Record<string, Record<string, unknown>[]> = {};
        for (const [name, parsed] of Object.entries(datasets)) {
          dataRows[name] = parsed.data;
        }

        const withData = injectData(spec, dataRows);
        const themeId = (theme ?? "default") as ThemeId;
        const config = getThemeConfig(themeId);

        const fullSpec = { width: 600, height: 400, ...withData };

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chartroom — Interactive View</title>
  <script src="https://cdn.jsdelivr.net/npm/vega@6"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@6"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
  <style>
    body { margin: 0; display: flex; justify-content: center; padding: 32px; background: #fafafa; font-family: system-ui; }
    #chart { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>
    vegaEmbed('#chart', ${JSON.stringify(fullSpec)}, {
      config: ${JSON.stringify(config)},
      renderer: 'svg'
    });
  </script>
</body>
</html>`;

        const tmpDir = "/tmp/chartroom";
        await fs.mkdir(tmpDir, { recursive: true });
        const filePath = path.join(tmpDir, `interactive-${Date.now()}.html`);
        await fs.writeFile(filePath, html);
        openInBrowser(filePath);

        return {
          content: [{ type: "text" as const, text: `Interactive chart opened in browser: ${filePath}` }],
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
