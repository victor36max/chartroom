# Chartroom

AI-powered chart generation from CSV data using Vega-Lite — right inside Claude Code.

## What it does

Chartroom adds a `/chart` skill and MCP tools that let Claude Code create, validate, and render data visualizations from your CSV files. Upload a CSV, describe the chart you want, and get a polished Vega-Lite chart rendered as PNG or opened interactively in your browser.

## Installation

```
# Add the chartroom marketplace
/plugin marketplace add victor36max/chartroom

# Install the plugin
/plugin install chartroom
```

## Usage

1. Run `/chart` in Claude Code
2. Point it at a CSV file
3. Describe the chart you want (e.g., "bar chart of revenue by region")
4. Claude will load the data, pick the right chart type, and render it

## MCP Tools

| Tool | Description |
|------|-------------|
| `load_csv` | Parse a CSV file and return column metadata (names, types, sample values) |
| `validate_chart` | Validate a Vega-Lite spec against the compiler |
| `render_chart` | Render a Vega-Lite spec to PNG |
| `open_interactive` | Open the chart in your browser with tooltips and panning |

## Supported chart types

Bar, line, area, point, rect, rule, text, tick, arc, and boxplot — plus layered, faceted, concatenated, and repeated compositions.

**Not supported:** funnel, waterfall, radar/spider, waffle, map/geo, treemap/sunburst, animations, or custom interactions. When an unsupported type is requested, Chartroom suggests and renders the closest alternative.

## Reference docs

The plugin includes 28 built-in Vega-Lite reference docs covering mark types, encoding, transforms, composition, and best-practice patterns. Claude consults these automatically when building your chart.

## License

MIT
