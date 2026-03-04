# Plot Documentation Lookup Tool

## Problem
The AI agent has limited hardcoded Observable Plot knowledge (~2100 tokens). It guesses on unfamiliar mark options, scale configs, and advanced features — often incorrectly.

## Solution
Add an on-demand `lookup_docs` server-side tool. The AI picks from 19 topic slugs (enum-based, no fuzzy search). Each topic maps to a 200-400 token doc chunk adapted from Observable Plot's official docs.

## Design Decisions
- **Enum over free-text**: LLMs reliably map intent to structured enum values. No search algorithm to tune.
- **Local bundled docs**: No external API calls. Content adapted from Observable Plot GitHub docs.
- **Arc mark stays hardcoded**: Custom implementation, not in official Plot docs.
- **Aggregation examples stay hardcoded**: High error-rate area, always needed.

## Files
- `src/lib/docs/plot-docs.ts` — topic registry + lookup function
- `src/lib/agent/tools.ts` — `lookup_docs` tool definition
- `src/lib/agent/system-prompt.ts` — trimmed prompt + lookup guidance
