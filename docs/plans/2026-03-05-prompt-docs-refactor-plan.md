# Prompt/Docs Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move multi-turn editing patterns from system prompt to a new `editing-charts` doc topic, reducing prompt size ~25% while improving doc organization.

**Architecture:** The system prompt keeps all behavioral guardrails. The multi-turn editing section (flipping, sorting, labels, reference lines, etc.) moves to a new `editing-charts` topic in `plot-docs.ts`. The system prompt retains a 3-line stub pointing to the new topic.

**Tech Stack:** TypeScript, Observable Plot docs system

---

### Task 1: Add `editing-charts` topic to plot-docs.ts

**Files:**
- Modify: `src/lib/docs/plot-docs.ts:1-26` (TOPIC_IDS array)
- Modify: `src/lib/docs/plot-docs.ts:995-996` (add new DOC_CHUNKS entry before closing `};`)

**Step 1: Add `"editing-charts"` to the TOPIC_IDS array**

In `src/lib/docs/plot-docs.ts`, add `"editing-charts"` after `"composite-patterns"` (line 25):

```typescript
  "composite-patterns",
  "editing-charts",
] as const;
```

**Step 2: Add the `editing-charts` DOC_CHUNKS entry**

Insert before the closing `};` on line 996 of `src/lib/docs/plot-docs.ts` (after the `composite-patterns` entry):

```typescript
  "editing-charts": {
    title: "Editing Charts (multi-turn modifications)",
    content: `Patterns for modifying an existing chart when the user asks for changes.

**Core rules:**
1. Start from your PREVIOUS chart spec — do NOT create a new spec from scratch
2. Keep ALL existing marks, options, and styling intact — do not remove or simplify anything unless asked
3. Look up docs for any mark types or transforms you're adding or changing

## Flipping orientation (vertical ↔ horizontal)
Swap ALL of these AT ONCE — a partial swap breaks the chart:
- Mark type: barY → barX (or vice versa)
- Group transform: groupX → groupY (and vice versa)
- Group outputs key: \`{ outputs: { y: "sum" } }\` → \`{ outputs: { x: "sum" } }\`
- Stack transform: stackY → stackX (and vice versa)
- Position channels: x ↔ y in mark options
- Facet channels: fx ↔ fy
- Sort: \`{ "y": "-x" }\` → \`{ "x": "-y" }\` (and vice versa)
Example: barY with \`x: "cat", y: "val", groupX: { outputs: { y: "sum" } }\` becomes barX with \`y: "cat", x: "val", groupY: { outputs: { x: "sum" } }\`.

## Adding reference lines
Use ruleY (horizontal) or ruleX (vertical) with \`data: null\`:
\`{ "type": "ruleY", "data": null, "options": { "values": [75], "stroke": "red", "strokeDasharray": "4 2", "strokeWidth": 2 } }\`
- ALWAYS set \`stroke\` to a visible color (e.g. \`"red"\`, \`"#e15759"\`) — without it the line is invisible against bars
- ALWAYS set \`strokeDasharray\` so it's visually distinct from data marks
- For "line at the average/mean": call \`analyze_data\` first to get the numeric value, then use it in \`"values": [computed_value]\`
See also: \`rule\` topic for full ruleX/ruleY options.

## Sorting
- barY descending: \`"sort": { "x": "-y" }\` (sort the categorical x-axis by descending y values)
- barX descending: \`"sort": { "y": "-x" }\` (sort the categorical y-axis by descending x values)
- The sort key is ALWAYS the CATEGORICAL axis letter. For barY categories are on x → key is \`"x"\`. For barX categories are on y → key is \`"y"\`.
- When flipping orientation, swap the sort key and value too (see above).

## Filtering to top/bottom N
There is NO built-in "top N" — you must call \`analyze_data\` first to find the values, then add a \`"filter"\` to your mark options with the discovered values. Do NOT just analyze — you MUST re-render with the filter applied.
See also: \`filter\` topic for full filter syntax and examples.

## Adding text labels on bars
Add a \`text\` mark with the SAME position channels and aggregation as the bar mark.
barY example (revenue by product):
\`{ "type": "text", "data": "csv", "options": { "x": "product", "y": "revenue", "text": "revenue", "groupX": { "outputs": { "y": "sum", "text": "sum" } }, "dy": -8, "fontSize": 11, "fill": "black" } }\`
CRITICAL: the \`"text"\` option in mark options must be the DATA COLUMN NAME (e.g. \`"revenue"\`), NOT the reducer name. The reducer goes only inside \`outputs\`: \`"text": "sum"\`.
Add \`"dy": -8\` (barY) or \`"dx": 4\` (barX) to offset labels from the bar edge.
See also: \`composite-patterns\` topic for more label examples.

## Simplifying a chart
Reduce the number of encoded dimensions (drop color, remove faceting, focus on one metric). Do NOT strip the chart to a bare minimum — keep the core structure and data readable.

## Changing colors
Update \`fill\` and/or \`stroke\` on existing marks. When adding \`fill: "columnName"\` for color-by-group, also add top-level \`"color": { "legend": true }\`.`,
  },
```

**Step 3: Run lint and type-check**

Run: `bun run lint && bun run build`
Expected: No errors. The new topic ID is picked up by the `TopicId` type automatically via the `as const` assertion.

**Step 4: Commit**

```bash
git add src/lib/docs/plot-docs.ts
git commit -m "docs: add editing-charts topic to plot docs"
```

---

### Task 2: Trim system prompt multi-turn section

**Files:**
- Modify: `src/lib/agent/system-prompt.ts:119-163`

**Step 1: Replace lines 119-163 with a 4-line stub**

Replace the entire multi-turn editing section (lines 119-163) with:

```
## Multi-turn editing — CRITICAL
When the user asks you to MODIFY an existing chart:
1. Start from your PREVIOUS chart spec — do NOT create a new spec from scratch
2. Keep ALL existing marks, options, and styling intact — do not remove or simplify anything unless asked
3. Call \`lookup_docs\` with topic \`editing-charts\` for patterns (flipping, sorting, labels, reference lines, etc.)
```

The full replacement: in `system-prompt.ts`, replace from `## Multi-turn editing — CRITICAL` (line 119) through the closing backtick before `dataContext` (line 163, ending with the template literal backtick and comma on line 163). The new content ends with the 3-item list above, followed by the existing backtick+comma and `dataContext` ternary (lines 164-168) which remain unchanged.

**Step 2: Run lint, build, and tests**

Run: `bun run lint && bun run build && bun run test`
Expected: All pass. No functional changes — just moved text content.

**Step 3: Commit**

```bash
git add src/lib/agent/system-prompt.ts
git commit -m "refactor: move multi-turn editing patterns from system prompt to plot docs"
```

---

### Task 3: Update lookup_docs tool description

**Files:**
- Modify: `src/lib/agent/tools.ts:70`

**Step 1: Add `editing-charts` to the description string**

On line 70 of `src/lib/agent/tools.ts`, after `"composite-patterns (lollipop, value labels, Pareto, strip plot, rotated labels)"`, add:
```
", " +
"editing-charts (multi-turn chart modifications: flipping, sorting, labels, reference lines)"
```

The full description ending becomes:
```typescript
        "composite-patterns (lollipop, value labels, Pareto, strip plot, rotated labels), " +
        "editing-charts (multi-turn modifications: flipping, sorting, labels, reference lines)",
```

**Step 2: Run lint and build**

Run: `bun run lint && bun run build`
Expected: All pass.

**Step 3: Commit**

```bash
git add src/lib/agent/tools.ts
git commit -m "docs: add editing-charts to lookup_docs tool description"
```

---

### Task 4: Verify with existing tests and eval

**Files:**
- Read: `src/lib/docs/__tests__/` (if exists)
- Run: existing test suite

**Step 1: Run the full test suite**

Run: `bun run test`
Expected: All existing tests pass. The `lookupDocs` function works the same way — it just has one more topic available.

**Step 2: Manually verify the new topic renders**

Run: `bun -e "const { lookupDocs } = require('./src/lib/docs/plot-docs'); console.log(lookupDocs(['editing-charts']).substring(0, 200))"`

If that doesn't work with require (ESM), use:
Run: `bun --eval "import { lookupDocs } from './src/lib/docs/plot-docs'; console.log(lookupDocs(['editing-charts']).substring(0, 200))"`

Expected: Should print the first 200 chars of the editing-charts topic starting with `### Editing Charts`.

**Step 3: Run eval suite (if quick)**

Run: `bun run eval`
Expected: No regression in eval scores. Multi-turn cases should still pass since the editing guidance is now in docs.
