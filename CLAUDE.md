# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev            # Start dev server on localhost:3000
bun run build          # Production build (web app)
bun run lint           # Run ESLint across all packages
bun run typecheck      # Run TypeScript type checking across all packages
bun run test           # Run vitest across all packages (NOT `bun test`)
bun run eval           # Run eval suite
bun run build:mcp      # Build MCP server package

# Per-package commands
cd packages/core && bun run test              # Core package tests only
cd apps/web && bun run build                  # Web app build only
cd packages/mcp && bun start                  # Start MCP server

# Database (requires DATABASE_URL)
cd apps/web && bun run db:generate  # Generate Drizzle migrations
cd apps/web && bun run db:migrate   # Run migrations
cd apps/web && bun run db:push      # Push schema to DB
cd apps/web && bun run db:studio    # Open Drizzle Studio
```

Always run `bun run lint`, `bun run build`, and `bun run test` to verify changes.

## UI Components

Always use shadcn/ui components instead of raw HTML elements. Never use raw `<button>`, `<input>`, `<label>`, `<select>`, `<textarea>`, or `<dialog>` when a shadcn equivalent exists. Available components are in `apps/web/src/components/ui/`. Only use raw HTML elements when no shadcn component supports the required pattern (e.g., drag-and-drop dropzones, hidden file inputs, sub-pixel animated indicators, or highly custom layouts that fight component constraints).

## Architecture

Chartroom is a **Bun workspace monorepo** with shared packages and multiple apps. It lets users upload CSVs or Excel files and generate [Vega-Lite](https://vega.github.io/vega-lite/) charts via AI.

### Monorepo structure

```
packages/
  core/         @chartroom/core     — Shared logic: types, CSV/Excel parsing, spec validation,
                                       data injection, themes, docs, system prompt, Zod schemas,
                                       AI tools, headless PNG rendering (vega + resvg-js)
  mcp/          @chartroom/mcp      — MCP server: chart generation tools (publishable to npm)

apps/
  web/          @chartroom/web      — Next.js 16 App Router web app
  eval/         @chartroom/eval     — Eval runner (cases, judge, reports)
  plugin/       @chartroom/plugin   — Claude Code plugin: /chart skill + docs (not published)
```

### `@chartroom/core` (packages/core)

Node-compatible shared logic (`ai` SDK is an optional peer dependency):
- **Types**: `ChartSpec`, `ThemeId`, `ColumnMeta`, `DataMetadata`, `ParsedCSV`, `DatasetMap`
- **CSV/Excel**: `parseCSV` (browser File), `parseCSVString` (Node string), `extractMetadata`, `metadataToContext`, `datasetsToContext`, `fileNameToDatasetName`, plus Excel: `getSheetNames`, `parseExcelSheet`, `parseExcelBufferSheet`, `getSheetNamesFromBuffer`, `isExcelFile`, `excelToCSVName`
- **Spec utils**: `injectData`, `validateSpec`
- **Themes**: `DEFAULT_CONFIG`, `getThemeConfig` (11 built-in via vega-themes: default, dark, excel, fivethirtyeight, ggplot2, googlecharts, latimes, powerbi, quartz, urbaninstitute, vox)
- **Schemas**: `vlSpecSchema`, `vlUnitSchema`, `vlMarkSchema`, `encodingChannelSchema`, `createVlSpecSchema` (Zod)
- **System prompt**: `buildSystemPrompt({ context: "web"|"plugin", dataContext? })`
- **Docs**: `TOPIC_IDS`, `lookupDocs`, `DOC_CHUNKS` (28 Vega-Lite reference topics)
- **AI tools**: `createTools` (render_chart + lookup_docs tool defs), `pruneOldToolResults`
- **Renderer**: `renderChart(spec, datasets, themeId)` → headless Vega-Lite → PNG via vega + resvg-js (no browser needed)

### `@chartroom/web` (apps/web)

Next.js 16 App Router web app. Two-panel layout:
- **Left**: ChatPanel (420px, collapsible) — chat UI, CSV/Excel upload, model tier switcher
- **Right**: ChartPanel — chart preview + spec editor (visual/JSON) + themes + export

#### AI layer

Uses Vercel AI SDK (`streamText`, `useChat`) with OpenRouter:
- `render_chart` — client-side tool (no `execute`), renders via `renderVegaLite`, captures PNG
- `lookup_docs` — server-side tool, queries core docs
- Auto-send logic: up to 5 auto-sends after tool calls complete

Model tiers configured in `lib/agent/models.ts`:
- `ModelTier`: "fast" | "mid" | "power"
- Default models: Qwen 3.5 (fast: 35b-a3b, mid: 122b-a10b, power: 397b-a17b)
- `resolveModelId(tier)`, `getModelTierLabels()`, `DEFAULT_TIER` ("mid")
- Overridable via `NEXT_PUBLIC_MODEL_FAST`, `NEXT_PUBLIC_MODEL_MID`, `NEXT_PUBLIC_MODEL_POWER` env vars

#### Authentication & billing (optional)

Controlled by `NEXT_PUBLIC_AUTH_ENABLED` (default: `false`). When disabled, the app works without auth — ideal for self-hosting.

When enabled:
- **Auth**: Supabase OAuth (Google, GitHub) with session management via middleware
- **Database**: PostgreSQL via Drizzle ORM — tables: `profiles`, `usage_logs`, `payments`
- **Billing**: Stripe checkout ($5/$10/$25 top-ups), webhook handling, per-token cost deduction with configurable markup multiplier
- **Free credits**: `FREE_CREDITS_USD` env var (default: $1.00) granted on first sign-up
- **Balance check**: 402 response if insufficient balance

Key files:
- `lib/db/schema.ts` — Drizzle schema (profiles, usageLogs, payments)
- `lib/db/queries.ts` — getBalance, upsertProfile, deductBalance, creditBalance, processPayment
- `lib/supabase/` — client.ts (browser), server.ts (server), middleware.ts
- `components/auth/` — account-dropdown, auth-provider, login-modal, topup-dialog

#### Visual spec editor

Accordion-based UI for editing Vega-Lite specs without writing JSON:
- **Mark editor**: 13 mark types (bar, line, area, point, rect, rule, text, tick, arc, boxplot, circle, square, trail) + tooltip toggle
- **Encoding editor**: 11 channels (x, y, color, size, shape, opacity, theta, radius, text, detail, order) with type and aggregate selectors
- **Transform editor**: 6 transform types (filter, calculate, fold, aggregate, bin, window)
- **Layer editor**: multi-layer composition with per-layer mark/encoding editing
- **Computed fields**: auto-extracts fields from transforms (calculate, fold, aggregate, bin, window)

#### Chart export

- PNG export with configurable pixel ratio and transparency
- SVG export with transparency option
- `lib/chart/export-chart.ts`, `components/chart/chart-capture.ts`

#### Data handling

- CSV and Excel upload with metadata extraction (column types, samples, unique values, min/max)
- Multiple dataset support with named datasets
- 5,000-row in-memory limit
- Data table preview (first 100 rows)

#### API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | Streaming chat with tool execution + balance checking |
| `/api/stripe/checkout` | POST | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | Handle Stripe payment completion |
| `/api/user/balance` | GET | Fetch current user balance |
| `/auth/callback` | GET | Supabase OAuth callback + profile creation |

#### UI

Built with shadcn/ui (Radix primitives), Tailwind CSS v4, DM Sans font, dark mode via next-themes. Toast notifications via sonner. JSON editor via CodeMirror.

### `@chartroom/mcp` (packages/mcp)

MCP server providing chart generation tools (publishable to npm as `@chartroom/mcp`):
- **`load_csv`** (`src/tools/load-csv.ts`) — parse CSV or Excel file, return column metadata
- **`validate_chart`** (`src/tools/validate-chart.ts`) — validate Vega-Lite spec via compiler
- **`render_chart`** (`src/tools/render-chart.ts`) — render spec to PNG via `@chartroom/core`
- **`open_interactive`** (`src/tools/open-interactive.ts`) — open chart in browser with tooltips

### `@chartroom/plugin` (apps/plugin)

Claude Code plugin assets (not published to npm, consumed locally by Claude Code):
- Skill: `/chart` — guided workflow for chart generation from CSV/Excel data
- Vega-Lite reference docs in `skills/chart/docs/` (28 topics)
- `.mcp.json` — configures Claude Code to use `npx @chartroom/mcp`
- `scripts/generate-skill.ts` — generates SKILL.md and docs from `@chartroom/core`

### `@chartroom/eval` (apps/eval)

Eval runner for automated chart quality assessment:
- Loads eval cases from `cases/` (JSON) and data from `data/` (CSV)
- Runs agentic loop with `generateText` + `createTools` from core
- Renders charts via `renderChart` from `@chartroom/core`, judges via vision model
- 5 scoring criteria (correctness, chartType, readability, aesthetics, completeness) × 5 points = max 25
- Generates HTML + JSON reports in `results/{timestamp}/`
- Parallel execution via worker pool (configurable concurrency)
- CLI flags: `--tier`, `--tag`, `--case`, `--model`, `--concurrency`, `--no-judge`

### Key files

| File | Purpose |
|------|---------|
| `packages/core/src/index.ts` | Core barrel exports |
| `packages/core/src/types.ts` | Shared TypeScript types |
| `packages/core/src/csv-parser.ts` | CSV/Excel parsing + metadata extraction |
| `packages/core/src/validate-spec.ts` | Vega-Lite spec validation + transform linting |
| `packages/core/src/inject-data.ts` | Data injection (replaces URL sentinels) |
| `packages/core/src/themes.ts` | Theme config (11 themes via vega-themes) |
| `packages/core/src/spec-schema.ts` | Zod schemas for Vega-Lite specs |
| `packages/core/src/system-prompt.ts` | Parameterized system prompt (web/plugin) |
| `packages/core/src/docs.ts` | Vega-Lite reference docs (28 topics) |
| `packages/core/src/tools.ts` | AI tool definitions (render_chart + lookup_docs) |
| `packages/core/src/prune-context.ts` | Context pruning for multi-turn |
| `packages/core/src/renderer.ts` | Headless Vega-Lite → PNG renderer (vega + resvg-js) |
| `apps/web/src/app/page.tsx` | Main page (two-panel layout) |
| `apps/web/src/app/api/chat/route.ts` | Streaming API endpoint |
| `apps/web/src/lib/agent/models.ts` | Model tier config + resolution |
| `apps/web/src/lib/chart/render-vega.ts` | Browser-side Vega-Lite rendering |
| `apps/web/src/lib/chart/export-chart.ts` | PNG/SVG chart export |
| `apps/web/src/lib/chart/computed-fields.ts` | Extract fields from Vega transforms |
| `apps/web/src/lib/db/schema.ts` | Drizzle ORM schema (profiles, usageLogs, payments) |
| `apps/web/src/lib/db/queries.ts` | Database query helpers |
| `apps/web/src/lib/supabase/middleware.ts` | Auth session refresh middleware |
| `apps/web/src/components/chat/chat-panel.tsx` | Chat UI with useChat |
| `apps/web/src/components/chart/chart-panel.tsx` | Chart display + editor |
| `apps/web/src/components/chart/visual-spec-editor.tsx` | Visual spec editor (accordion UI) |
| `apps/web/src/components/chart/encoding-editor.tsx` | Encoding channel editor |
| `apps/web/src/components/chart/transform-editor.tsx` | Transform editor |
| `apps/web/src/components/chart/mark-editor.tsx` | Mark type selector |
| `apps/web/src/components/chart/layer-editor-card.tsx` | Layer composition editor |
| `apps/web/src/components/auth/auth-provider.tsx` | Auth context + useAuth hook |
| `apps/web/src/components/data/data-table.tsx` | Read-only data preview |
| `packages/mcp/src/server.ts` | MCP server entry point |
| `packages/mcp/src/tools/` | MCP tool implementations (4 files) |
| `apps/plugin/skills/chart/SKILL.md` | /chart skill definition |
| `apps/plugin/skills/chart/docs/` | Vega-Lite reference docs (28 markdown files) |
| `apps/eval/src/index.ts` | Eval runner entry point |
| `apps/eval/src/run-case.ts` | Single eval case execution |
| `apps/eval/src/judge.ts` | Vision model scoring (5 criteria) |
| `apps/eval/src/report.ts` | HTML + JSON report generation |

### Testing

- **Core**: `packages/core` — Vitest, Node environment
- **Web**: `apps/web` — Vitest, jsdom environment

Run all with `bun run test`. Run per-package with `cd <package> && bun run test`.

### Environment

Web app requires `OPENROUTER_API_KEY` in `apps/web/.env.local`. See `apps/web/.env.example` for all variables.

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API access |
| `NEXT_PUBLIC_AUTH_ENABLED` | No | Enable Supabase auth + Stripe billing (default: false) |
| `NEXT_PUBLIC_MODEL_FAST/MID/POWER` | No | Override default model IDs |
| `NEXT_PUBLIC_SUPABASE_URL` | If auth | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | If auth | Supabase anon key |
| `DATABASE_URL` | If auth | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | If auth | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | If auth | Stripe webhook signing secret |
| `FREE_CREDITS_USD` | No | Free credits on sign-up (default: 1.00) |
| `MARKUP_MULTIPLIER` | No | Cost markup multiplier (default: 1.3) |

Eval app reads `MODEL_FAST`, `MODEL_MID`, `MODEL_POWER` from `apps/eval/.env`.
