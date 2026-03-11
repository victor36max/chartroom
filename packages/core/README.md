# @chartroom/core

Shared, Node-compatible library for Chartroom. Contains types, CSV/Excel parsing, spec validation, data injection, themes, docs, AI tools, system prompt, and headless PNG rendering. No framework dependencies (`ai` SDK is an optional peer dep).

## Exports

- **CSV/Excel parsing** — `parseCSV` (browser), `parseCSVString` (Node), Excel via SheetJS (`getSheetNames`, `parseExcelSheet`, `parseExcelBufferSheet`, `getSheetNamesFromBuffer`, `isExcelFile`, `excelToCSVName`), metadata extraction with type inference (number, string, date, boolean), wide-format detection, join key detection
- **Spec validation** — Vega-Lite compiler validation + transform linting (aggregate aliases, field references, lookup transforms)
- **Data injection** — Replaces URL sentinels in specs with actual data objects, handles nested layers/facets/concats
- **Themes** — 11 built-in themes via vega-themes (default, dark, excel, fivethirtyeight, ggplot2, googlecharts, latimes, powerbi, quartz, urbaninstitute, vox)
- **Zod schemas** — `vlSpecSchema`, `vlUnitSchema`, `vlMarkSchema`, `encodingChannelSchema`, `createVlSpecSchema` for runtime Vega-Lite spec validation
- **System prompt** — `buildSystemPrompt({ context: "web"|"plugin", dataContext? })` — context-aware prompt builder
- **Docs** — 28 Vega-Lite reference topics (marks, encoding, transforms, layout, patterns) via `TOPIC_IDS`, `lookupDocs`, `DOC_CHUNKS`
- **AI tools** — `createTools` (render_chart + lookup_docs tool definitions for Vercel AI SDK), `pruneOldToolResults` for context management
- **Renderer** — `renderChart(spec, datasets, themeId)` → headless Vega-Lite → PNG via vega + resvg-js (no browser needed, ~10MB vs ~250MB for Playwright)
- **Types** — `ChartSpec`, `ThemeId`, `ColumnMeta`, `DataMetadata`, `ParsedCSV`, `DatasetMap`

## Key files

| File | Purpose |
|------|---------|
| `src/index.ts` | Barrel exports |
| `src/types.ts` | Shared TypeScript types |
| `src/csv-parser.ts` | CSV/Excel parsing + metadata extraction |
| `src/validate-spec.ts` | Vega-Lite spec validation + transform linting |
| `src/inject-data.ts` | Data injection (replaces URL sentinels) |
| `src/themes.ts` | Theme config (11 themes via vega-themes) |
| `src/spec-schema.ts` | Zod schemas for Vega-Lite specs |
| `src/system-prompt.ts` | Parameterized system prompt (web/plugin) |
| `src/docs.ts` | Vega-Lite reference docs (28 topics) |
| `src/tools.ts` | AI tool definitions (render_chart + lookup_docs) |
| `src/prune-context.ts` | Context pruning for multi-turn |
| `src/renderer.ts` | Headless Vega-Lite → PNG renderer |

## Testing

```bash
cd packages/core && bun run test
```

Uses Vitest with Node environment. Covers CSV/Excel parsing, spec validation, data injection, themes, schemas, and system prompt.
