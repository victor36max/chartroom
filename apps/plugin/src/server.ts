import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { DatasetMap } from "@firechart/core";
import { registerLoadCsv } from "./tools/load-csv";
import { registerValidateChart } from "./tools/validate-chart";
import { registerRenderChart } from "./tools/render-chart";
import { registerOpenInteractive } from "./tools/open-interactive";

// In-memory state
const datasets: DatasetMap = {};

const server = new McpServer({
  name: "firechart",
  version: "0.1.0",
});

registerLoadCsv(server, datasets);
registerValidateChart(server, datasets);
registerRenderChart(server, datasets);
registerOpenInteractive(server, datasets);

const transport = new StdioServerTransport();
await server.connect(transport);
