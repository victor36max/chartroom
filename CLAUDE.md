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

Firechart is a Next.js 16 (App Router) app that lets users upload a CSV and chat with an AI to generate [Observable Plot](https://observablehq.com/plot/) charts.

### Two-panel layout

`src/app/page.tsx` renders:
- **Left panel** — `ChatPanel` (420px fixed): chat UI + CSV upload
- **Right panel** — `ChartPanel` (flex): chart preview + spec editor (visual/JSON tabs) + PNG/SVG export

State (`csvData`, `currentChart`) lives in `page.tsx` and flows down as props.

### AI layer (Vercel AI SDK)

The API route `src/app/api/chat/route.ts` uses `streamText` from `ai` with `@openrouter/ai-sdk-provider`. The model is configurable via `MODEL_ID` env var. It exposes three tools:

- **`render_chart`** — *client-side only* (no `execute`). The AI emits a JSON chart spec; `ChatPanel` intercepts it, calls `specToPlot`, captures a screenshot via `html-to-image`, and sends the PNG back as a tool result.
- **`analyze_data`** — *server-side*. Runs `analyzeData()` from `src/lib/agent/data-analyzer.ts` against the CSV rows passed in the request body.
- **`lookup_docs`** — *server-side*. Queries Observable Plot documentation from `src/lib/docs/plot-docs.ts` (24 topics covering marks, transforms, scales, styling, patterns).

After each `render_chart` result, `injectChartImages()` in the route transforms the PNG back into a multimodal image part so the model can evaluate its own output. `pruneOldCharts()` manages context by keeping only the last 5 chart specs and the latest image. A `stepCountIs(5)` stop condition limits agentic iterations.

The client uses `useChat` from `@ai-sdk/react` with `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` to drive the agentic loop.

### Chart pipeline

```
AI emits chart spec (JSON)
  → ChatPanel receives tool call
  → specToPlot() [src/lib/chart/spec-to-plot.ts]
      resolves mark types → Observable Plot constructors
      resolves transforms (groupX, binX, stackY, melt, …) inline in options
      arc marks → custom renderArc() [src/lib/chart/arc-mark.ts]
  → Plot.plot() renders SVG in ChartRenderer
  → html-to-image captures PNG
  → PNG sent back as tool result
  → injectChartImages() in route injects PNG into model message history
```

### Chart panel

`ChartPanel` provides a split-pane view:
- **Left**: live chart preview via `ChartRenderer`
- **Right**: spec editor with two tabs:
  - **Visual** — form-based mark editor (`visual-spec-editor.tsx` + `mark-editor-card.tsx`)
  - **JSON** — CodeMirror editor (`@uiw/react-codemirror`)
- **Export**: PNG and SVG download via `export-chart.ts`

### Key files

| File | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | Streaming API endpoint, model config, image injection, context pruning |
| `src/lib/agent/tools.ts` | Tool definitions (Zod schemas for chart spec) |
| `src/lib/agent/system-prompt.ts` | System prompt with chart spec format, rules, and pre-render checklist |
| `src/lib/agent/data-analyzer.ts` | Server-side CSV analysis (stats, grouping, correlation) |
| `src/lib/docs/plot-docs.ts` | Observable Plot documentation (24 topics) for `lookup_docs` tool |
| `src/lib/chart/spec-to-plot.ts` | Converts AI JSON spec → Observable Plot marks |
| `src/lib/chart/arc-mark.ts` | Custom arc/pie/donut mark rendering |
| `src/lib/chart/export-chart.ts` | PNG and SVG export utilities |
| `src/lib/csv/parser.ts` | PapaParse wrapper + `metadataToContext()` for prompt injection |
| `src/types/index.ts` | Shared types: `ChartSpec`, `MarkSpec`, `ParsedCSV`, `DataMetadata` |
| `src/components/chat/chat-panel.tsx` | `useChat` hook, client-side tool handling, CSV upload |
| `src/components/chart/chart-renderer.tsx` | Renders Observable Plot SVG into DOM |
| `src/components/chart/chart-panel.tsx` | Chart display with visual/JSON editor tabs and export |
| `src/components/chart/visual-spec-editor.tsx` | Visual mark editor |
| `src/components/chart/mark-editor-card.tsx` | Card-based mark editing UI |

### Testing

Uses Vitest with jsdom environment (needed for Observable Plot DOM rendering). Config in `vitest.config.ts`.

Test files:
- `src/lib/chart/__tests__/spec-to-plot.test.ts`
- `src/lib/csv/__tests__/parser.test.ts`

Run with `bun run test` (NOT `bun test`).

### Evals

Evaluation framework in `evals/` for benchmarking chart generation quality:
- `evals/cases/` — test case JSON files (basic charts, multi-turn, edge cases, decline tests)
- `evals/data/` — sample CSV datasets (sales, stocks, students, etc.)
- `evals/runner/` — runner infrastructure (`index.ts`, `judge.ts`, `render.ts`, `report.ts`)
- `evals/results/` — timestamped result directories with screenshots and reports

### Environment

Requires `OPENROUTER_API_KEY` in `.env.local`. Optionally set `MODEL_ID` (defaults to `anthropic/claude-sonnet-4`). See `.env.example`.
