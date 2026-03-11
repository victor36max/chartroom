# @chartroom/eval

Automated chart quality evaluation for Chartroom. Runs agentic chart generation and scores results via a vision model.

## How it works

1. Loads test cases (JSON) from `cases/` and data files (CSV) from `data/`
2. Runs agentic generation loop with `generateText` + tools from `@chartroom/core`
3. Renders charts via `renderChart` from `@chartroom/core`
4. Judges via vision model on 5 criteria (correctness, chart type, readability, aesthetics, completeness) — max 25 points
5. Generates HTML + JSON reports with embedded screenshots

Results are saved in `results/{timestamp}/`.

## Usage

```bash
bun run eval                    # Run all cases
bun run eval -- --tier power    # Use power model tier
bun run eval -- --tag scatter   # Filter by tag
bun run eval -- --case mycase   # Run specific case
bun run eval -- --model <id>    # Override model
bun run eval -- --concurrency 3 # Limit parallelism
bun run eval -- --no-judge      # Skip judging step
```

## Environment variables

Create `apps/eval/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `MODEL_FAST` | No | Fast tier model ID |
| `MODEL_MID` | No | Standard tier model ID |
| `MODEL_POWER` | No | Power tier model ID |

## Key files

| File | Purpose |
|------|---------|
| `src/index.ts` | Eval runner entry point |
| `src/run-case.ts` | Single eval case execution |
| `src/judge.ts` | Vision model scoring (5 criteria) |
| `src/report.ts` | HTML + JSON report generation |
