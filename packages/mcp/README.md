# @chartroom/mcp

MCP server providing chart generation tools for AI assistants. Publishable to npm as `@chartroom/mcp`.

## Tools

| Tool | Description |
|------|-------------|
| `load_csv` | Parse a CSV or Excel file, return column metadata |
| `render_chart` | Validate and render a Vega-Lite spec to PNG via vega + resvg-js |
| `open_interactive` | Open chart in browser with tooltips |

## Running

**From the monorepo (development):**

```bash
cd packages/mcp && bun start
```

**Via npx (published package):**

```bash
npx @chartroom/mcp
```

## MCP client configuration

For Claude Desktop or other MCP clients:

```json
{
  "mcpServers": {
    "chartroom": {
      "command": "npx",
      "args": ["@chartroom/mcp@latest"]
    }
  }
}
```

## Building

```bash
bun run build:mcp
```

## Key files

| File | Purpose |
|------|---------|
| `src/server.ts` | MCP server entry point |
| `src/tools/load-csv.ts` | CSV/Excel parsing tool |
| `src/tools/render-chart.ts` | Spec validation + PNG rendering tool |
| `src/tools/open-interactive.ts` | Browser-based interactive chart tool |
