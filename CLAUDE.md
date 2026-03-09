# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev      # Start dev server on localhost:3000
bun run build    # Production build (web app)
bun run lint     # Run ESLint (web app)
bun run test     # Run vitest across all packages (NOT `bun test`)

# Per-package commands
cd packages/core && bun run test        # Core package tests only
cd apps/web && bun run build            # Web app build only
cd apps/plugin && bun start             # Start MCP server
cd packages/renderer && bun run build:bundle  # Build Vega renderer bundle
```

Always run `bun run lint`, `bun run build`, and `bun run test` to verify changes.

## Architecture

Chartroom is a **Bun workspace monorepo** with shared packages and multiple apps. It lets users upload CSVs and generate [Vega-Lite](https://vega.github.io/vega-lite/) charts via AI.

### Monorepo structure

```
packages/
  core/         @chartroom/core     — Shared logic: types, CSV parsing, spec validation,
                                       data injection, themes, docs, system prompt, Zod schemas,
                                       AI tools, model config
  renderer/     @chartroom/renderer — Playwright-based headless Vega-Lite → PNG rendering

apps/
  web/          @chartroom/web      — Next.js 16 App Router web app
  eval/         @chartroom/eval     — Eval runner (cases, judge, reports)
  plugin/       @chartroom/plugin   — Claude Code MCP server + /chart skill
```

### `@chartroom/core` (packages/core)

Node-compatible shared logic (`ai` SDK is an optional peer dependency):
- **Types**: `ChartSpec`, `ThemeId`, `ColumnMeta`, `DataMetadata`, `ParsedCSV`, `DatasetMap`
- **CSV**: `parseCSV` (browser File), `parseCSVString` (Node string), `extractMetadata`, `metadataToContext`, `datasetsToContext`
- **Spec utils**: `stripStyling`, `injectData`, `validateSpec`
- **Themes**: `DEFAULT_CONFIG`, `getThemeConfig` (11 built-in via vega-themes)
- **Schemas**: `vlSpecSchema`, `createVlSpecSchema` (Zod)
- **System prompt**: `buildSystemPrompt({ context: "web"|"plugin", dataContext? })`
- **Docs**: `TOPIC_IDS`, `lookupDocs` (28 Vega-Lite reference topics)
- **AI tools**: `createTools` (render_chart + lookup_docs tool defs), `pruneOldToolResults`
- **Models**: `resolveModelId`, `MODEL_TIERS`, `MODEL_TIER_LABELS`, `DEFAULT_TIER`

### `@chartroom/renderer` (packages/renderer)

Headless chart rendering via Playwright + vega-embed:
- `initRenderer()` → launches Chromium, loads HTML page with bundled vega-embed
- `renderChart(page, spec, datasets, themeId)` → returns `{ png, warnings }` or `{ error }`
- Bundle built with esbuild: `bun run build:bundle`

### `@chartroom/web` (apps/web)

Next.js 16 App Router web app. Two-panel layout:
- **Left**: ChatPanel (420px) — chat UI + CSV upload
- **Right**: ChartPanel — chart preview + spec editor (visual/JSON) + themes + export

AI layer uses Vercel AI SDK (`streamText`, `useChat`) with OpenRouter.
- `render_chart` — client-side tool (no `execute`), renders via `renderVegaLite`, captures PNG
- `lookup_docs` — server-side tool, queries core docs

Shared logic imported from `@chartroom/core`. Local files in `lib/chart/`, `lib/csv/`, `lib/docs/` are thin re-exports.

### `@chartroom/plugin` (apps/plugin)

Claude Code MCP server providing chart generation tools:
- **`load_csv`** — parse CSV file, return column metadata
- **`validate_chart`** — validate Vega-Lite spec via compiler
- **`render_chart`** — render spec to PNG via `@chartroom/renderer`
- **`open_interactive`** — open chart in browser with tooltips

Skill: `/chart` — guided workflow for chart generation from CSV data. Vega-Lite reference docs in `skills/chart/docs/`.

### `@chartroom/eval` (apps/eval)

Eval runner for automated chart quality assessment:
- Loads eval cases from `cases/` (JSON) and data from `data/` (CSV)
- Runs agentic loop with `generateText` + `createTools` from core
- Renders charts via `@chartroom/renderer`, judges via vision model
- Generates HTML reports in `results/`

### Key files

| File | Purpose |
|------|---------|
| `packages/core/src/index.ts` | Core barrel exports |
| `packages/core/src/csv-parser.ts` | CSV parsing + metadata extraction |
| `packages/core/src/validate-spec.ts` | Vega-Lite spec validation + transform linting |
| `packages/core/src/inject-data.ts` | Data injection (replaces URL sentinels) |
| `packages/core/src/themes.ts` | Theme config (11 themes via vega-themes) |
| `packages/core/src/spec-schema.ts` | Zod schemas for Vega-Lite specs |
| `packages/core/src/system-prompt.ts` | Parameterized system prompt (web/plugin) |
| `packages/core/src/docs.ts` | Vega-Lite reference docs (28 topics) |
| `packages/core/src/tools.ts` | AI tool definitions (render_chart + lookup_docs) |
| `packages/core/src/models.ts` | Model tier config + resolution |
| `packages/core/src/prune-context.ts` | Context pruning for multi-turn |
| `packages/renderer/src/renderer.ts` | Playwright headless renderer |
| `apps/web/src/app/api/chat/route.ts` | Streaming API endpoint |
| `apps/web/src/lib/chart/render-vega.ts` | Browser-side Vega-Lite rendering |
| `apps/web/src/components/chat/chat-panel.tsx` | Chat UI with useChat |
| `apps/web/src/components/chart/chart-panel.tsx` | Chart display + editor |
| `apps/plugin/src/server.ts` | MCP server entry point |
| `apps/plugin/skills/chart/SKILL.md` | /chart skill definition |
| `apps/plugin/skills/chart/docs/` | Vega-Lite reference docs (28 markdown files) |
| `apps/eval/src/index.ts` | Eval runner entry point |
| `apps/eval/src/run-case.ts` | Single eval case execution |

### Testing

- **Core**: `packages/core` — 64 tests (Vitest, Node environment)
- **Web**: `apps/web` — 49 tests (Vitest, jsdom environment)

Run all with `bun run test`. Run per-package with `cd <package> && bun run test`.

### Environment

Web app requires `OPENROUTER_API_KEY` in `apps/web/.env.local`. Model tiers configurable via `MODEL_FAST`, `MODEL_MID`, `MODEL_POWER` env vars. See `apps/web/.env.example`.
