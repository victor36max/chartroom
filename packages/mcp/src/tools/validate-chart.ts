import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateSpec, type DatasetMap } from "@chartroom/core";

export function registerValidateChart(server: McpServer, datasets: DatasetMap) {
  server.tool(
    "validate_chart",
    "Validate a Vega-Lite spec against the compiler. Returns errors or warnings.",
    { spec: z.record(z.string(), z.unknown()).describe("Vega-Lite chart specification as JSON") },
    async ({ spec }) => {
      const dataRows: Record<string, Record<string, unknown>[]> = {};
      for (const [name, parsed] of Object.entries(datasets)) {
        dataRows[name] = parsed.data;
      }

      const result = validateSpec(spec, dataRows);

      if (result.valid) {
        const msg = result.warnings.length > 0
          ? `Spec is valid with warnings:\n${result.warnings.map(w => `- ${w}`).join("\n")}`
          : "Spec is valid.";
        return { content: [{ type: "text" as const, text: msg }] };
      }

      return {
        content: [{ type: "text" as const, text: `Spec is invalid: ${result.error}` }],
        isError: true,
      };
    }
  );
}
