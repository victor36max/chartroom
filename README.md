# Chartroom

AI-powered chart generation from CSV data using [Vega-Lite](https://vega.github.io/vega-lite/). Upload a CSV, describe the chart you want, and get a publication-ready visualization.

## What it does

Chartroom takes CSV data and natural language prompts to generate Vega-Lite chart specifications via AI. It validates specs, renders charts, and supports iterative editing through conversation. Available as a web app and as a Claude Code MCP plugin.

## Features

- **AI chart generation** — Describe charts in natural language, get Vega-Lite specs
- **CSV upload** — Drag-and-drop with automatic column type detection (up to 5,000 rows)
- **Visual spec editor** — Edit marks, encodings, transforms, and layers without writing JSON
- **JSON editor** — Direct spec editing with CodeMirror for full control
- **11 themes** — Default, Dark, Excel, FiveThirtyEight, ggplot2, Google Charts, LA Times, PowerBI, Quartz, Urban Institute, Vox
- **Chart export** — PNG (configurable resolution) and SVG with optional transparency
- **Multi-layer charts** — Compose layered visualizations with per-layer editing
- **Multiple datasets** — Load and reference multiple CSV files in a single session
- **Model tiers** — Choose between Fast, Standard, and Power AI models
- **Data table** — Preview uploaded data (first 100 rows) with column metadata
- **Optional auth & billing** — Supabase OAuth + Stripe payments (can run fully open without auth)

## Architecture

Bun workspace monorepo with shared packages and multiple apps:

```
packages/
  core/         @chartroom/core     — Shared logic (types, CSV parsing, validation,
                                       themes, docs, AI tools, system prompt,
                                       headless PNG rendering via vega + resvg-js)
  mcp/          @chartroom/mcp      — MCP server: chart generation tools (publishable to npm)

apps/
  web/          @chartroom/web      — Next.js 16 web app
  eval/         @chartroom/eval     — Automated eval runner with vision-model judging
  plugin/       @chartroom/plugin   — Claude Code plugin: /chart skill + docs (not published)
```

## Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.3.10+
- An [OpenRouter](https://openrouter.ai) API key (for the web app and eval runner)

### Installation

```bash
git clone <repo-url> && cd chartroom
bun install
```

### Environment setup

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and add your OpenRouter API key:

```
OPENROUTER_API_KEY=your-key-here
```

### Run the dev server

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
| `bun run build:mcp` | Build MCP server package |

### Per-package

```bash
cd packages/core && bun run test              # Core tests
cd apps/web && bun run build                  # Web app build
cd packages/mcp && bun start                  # Start MCP server
```

## Packages

### @chartroom/core

Shared, Node-compatible library with no framework dependencies (`ai` SDK is an optional peer dep):

- **CSV parsing** — `parseCSV` (browser), `parseCSVString` (Node), metadata extraction with type inference (number, string, date, boolean), wide-format detection, join key detection
- **Spec validation** — Vega-Lite compiler validation + transform linting (aggregate aliases, field references, lookup transforms)
- **Data injection** — Replaces URL sentinels in specs with actual data objects, handles nested layers/facets/concats
- **Themes** — 11 built-in themes via vega-themes
- **Zod schemas** — Runtime schema validation for Vega-Lite specs
- **System prompt** — Context-aware prompt builder for web and plugin environments
- **Docs** — 28 Vega-Lite reference topics (marks, encoding, transforms, layout, patterns)
- **AI tools** — `render_chart` and `lookup_docs` tool definitions for Vercel AI SDK
- **Context pruning** — Removes old tool results to manage conversation context size
- **Renderer** — `renderChart(spec, datasets, themeId)` → headless Vega-Lite → PNG via vega + resvg-js (no browser needed, ~10MB vs ~250MB for Playwright)

### @chartroom/web

Next.js 16 App Router web app with a two-panel layout:

- **Left panel** — Chat interface with CSV upload, model tier selector (fast/standard/power), multi-turn conversation with auto-send after tool calls
- **Right panel** — Chart preview, data table, spec editor (visual + JSON via CodeMirror), theme selector, PNG/SVG export

AI layer uses Vercel AI SDK (`streamText`, `useChat`) with OpenRouter. The `render_chart` tool runs client-side; `lookup_docs` runs server-side.

#### Visual spec editor

Accordion-based UI for editing Vega-Lite specs:
- **Mark editor** — 13 mark types (bar, line, area, point, rect, rule, text, tick, arc, boxplot, circle, square, trail) + tooltip toggle
- **Encoding editor** — 11 channels (x, y, color, size, shape, opacity, theta, radius, text, detail, order) with type and aggregate selectors
- **Transform editor** — 6 transform types (filter, calculate, fold, aggregate, bin, window) with 10 aggregate and 14 window operations
- **Layer editor** — Multi-layer composition with per-layer mark/encoding editing
- **Computed fields** — Auto-extracts fields generated by transforms

#### Auth & billing (optional)

Controlled by `NEXT_PUBLIC_AUTH_ENABLED` (default: `false`). When disabled, the app works without any authentication — ideal for self-hosting.

When enabled:
- **OAuth** via Supabase (Google, GitHub providers)
- **Database** — PostgreSQL via Drizzle ORM (profiles, usage logs, payments)
- **Stripe payments** — Credit top-ups ($5, $10, $25) via checkout sessions + webhooks
- **Usage tracking** — Per-token cost deduction with configurable markup multiplier
- **Free credits** — Configurable amount granted on first sign-up (default: $1.00)

### @chartroom/mcp

MCP server providing chart generation tools (publishable to npm as `@chartroom/mcp`):

| Tool | Description |
|------|-------------|
| `load_csv` | Parse a CSV file, return column metadata |
| `validate_chart` | Validate a Vega-Lite spec via the compiler |
| `render_chart` | Render a spec to PNG via vega + resvg-js |
| `open_interactive` | Open chart in browser with tooltips |

### @chartroom/plugin

Claude Code plugin assets (not published to npm):
- `/chart` skill — guided workflow for chart generation from CSV data
- 28 Vega-Lite reference docs
- `.mcp.json` — configures Claude Code to use `npx @chartroom/mcp`

### @chartroom/eval

Automated chart quality evaluation:

- Loads test cases (JSON) and CSV data
- Runs agentic generation loop with `generateText` + tools from core
- Renders via `renderChart` from `@chartroom/core`, judges via vision model
- Scores on 5 criteria (correctness, chart type, readability, aesthetics, completeness) — max 25
- Generates HTML + JSON reports with embedded screenshots
- CLI flags: `--tier`, `--tag`, `--case`, `--model`, `--concurrency`, `--no-judge`

```bash
bun run eval                    # Run all cases
bun run eval -- --tier power    # Use power model tier
bun run eval -- --tag scatter   # Filter by tag
bun run eval -- --concurrency 3 # Limit parallelism
```

Results are saved in `apps/eval/results/{timestamp}/`.

## Environment variables

### Web app (`apps/web/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `NEXT_PUBLIC_AUTH_ENABLED` | No | Enable auth + billing (default: false) |
| `NEXT_PUBLIC_MODEL_FAST` | No | Fast tier model ID (default: `qwen/qwen3.5-35b-a3b`) |
| `NEXT_PUBLIC_MODEL_MID` | No | Standard tier model ID (default: `qwen/qwen3.5-122b-a10b`) |
| `NEXT_PUBLIC_MODEL_POWER` | No | Power tier model ID (default: `qwen/qwen3.5-397b-a17b`) |
| `NEXT_PUBLIC_SUPABASE_URL` | If auth | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | If auth | Supabase anon key |
| `DATABASE_URL` | If auth | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | If auth | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | If auth | Stripe webhook signing secret |
| `FREE_CREDITS_USD` | No | Free credits on sign-up (default: 1.00) |
| `MARKUP_MULTIPLIER` | No | Cost markup multiplier (default: 1.3) |

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

## Claude Code plugin

Chartroom includes a Claude Code plugin that adds chart generation capabilities via MCP tools and the `/chart` skill. The plugin installs both the MCP server (providing `load_csv`, `validate_chart`, `render_chart`, `open_interactive` tools) and the `/chart` skill in one step.

### Install

```bash
# Add the chartroom marketplace
/plugin marketplace add victor36max/chartroom

# Install the plugin
/plugin install chartroom
```

This automatically sets up the MCP server (via `npx @chartroom/mcp`) and makes the `/chart` skill available.

### Usage

Once installed, use `/chart` in Claude Code for a guided chart generation workflow:

1. `/chart` — starts the workflow
2. Provide a CSV file path when prompted
3. Describe the chart you want in natural language
4. The plugin loads your data, generates a Vega-Lite spec, validates it, and renders a PNG
5. Iterate on the chart through conversation

## Tech stack

- **Runtime**: [Bun](https://bun.sh)
- **Language**: TypeScript 5 (strict mode)
- **Web framework**: [Next.js](https://nextjs.org) 16 (App Router, React 19)
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai) + [OpenRouter](https://openrouter.ai)
- **Charts**: [Vega-Lite](https://vega.github.io/vega-lite/) 6 + [vega-embed](https://github.com/vega/vega-embed)
- **Rendering**: [Vega](https://vega.github.io/vega/) (headless SVG) + [@resvg/resvg-js](https://github.com/nicolo-ribaudo/resvg-js) (SVG → PNG)
- **UI**: [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS](https://tailwindcss.com) v4
- **Auth**: [Supabase](https://supabase.com) (optional)
- **Payments**: [Stripe](https://stripe.com) (optional)
- **Database**: PostgreSQL + [Drizzle ORM](https://orm.drizzle.team) (optional)
- **MCP**: [Model Context Protocol SDK](https://modelcontextprotocol.io)
- **Testing**: [Vitest](https://vitest.dev)
- **Build**: [tsup](https://tsup.egoist.dev)
