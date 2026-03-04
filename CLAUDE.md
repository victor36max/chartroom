# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev        # Start dev server on localhost:3000
bun build      # Production build
bun lint       # Run ESLint
```

No tests are configured.

## Architecture

Firechart is a Next.js 16 (App Router) app that lets users upload a CSV and chat with an AI to generate [Observable Plot](https://observablehq.com/plot/) charts.

### Two-panel layout

`src/app/page.tsx` renders:
- **Left panel** — `ChatPanel` (420px fixed): chat UI + CSV upload
- **Right panel** — `ChartPanel` (flex): renders the current chart

State (`csvData`, `currentChart`) lives in `page.tsx` and flows down as props.

### AI layer (Vercel AI SDK)

The API route `src/app/api/chat/route.ts` uses `streamText` from `ai` with `@openrouter/ai-sdk-provider`. The model is configurable via `MODEL_ID` env var. It exposes two tools:

- **`render_chart`** — *client-side only* (no `execute`). The AI emits a JSON chart spec; `ChatPanel` intercepts it, calls `specToPlot`, captures a screenshot via `html-to-image`, and sends the PNG back as a tool result.
- **`analyze_data`** — *server-side*. Runs `analyzeData()` from `src/lib/agent/data-analyzer.ts` against the CSV rows passed in the request body.

After each `render_chart` result, `injectChartImages()` in the route transforms the PNG back into a multimodal image part so the model can evaluate its own output.

The client uses `useChat` from `@ai-sdk/react` with `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` to drive the agentic loop.

### Chart pipeline

```
AI emits chart spec (JSON)
  → ChatPanel receives tool call
  → specToPlot() [src/lib/chart/spec-to-plot.ts]
      resolves mark types → Observable Plot constructors
      resolves transforms (groupX, binX, stackY, …) inline in options
  → Plot.plot() renders SVG in ChartRenderer
  → html-to-image captures PNG
  → PNG sent back as tool result
  → injectChartImages() in route injects PNG into model message history
```

### Key files

| File | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | Streaming API endpoint, model config, image injection |
| `src/lib/agent/tools.ts` | Tool definitions (Zod schemas for chart spec) |
| `src/lib/agent/system-prompt.ts` | System prompt with chart spec format and tips |
| `src/lib/agent/data-analyzer.ts` | Server-side CSV analysis (stats, grouping, correlation) |
| `src/lib/chart/spec-to-plot.ts` | Converts AI JSON spec → Observable Plot marks |
| `src/lib/csv/parser.ts` | PapaParse wrapper + `metadataToContext()` for prompt injection |
| `src/types/index.ts` | Shared types: `ChartSpec`, `MarkSpec`, `ParsedCSV`, `DataMetadata` |
| `src/components/chat/chat-panel.tsx` | `useChat` hook, client-side tool handling, CSV upload |
| `src/components/chart/chart-renderer.tsx` | Renders Observable Plot SVG into DOM |

### Environment

Requires `OPENROUTER_API_KEY` in `.env.local`. Optionally set `MODEL_ID` (defaults to `anthropic/claude-sonnet-4`). See `.env.example`.
