# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start dev server on localhost:3000
bun build        # Production build
bun lint         # Run ESLint
bun run test     # Run vitest (NOT `bun test` — that uses bun's built-in runner)
bun run test:watch  # Vitest in watch mode
bun run eval     # Run eval suite
bun run eval:build  # Build eval renderer only
```

Always run `bun run lint`, `bun run build`, and `bun run test` to verify changes.

## Architecture

Firechart is a Next.js 16 (App Router) app that lets users upload a CSV and chat with an AI to generate [Vega-Lite](https://vega.github.io/vega-lite/) charts.

### Two-panel layout

`src/app/page.tsx` renders:
- **Left panel** — `ChatPanel` (420px fixed): chat UI + CSV upload
- **Right panel** — `ChartPanel` (flex): chart preview + spec editor (visual/JSON tabs) + theme selector + PNG/SVG/PDF export

State (`csvData`, `currentChart`, `themeId`) lives in `page.tsx` and flows down as props.

### AI layer (Vercel AI SDK)

The API route `src/app/api/chat/route.ts` uses `streamText` from `ai` with `@openrouter/ai-sdk-provider`. The model is configurable via three tiers (fast/mid/power) defined in `src/lib/agent/models.ts`. It exposes three tools:

- **`render_chart`** — *client-side only* (no `execute`). The AI emits a Vega-Lite spec; `ChatPanel` intercepts it, renders via `renderVegaLite`, captures a screenshot via `html-to-image`, and sends the PNG back as a tool result.
- **`filter_data`** — *server-side*. Filters/aggregates CSV data to top/bottom N entries via `filterData()` from `src/lib/agent/data-filter.ts`.
- **`lookup_docs`** — *server-side*. Queries Vega-Lite documentation from `src/lib/docs/vl-docs.ts` (25 topics covering marks, encoding, transforms, scales, composition, styling, patterns).

After each `render_chart` result, `injectChartImages()` in the route transforms the PNG back into a multimodal image part so the model can evaluate its own output. `pruneOldCharts()` manages context by keeping only the last 5 chart specs and the latest image. A `stepCountIs(5)` stop condition limits agentic iterations.

The client uses `useChat` from `@ai-sdk/react` with `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` to drive the agentic loop.

### Chart pipeline

```
AI emits Vega-Lite spec (JSON)
  → ChatPanel receives tool call
  → renderVegaLite() [src/lib/chart/render-vega.ts]
      stripStyling() removes config/$schema/background/padding/autosize
      injectData() replaces { name: "csv" } sentinel with actual rows
      getThemeConfig() resolves theme (11 built-in themes via vega-themes)
      vega-embed renders spec → SVG
  → html-to-image captures PNG
  → PNG sent back as tool result
  → injectChartImages() in route injects PNG into model message history
```

### Chart panel

`ChartPanel` provides a split-pane view:
- **Left**: live chart preview via `ChartRenderer`
- **Right**: spec editor with two tabs:
  - **Visual** — form-based layer editor (`visual-spec-editor.tsx` + `layer-editor-card.tsx`)
  - **JSON** — CodeMirror editor (`@uiw/react-codemirror`)
- **Theme**: selector with 11 themes (default, dark, fivethirtyeight, latimes, vox, urbaninstitute, googlecharts, excel, powerbi, quartz, ggplot2)
- **Export**: PNG, SVG, and PDF download via `export-chart.ts`

### Key files

| File | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | Streaming API endpoint, model config, image injection, context pruning |
| `src/lib/agent/tools.ts` | Tool definitions (Zod schemas for Vega-Lite spec) |
| `src/lib/agent/system-prompt.ts` | System prompt with Vega-Lite spec format, rules, and pre-render checklist |
| `src/lib/agent/data-filter.ts` | Server-side CSV filtering (top/bottom N, groupBy + aggregate) |
| `src/lib/agent/models.ts` | Model tier config (fast/mid/power) and `resolveModelId()` |
| `src/lib/docs/vl-docs.ts` | Vega-Lite documentation (25 topics) for `lookup_docs` tool |
| `src/lib/chart/render-vega.ts` | Renders Vega-Lite specs via vega-embed with theme support |
| `src/lib/chart/validate-spec.ts` | Validates Vega-Lite specs using vega-lite compiler |
| `src/lib/chart/inject-data.ts` | Injects CSV rows into specs (replaces `{ name: "csv" }` sentinel) |
| `src/lib/chart/strip-config.ts` | Strips styling keys (config, $schema, background, padding, autosize) |
| `src/lib/chart/export-chart.ts` | PNG, SVG, and PDF export utilities |
| `src/lib/csv/parser.ts` | PapaParse wrapper + `metadataToContext()` for prompt injection |
| `src/types/index.ts` | Shared types: `ChartSpec` (Vega-Lite TopLevelSpec), `ThemeId`, `ParsedCSV`, `DataMetadata` |
| `src/components/chat/chat-panel.tsx` | `useChat` hook, client-side tool handling, CSV upload |
| `src/components/chart/chart-renderer.tsx` | Renders Vega-Lite spec into DOM via `renderVegaLite()` |
| `src/components/chart/chart-panel.tsx` | Chart display with visual/JSON editor tabs, theme selector, and export |
| `src/components/chart/visual-spec-editor.tsx` | Visual layer editor |
| `src/components/chart/layer-editor-card.tsx` | Card-based layer editing UI |

### Testing

Uses Vitest with jsdom environment. Config in `vitest.config.ts`.

Test files:
- `src/lib/csv/__tests__/parser.test.ts`
- `src/lib/agent/__tests__/data-filter.test.ts`
- `src/lib/chart/__tests__/inject-data.test.ts`
- `src/lib/chart/__tests__/strip-config.test.ts`
- `src/lib/chart/__tests__/validate-spec.test.ts`

Run with `bun run test` (NOT `bun test`).

### Evals

Evaluation framework in `evals/` for benchmarking chart generation quality:
- `evals/cases/` — test case JSON files (basic charts, multi-turn, edge cases, decline tests)
- `evals/data/` — sample CSV datasets (sales, stocks, students, etc.)
- `evals/runner/` — runner infrastructure (`index.ts`, `judge.ts`, `render.ts`, `report.ts`, `run-case.ts`, `bundle-entry.ts`, `renderer-page.html`)
- `evals/results/` — timestamped result directories with screenshots and reports

### Environment

Requires `OPENROUTER_API_KEY` in `.env.local`. Model tiers can be overridden via `MODEL_FAST`, `MODEL_MID`, `MODEL_POWER` env vars (defaults to Qwen 3.5 variants). See `.env.example`.
