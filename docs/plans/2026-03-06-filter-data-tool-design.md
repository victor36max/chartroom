# Replace `analyze_data` with `filter_data`

## Problem

The `analyze_data` tool overlaps heavily with Observable Plot's built-in transforms:
- **Value counts** → `groupX` with `"y": "count"`
- **Group by** → `groupX`/`groupY`
- **Stats** → CSV metadata already provides column names, types, row count, sample rows
- **Correlations** → rarely used, AI can just render a scatter plot

The one irreplaceable capability is **top/bottom N filtering** — Plot has no `limit`/`slice` transform.

## Solution

Replace `analyze_data` with a focused `filter_data` tool with two modes:

1. **Raw**: Sort by column, return top/bottom N rows
2. **Aggregated**: Group by category, aggregate value column, return top/bottom N categories

### Schema

```typescript
filter_data: tool({
  description: "Filter CSV data to top/bottom N entries. Can aggregate first (e.g., top 5 products by total revenue). Use before render_chart when you need to limit data — Observable Plot cannot slice.",
  inputSchema: z.object({
    column: z.string(),
    direction: z.enum(["top", "bottom"]),
    n: z.number().int().min(1).max(50),
    groupBy: z.string().optional(),
    aggregate: z.enum(["sum", "count", "mean", "max", "min"]).optional(),
  }),
})
```

### Return format

Raw: `{ rows: [...], total: N }`
Aggregated: `{ categories: [{name, value}, ...], total_groups: N }`

## What's removed

- `src/lib/agent/data-analyzer.ts` — all five analysis functions
- `analyze_data` tool definition
- System prompt and doc references to `analyze_data`

## Implementation

TDD approach — write tests first, then implement.
