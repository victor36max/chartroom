---
name: chart
description: Generate charts from CSV data using Vega-Lite. Use when the user wants to create, modify, or explore data visualizations from CSV files.
user-invocable: true
allowed-tools: Read, Bash(open *)
---

# Chart Generation Workflow

You have access to Firechart MCP tools for creating Vega-Lite charts from CSV data.

## Available MCP Tools

- **load_csv** — Parse a CSV file and get column metadata (names, types, sample values)
- **validate_chart** — Validate a Vega-Lite spec before rendering
- **render_chart** — Render a spec to PNG and save to disk
- **open_interactive** — Open the chart interactively in the browser

## Workflow

1. **Load data**: Call `load_csv` with the CSV file path
2. **Read docs**: Read the relevant Vega-Lite reference docs (in this skill's directory) for the mark type and transforms you plan to use
3. **Generate spec**: Create a Vega-Lite JSON spec based on the data and user's request
4. **Validate**: Call `validate_chart` to check for errors
5. **Render**: Call `render_chart` to create a PNG
6. **Evaluate**: Read the PNG file to evaluate the chart visually
7. **Refine**: If needed, modify the spec and re-render
8. **Interactive**: Optionally call `open_interactive` for browser viewing

## Spec Format

Reference data with `{ "url": "<filename>" }` — the renderer injects actual data automatically.

**NEVER include** in your spec: `config`, `$schema`, `background`, `padding`, `autosize` — these are applied by the renderer.

## Pre-render Checklist

Before every `render_chart` call:
1. Every `field` must reference an actual CSV column name or a transform `"as"` alias
2. NEVER stack non-summable values (temperatures, prices, rates, averages)
3. For high-cardinality categorical axes (>20 unique values), filter to top/bottom 15

## Unsupported Chart Types

- **Funnel, waterfall** — Use sorted horizontal bar chart instead
- **Radar, spider** — Use grouped bar chart or dot plot instead
- **Waffle, image marks** — Use simpler chart type
- **Map/geo** — Use bar chart by region instead
- **Tree/hierarchy** — Use stacked bar or pie chart instead
- **JavaScript callbacks, animations, custom interactions** — Not supported

## Tips

- For ambiguous requests, pick the single most interesting metric and make a clean chart
- When editing an existing chart, modify the previous spec — don't rebuild from scratch
- Use `"width": 500` if the chart renders too narrow

## Reference Documentation

The full Vega-Lite documentation is available in the `@firechart/core` package at `packages/core/src/docs.ts`.
Read the `lookupDocs()` function output for specific topics as needed.
