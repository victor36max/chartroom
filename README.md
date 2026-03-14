# Chartroom

AI-powered chart generation from CSV and Excel data using [Vega-Lite](https://vega.github.io/vega-lite/). Upload a CSV or Excel file, describe the chart you want, and get a publication-ready visualization.

## What it does

Chartroom takes CSV or Excel data and natural language prompts to generate Vega-Lite chart specifications via AI. It validates specs, renders charts, and supports iterative editing through conversation. Available as a web app and as a Claude Code MCP plugin.

## Features

- **AI chart generation** — Describe charts in natural language, get Vega-Lite specs
- **Data upload** — Drag-and-drop CSV and Excel files (.xls, .xlsx) with automatic column type detection (up to 5,000 rows)
- **Visual spec editor** — Edit marks, encodings, transforms, and layers without writing JSON
- **JSON editor** — Direct spec editing with CodeMirror for full control
- **11 themes** — Default, Dark, Excel, FiveThirtyEight, ggplot2, Google Charts, LA Times, PowerBI, Quartz, Urban Institute, Vox
- **Chart export** — PNG (configurable resolution) and SVG with optional transparency
- **Multi-layer charts** — Compose layered visualizations with per-layer editing
- **Multiple datasets** — Load and reference multiple data files in a single session
- **Model tiers** — Choose between Fast, Standard, and Power AI models
- **Data table** — Preview uploaded data (first 100 rows) with column metadata
- **Optional auth & billing** — Supabase OAuth + Stripe payments (can run fully open without auth)

## Architecture

Bun workspace monorepo with shared packages and multiple apps:

```
packages/
  core/         @chartroom/core     — Shared logic (types, parsing, validation, rendering)
  mcp/          @chartroom/mcp      — MCP server: chart generation tools

apps/
  web/          @chartroom/web      — Next.js 16 web app
  eval/         @chartroom/eval     — Automated eval runner with vision-model judging
  plugin/       @chartroom/plugin   — Claude Code plugin: /chart skill + docs
```

See each package's README for detailed documentation:
- [`packages/core`](packages/core/README.md)
- [`packages/mcp`](packages/mcp/README.md)
- [`apps/web`](apps/web/README.md)
- [`apps/eval`](apps/eval/README.md)
- [`apps/plugin`](apps/plugin/README.md)

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

Open [http://localhost:3000](http://localhost:3000). Upload a CSV or Excel file and start chatting to generate charts.

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

## Claude Code plugin

Chartroom includes a Claude Code plugin that adds chart generation capabilities via MCP tools and the `/chart` skill.

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
2. Provide a CSV or Excel file path when prompted
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

## Testing

The test suite uses [Vitest](https://vitest.dev) and covers parsing, validation, rendering, and AI tooling across the monorepo.

```bash
bun run test
```

Tests are colocated with source files under `src/__tests__/` in each package. The suite includes:

- **CSV/Excel parsing** — type detection, edge cases, malformed input
- **Spec validation** — Vega-Lite compiler checks, transform linting, field name validation
- **Data injection** — URL sentinel replacement, nested layer/facet/composite handling
- **System prompt** — context-aware prompt construction for web and plugin modes
- **Themes** — built-in theme resolution

This is testing text added for demonstration purposes.
