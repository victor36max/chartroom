# ⛵ Chartroom

AI-powered chart generation from CSV data using [Vega-Lite](https://vega.github.io/vega-lite/). Upload a CSV, describe the chart you want, and get a publication-ready visualization.

## What it does

Chartroom takes CSV data and natural language prompts to generate Vega-Lite chart specifications via AI. It validates specs, renders charts, and supports iterative editing through conversation. Available as a web app and as a Claude Code MCP plugin.

## Architecture

Bun workspace monorepo with shared packages and multiple apps:

```
packages/
  core/         @chartroom/core     — Shared logic (types, CSV parsing, validation,
                                       themes, docs, AI tools, system prompt)
  renderer/     @chartroom/renderer — Headless Vega-Lite → PNG rendering (Playwright)

apps/
  web/          @chartroom/web      — Next.js 16 web app
  eval/         @chartroom/eval     — Automated eval runner with vision-model judging
  plugin/       @chartroom/plugin   — Claude Code MCP server + /chart skill
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.3.10+
- An [OpenRouter](https://openrouter.ai) API key (for the web app and eval runner)

### Installation

```bash
git clone <repo-url> && cd chartroom
bun install
```

### Environment Setup

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and add your OpenRouter API key:

```
OPENROUTER_API_KEY=your-key-here
```

### Run the Dev Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Upload a CSV and start chatting to generate charts.

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (localhost:3000) |
| `bun run build` | Production build (web app) |
| `bun run lint` | ESLint across all packages |
| `bun run typecheck` | TypeScript type checking across all packages |
| `bun run test` | Vitest across all packages |
| `bun run eval` | Run eval suite |
| `bun run build:packages` | Build core, renderer, and plugin |

### Per-package

```bash
cd packages/core && bun run test              # Core tests
cd apps/web && bun run build                  # Web app build
cd apps/plugin && bun start                   # Start MCP server
cd packages/renderer && bun run build:bundle  # Build Vega renderer bundle
```

## Packages

### @chartroom/core

Shared, Node-compatible library with no framework dependencies (`ai` SDK is an optional peer dep):

- **CSV parsing** — `parseCSV` (browser), `parseCSVString` (Node), metadata extraction with type inference (number, string, date, boolean), wide-format detection, join key detection
- **Spec validation** — Vega-Lite compiler validation + transform linting (aggregate aliases, field references, lookup transforms)
- **Data injection** — Replaces URL sentinels in specs with actual data objects, handles nested layers/facets/concats
- **Themes** — 11 built-in themes via vega-themes (default, dark, excel, fivethirtyeight, ggplot2, googlecharts, latimes, powerbi, quartz, urbaninstitute, vox)
- **Zod schemas** — Runtime schema validation for Vega-Lite specs
- **System prompt** — Context-aware prompt builder for web and plugin environments
- **Docs** — 28 Vega-Lite reference topics (marks, encoding, transforms, layout, patterns)
- **AI tools** — `render_chart` and `lookup_docs` tool definitions for Vercel AI SDK
- **Context pruning** — Removes old tool results to manage conversation context size

### @chartroom/renderer

Headless chart rendering via Playwright + vega-embed:

- Launches Chromium with a minimal HTML page containing a bundled vega-embed
- Renders Vega-Lite specs to PNG with theme support
- Dynamic viewport resizing to fit chart content
- Bundle built with esbuild from vega-embed + core utilities

### @chartroom/web

Next.js 16 App Router web app with a two-panel layout:

- **Left panel** — Chat interface with CSV upload (max 5000 rows), model tier selector (fast/standard/power), multi-turn conversation
- **Right panel** — Chart preview, data table, spec editor (visual + JSON via CodeMirror), theme selector, PNG/SVG export

AI layer uses Vercel AI SDK (`streamText`, `useChat`) with OpenRouter. The `render_chart` tool runs client-side; `lookup_docs` runs server-side.

### @chartroom/plugin

Claude Code MCP server with 4 tools:

| Tool | Description |
|------|-------------|
| `load_csv` | Parse a CSV file, return column metadata |
| `validate_chart` | Validate a Vega-Lite spec via the compiler |
| `render_chart` | Render a spec to PNG via headless Playwright |
| `open_interactive` | Open chart in browser with tooltips |

Includes the `/chart` skill — a guided workflow for chart generation from CSV data.

### @chartroom/eval

Automated chart quality evaluation:

- Loads test cases (JSON) and CSV data
- Runs agentic generation loop with `generateText` + tools from core
- Renders via `@chartroom/renderer`, judges via vision model
- Scores on 5 criteria (correctness, chart type, readability, aesthetics, completeness) — max 25
- Generates HTML reports with embedded screenshots
- CLI flags: `--tier`, `--tag`, `--case`, `--model`, `--concurrency`, `--no-judge`

## Environment Variables

### Web App (`apps/web/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key (server-side) |
| `NEXT_PUBLIC_MODEL_FAST` | No | Fast tier model ID (default: `qwen/qwen3.5-35b-a3b`) |
| `NEXT_PUBLIC_MODEL_MID` | No | Standard tier model ID (default: `qwen/qwen3.5-122b-a10b`) |
| `NEXT_PUBLIC_MODEL_POWER` | No | Power tier model ID (default: `qwen/qwen3.5-397b-a17b`) |

### Eval (`apps/eval/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `MODEL_FAST` | No | Fast tier model ID |
| `MODEL_MID` | No | Standard tier model ID |
| `MODEL_POWER` | No | Power tier model ID |

## Testing

```bash
bun run test                        # All packages
cd packages/core && bun run test    # Core only
cd apps/web && bun run test         # Web only
```

- **Core** — Vitest, Node environment. Covers CSV parsing, spec validation, data injection, themes, schemas, system prompt.
- **Web** — Vitest, jsdom environment. Covers chart utilities, CSV parsing, components.

## MCP Plugin Setup

The plugin registers as an MCP server for Claude Code. To use it:

1. Build the packages: `bun run build:packages`
2. The `.mcp.json` at the repo root configures the server to run via `apps/plugin/start.sh`
3. Use the `/chart` skill in Claude Code for guided chart generation

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) 1.3.10
- **Language**: TypeScript 5 (strict mode)
- **Web framework**: [Next.js](https://nextjs.org) 16 (App Router, React 19)
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai) 6 + [OpenRouter](https://openrouter.ai)
- **Charts**: [Vega-Lite](https://vega.github.io/vega-lite/) 6 + [vega-embed](https://github.com/vega/vega-embed) 7
- **Validation**: [Zod](https://zod.dev) 4
- **Rendering**: [Playwright](https://playwright.dev) (headless Chromium)
- **UI**: [Radix UI](https://www.radix-ui.com), [Tailwind CSS](https://tailwindcss.com) 4, [Lucide](https://lucide.dev) icons
- **MCP**: [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) 1.12
- **Testing**: [Vitest](https://vitest.dev) 4
- **Build**: [tsup](https://tsup.egoist.dev), [esbuild](https://esbuild.github.io)
