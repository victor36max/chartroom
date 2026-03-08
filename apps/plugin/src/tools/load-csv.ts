import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import { parseCSVString, metadataToContext, datasetsToContext, type DatasetMap } from "@firechart/core";

export function registerLoadCsv(server: McpServer, datasets: DatasetMap) {
  server.tool(
    "load_csv",
    "Load and parse a CSV file. Returns column metadata (names, types, sample values). Supports loading multiple CSVs.",
    { path: z.string().describe("Path to the CSV file (absolute or relative)") },
    async ({ path: csvPath }) => {
      try {
        const text = fs.readFileSync(csvPath, "utf8");
        const parsed = parseCSVString(text);
        const name = csvPath.split("/").pop() ?? csvPath;
        datasets[name] = parsed;

        const context = Object.keys(datasets).length > 1
          ? datasetsToContext(datasets)
          : `Dataset "${name}" (reference with \`{ "url": "${name}" }\`):\n${metadataToContext(parsed.metadata)}`;

        return { content: [{ type: "text" as const, text: context }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error loading CSV: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
