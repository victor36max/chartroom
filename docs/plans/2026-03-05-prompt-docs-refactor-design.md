# System Prompt / Plot Docs Refactor

**Date:** 2026-03-05
**Goal:** Reduce system prompt token cost and improve doc organization by offloading multi-turn editing patterns from the system prompt to plot docs.

## Problem

The system prompt (~163 lines) does double duty as both behavioral guide and reference manual. The multi-turn editing section (~45 lines) significantly overlaps with existing plot docs topics (rule, bar, text, composite-patterns, layout-patterns).

## Design

### What stays in the system prompt

All behavioral rules and guardrails remain unchanged:

- Identity & communication style
- Workflow (7-step process)
- Decline list (unsupported chart types)
- Non-summable stacking rule
- Documentation lookup instructions
- **Chart spec format example** (kept for per-turn context)
- **Pre-render checklist** (all 15 items — critical gatekeeper)
- Default styling
- Ambiguous requests

### What moves to plot docs

The **multi-turn editing section** (lines 119-163) moves entirely. Replace with 2-3 lines in the system prompt:

```
## Multi-turn editing — CRITICAL
When the user asks you to MODIFY an existing chart:
1. Start from your PREVIOUS chart spec — do NOT create a new spec from scratch
2. Keep ALL existing marks, options, and styling intact
3. Call `lookup_docs` with topic `editing-charts` for patterns (flipping, sorting, labels, etc.)
```

### New doc topic: `editing-charts`

Added to `TOPIC_IDS` and `DOC_CHUNKS`. Contains:

1. **Core rules**: Start from previous spec, keep all marks
2. **Flipping orientation**: The swap table (barY↔barX, groupX↔groupY, etc.)
3. **Adding reference lines**: ruleY/ruleX with `data: null` (cross-ref to `rule`)
4. **Sorting**: sort key rules (cross-ref to `bar`)
5. **Filtering to top/bottom N**: analyze_data workflow (cross-ref to `filter`)
6. **Adding text labels**: text mark with same groupX (cross-ref to `composite-patterns`)
7. **Simplifying**: Reduce dimensions guidance
8. **Changing colors**: Update fill/stroke guidance

### Changes to existing files

1. **`src/lib/docs/plot-docs.ts`**: Add `"editing-charts"` to `TOPIC_IDS` array and `DOC_CHUNKS` record
2. **`src/lib/agent/system-prompt.ts`**: Remove lines 119-163, replace with 3-line summary pointing to `editing-charts` topic
3. **`src/lib/agent/tools.ts`**: Add `editing-charts` to `lookup_docs` description string

### Net effect

- ~40 lines removed from system prompt (~25% reduction)
- Multi-turn editing guidance now lives in docs alongside relevant mark/transform details
- Some intentional duplication with `layout-patterns` (flipping table) — different access paths for different contexts
- No changes to existing 24 doc topics
