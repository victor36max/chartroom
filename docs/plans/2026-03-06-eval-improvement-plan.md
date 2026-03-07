# Eval Improvement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Raise all eval cases above 20/25 by fixing stale rubrics, improving docs/prompt, adding spec validation to the eval pipeline, and adding targeted new eval cases.

**Architecture:** Five independent workstreams: (1) fix eval case JSON files, (2) expand vl-docs.ts documentation, (3) add 3 items to system prompt pre-render checklist, (4) add `validateSpec` call in eval runner before rendering, (5) create 4 new eval case JSON files. Workstreams 1-3 can run in parallel. Workstream 4 depends on understanding the existing `validate-spec.ts`. Workstream 5 depends on workstreams 1-2 being done.

**Tech Stack:** TypeScript, Vega-Lite v6, Vitest

---

### Task 1: Fix eval case — color-scheme (Observable Plot scheme name)

**Files:**
- Modify: `evals/cases/color-scheme.json`

**Step 1: Update the message and rubric**

Replace the D3 shorthand `YlOrRd` with valid Vega-Lite name `yelloworangered`:

```json
{
  "name": "color-scheme",
  "description": "Heatmap with specific color scheme",
  "csv": "activity.csv",
  "messages": ["Heatmap of activity by day and hour using the yelloworangered color scheme"],
  "tags": ["cell", "single-turn", "color"],
  "rubric": "Must use rect mark. color.scheme should be 'yelloworangered' or similar warm sequential scheme. x=hour, y=day, color=count."
}
```

Changes: `YlOrRd` → `yelloworangered` in message. `cell mark` → `rect mark` and `fill=count` → `color=count` in rubric.

**Step 2: Commit**

```bash
git add evals/cases/color-scheme.json
git commit -m "fix(eval): update color-scheme case to use valid Vega-Lite scheme name"
```

---

### Task 2: Fix eval case — colloquial-pareto (unreasonable rubric)

**Files:**
- Modify: `evals/cases/colloquial-pareto.json`

**Step 1: Adjust rubric to not require cumulative line**

```json
{
  "name": "colloquial-pareto",
  "description": "Edge case: Pareto chart — partially unsupported (no cumulative %)",
  "csv": "orders.csv",
  "messages": ["Create a Pareto chart of revenue by subcategory"],
  "tags": ["edge-case", "colloquial", "composition", "aggregation", "single-turn"],
  "rubric": "A Pareto chart is bars sorted descending + a cumulative percentage line. The system cannot compute running cumulative percentages via window transforms. Model should render a sorted descending bar chart of revenue by subcategory. Bars MUST be sorted by revenue descending. An honest explanation that the cumulative line is not possible earns full marks. FAIL if bars are unsorted or ascending."
}
```

**Step 2: Commit**

```bash
git add evals/cases/colloquial-pareto.json
git commit -m "fix(eval): adjust pareto rubric — sorted bars is full marks without cumulative line"
```

---

### Task 3: Fix eval case — grouped-bar-fx (stale Observable Plot term)

**Files:**
- Modify: `evals/cases/grouped-bar-fx.json`

**Step 1: Update rubric and description**

```json
{
  "name": "grouped-bar-fx",
  "description": "Grouped bar chart using xOffset encoding",
  "csv": "sales.csv",
  "messages": ["Create a grouped bar chart with products side by side for each region"],
  "tags": ["bar", "single-turn", "grouped"],
  "rubric": "Must use bar with xOffset (or column) for side-by-side grouping. color by product (or region). Must NOT use stack. Color legend required."
}
```

Changes: `fx` → `xOffset (or column)` in rubric and description. Removed `facet` tag.

**Step 2: Commit**

```bash
git add evals/cases/grouped-bar-fx.json
git commit -m "fix(eval): update grouped-bar rubric from fx to xOffset"
```

---

### Task 4: Fix eval cases — bubble charts (r → size)

**Files:**
- Modify: `evals/cases/bubble-chart.json`
- Modify: `evals/cases/census-bubble.json`
- Modify: `evals/cases/multi-channel-five-dims.json`

**Step 1: Update bubble-chart.json rubric**

Change `r=population_millions` → `size=population_millions`:
```json
"rubric": "Must use point mark with size=population_millions, fill=continent. Color legend required. x=gdp_billions, y=life_expectancy."
```

**Step 2: Update census-bubble.json rubric**

Change `r=population` → `size=population`:
```json
"rubric": "Must use point mark with x=median_income (or poverty_rate), y=poverty_rate (or median_income), size=population, fill=state. 300 data points with 8 states in legend. Color legend required."
```

**Step 3: Update multi-channel-five-dims.json rubric**

Change `r=population_millions (size)` → `size=population_millions`:
```json
"rubric": "Must map 5 dimensions: x=gdp_billions, y=life_expectancy, size=population_millions, fill=continent (color), plus a text mark for country labels. The point mark handles x/y/size/fill, and a separate text mark adds labels. FAIL if any of the 5 requested dimensions is missing. FAIL if text labels are not present."
```

**Step 4: Commit**

```bash
git add evals/cases/bubble-chart.json evals/cases/census-bubble.json evals/cases/multi-channel-five-dims.json
git commit -m "fix(eval): update bubble chart rubrics from r= to size= for Vega-Lite"
```

---

### Task 5: Expand color scheme list in docs

**Files:**
- Modify: `src/lib/docs/vl-docs.ts:631-656` (the `color-scale` topic)

**Step 1: Update the scheme lists**

In the `"color-scale"` topic, replace the scheme list sections (lines 644, 650, 656) with expanded versions:

Line 644 — categorical schemes, replace with:
```
Schemes: category10, category20, tableau10, tableau20, set1, set2, set3, paired, pastel1, pastel2, dark2, accent
```

Line 650 — sequential schemes, replace with:
```
Schemes: blues, greens, reds, oranges, purples, greys, viridis, inferno, magma, plasma, cividis, turbo, yelloworangered, yelloworangebrown, yellowgreen, yellowgreenblue, bluegreen, bluepurple, orangered, purpleblue, purplered, redpurple, greenblue
```

Line 656 — diverging schemes, replace with:
```
Schemes: redblue, blueorange, redgrey, redyellowgreen, redyellowblue, spectral, purplegreen, pinkyellowgreen, brownbluegreen, purpleorange
```

**Step 2: Add warning about D3 shorthand names**

After the diverging section (after line 656), add:

```
**WARNING:** D3 shorthand names (YlOrRd, RdBu, PuBu, etc.) are NOT valid in Vega-Lite. Use full names: yelloworangered, redblue, purpleblue, etc.
```

**Step 3: Run tests**

```bash
bun run test
```

Expected: All tests pass (docs changes don't affect test logic).

**Step 4: Commit**

```bash
git add src/lib/docs/vl-docs.ts
git commit -m "feat(docs): expand color scheme list with multi-hue, pastel, and diverging schemes"
```

---

### Task 6: Add reference line pattern to layer docs

**Files:**
- Modify: `src/lib/docs/vl-docs.ts:543-577` (the `layer` topic)

**Step 1: Add reference line with strokeDash pattern**

After the "Common patterns" list (line 570), before "Gotchas" (line 572), add:

```
**Reference line with dashed style:**
\`\`\`json
{ "layer": [
  { "mark": "bar", "encoding": { "x": { "field": "cat", "type": "nominal" }, "y": { "aggregate": "mean", "field": "score", "type": "quantitative" } } },
  { "mark": { "type": "rule", "strokeDash": [4, 4] }, "encoding": { "y": { "datum": 75 }, "color": { "value": "red" } } }
] }
\`\`\`
Key: use \`datum\` (not \`field\`) for constant-value reference lines. Use \`strokeDash: [4, 4]\` for dashed style.
```

**Step 2: Commit**

```bash
git add src/lib/docs/vl-docs.ts
git commit -m "feat(docs): add dashed reference line pattern with datum to layer topic"
```

---

### Task 7: Add ordinal month/weekday sort pattern to docs

**Files:**
- Modify: `src/lib/docs/vl-docs.ts:669-` (the `position-scales` topic)

**Step 1: Find the position-scales topic and add sort pattern**

Read the full position-scales topic, then add at the end (before `Gotchas` or at the end of the content):

```
**Month/weekday ordering:**
Ordinal months and weekdays sort alphabetically by default. Always provide explicit sort:
\`\`\`json
"x": { "field": "month", "type": "ordinal", "sort": ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] }
\`\`\`
For weekdays:
\`\`\`json
"y": { "field": "day", "type": "ordinal", "sort": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] }
\`\`\`
```

**Step 2: Commit**

```bash
git add src/lib/docs/vl-docs.ts
git commit -m "feat(docs): add month/weekday ordinal sort patterns to position-scales"
```

---

### Task 8: Enhance tick mark docs with strip plot color pattern

**Files:**
- Modify: `src/lib/docs/vl-docs.ts:246-261` (the `tick` topic)

**Step 1: Add colored strip plot example**

After the existing strip plot example (line 253), add:

```
**Colored strip plot (distribution by group):**
\`\`\`json
{ "mark": { "type": "tick", "thickness": 2 }, "encoding": { "x": { "field": "score", "type": "quantitative" }, "y": { "field": "subject", "type": "nominal" }, "color": { "field": "subject", "type": "nominal" } } }
\`\`\`

**Gotchas:**
- Use \`tick\` not \`point\` for strip/rug plots — ticks show distribution density better
- Tick orientation follows the quantitative axis automatically
```

Replace the existing "Mark properties" and "Use cases" sections (lines 255-260) to consolidate.

**Step 2: Commit**

```bash
git add src/lib/docs/vl-docs.ts
git commit -m "feat(docs): enhance tick mark docs with colored strip plot pattern"
```

---

### Task 9: Add text label placement pattern to docs

**Files:**
- Modify: `src/lib/docs/vl-docs.ts:219-243` (the `text` topic)

**Step 1: Add horizontal bar label pattern**

After the existing vertical bar label example (line 229), add:

```
**Labels on horizontal bars:**
\`\`\`json
{ "layer": [
  { "mark": "bar", "encoding": { "x": { "aggregate": "sum", "field": "revenue", "type": "quantitative" }, "y": { "field": "product", "type": "nominal" } } },
  { "mark": { "type": "text", "dx": 5, "align": "left" }, "encoding": { "x": { "aggregate": "sum", "field": "revenue", "type": "quantitative" }, "y": { "field": "product", "type": "nominal" }, "text": { "aggregate": "sum", "field": "revenue", "type": "quantitative" } } }
] }
\`\`\`
For horizontal bars use \`dx\` (not \`dy\`) and \`align: "left"\` to place labels after bar ends.
```

**Step 2: Commit**

```bash
git add src/lib/docs/vl-docs.ts
git commit -m "feat(docs): add horizontal bar label pattern to text mark docs"
```

---

### Task 10: Update system prompt pre-render checklist

**Files:**
- Modify: `src/lib/agent/system-prompt.ts:96-114`

**Step 1: Add 3 new checklist items**

After item 12 (line 114, the tooltip item), add three new items:

```
13. **Reference lines** — if the user asks for a reference, average, or threshold line, use \`layer\` with a \`rule\` mark and \`datum\` encoding (not \`field\`)
14. **Color schemes** — only use scheme names from the docs (e.g. \`yelloworangered\`, not \`YlOrRd\`). Call \`lookup_docs\` with topic \`color-scale\` if unsure
15. **Month/weekday ordering** — if x-axis contains months or weekdays as ordinal, add explicit \`sort\` array for chronological order (e.g. \`["Jan","Feb",...,"Dec"]\`)
```

**Step 2: Run lint and build**

```bash
bun run lint && bun run build
```

Expected: Pass with no errors.

**Step 3: Commit**

```bash
git add src/lib/agent/system-prompt.ts
git commit -m "feat(prompt): add reference line, color scheme, and ordinal sort to pre-render checklist"
```

---

### Task 11: Add spec validation to eval runner

**Files:**
- Modify: `evals/runner/run-case.ts:67-79` (inside `render_chart.execute`)

**Step 1: Add validateSpec import and call**

At the top of `run-case.ts`, add import:

```typescript
import { validateSpec } from "../../src/lib/chart/validate-spec";
```

Then in the `render_chart.execute` function (line 67), add validation before the `renderChart` call (line 73):

```typescript
execute: async (input: { spec: ChartSpec; title?: string; description?: string }) => {
  const chartSpec: ChartSpec = input.title
    ? { ...input.spec, title: input.title } as ChartSpec
    : input.spec;
  capturedSpec = chartSpec;

  // Validate spec before rendering (matches production behavior)
  const validation = validateSpec(chartSpec as unknown as Record<string, unknown>, csvData);
  if (!validation.valid) {
    return { success: false as const, error: `Vega-Lite compile error: ${validation.error}. Fix the spec and try again.` };
  }

  const result = await renderChart(page, chartSpec, csvData);
  if (!result.png) {
    return { success: false as const, error: result.error ?? "Render returned no image" };
  }

  screenshotBuffer = result.png;
  return { success: true as const, image: result.png.toString("base64") };
},
```

**Step 2: Run the build to verify imports resolve**

```bash
bun run build
```

Expected: Pass. The `validate-spec.ts` import should resolve since it's already in the project.

Note: `vega-lite` is already a dependency (used in `validate-spec.ts`). No new packages needed.

**Step 3: Commit**

```bash
git add evals/runner/run-case.ts
git commit -m "feat(eval): add spec validation before rendering to surface compile errors"
```

---

### Task 12: Add new eval case — heatmap-custom-scheme

**Files:**
- Create: `evals/cases/heatmap-custom-scheme.json`

**Step 1: Create the case file**

```json
{
  "name": "heatmap-custom-scheme",
  "description": "Heatmap with multi-hue sequential color scheme",
  "csv": "activity.csv",
  "messages": ["Create a heatmap of activity by day and hour, use a warm color scheme like yelloworangered"],
  "tags": ["rect", "single-turn", "color"],
  "rubric": "Must use rect mark. x=hour, y=day, color=count with a valid Vega-Lite sequential scheme (yelloworangered, orangered, or similar warm scheme). FAIL if scheme name is a D3 shorthand like YlOrRd."
}
```

**Step 2: Commit**

```bash
git add evals/cases/heatmap-custom-scheme.json
git commit -m "feat(eval): add heatmap-custom-scheme case for valid VL scheme names"
```

---

### Task 13: Add new eval case — layer-reference-line

**Files:**
- Create: `evals/cases/layer-reference-line.json`

**Step 1: Create the case file**

```json
{
  "name": "layer-reference-line",
  "description": "Bar chart with horizontal reference line at specific value",
  "csv": "students.csv",
  "messages": ["Bar chart of average score by subject with a red dashed reference line at 75"],
  "tags": ["bar", "rule", "layer", "single-turn"],
  "rubric": "Must use layer with bar mark + rule mark. Rule must be at y datum=75 (not field). Rule should be red and preferably dashed (strokeDash). Bar should show aggregate mean of score by subject."
}
```

**Step 2: Commit**

```bash
git add evals/cases/layer-reference-line.json
git commit -m "feat(eval): add layer-reference-line case for bar+rule composition"
```

---

### Task 14: Add new eval case — ordinal-month-sort

**Files:**
- Create: `evals/cases/ordinal-month-sort.json`

**Step 1: Create the case file**

```json
{
  "name": "ordinal-month-sort",
  "description": "Line chart with months sorted chronologically",
  "csv": "weather.csv",
  "messages": ["Line chart of average temperature by month for each city"],
  "tags": ["line", "single-turn", "ordinal"],
  "rubric": "Must use line mark with x=month (ordinal), y=avg_temp (aggregate mean), color=city. Months MUST be in chronological order (Jan-Dec), NOT alphabetical. FAIL if months appear as Apr, Aug, Dec, Feb... Explicit sort array required."
}
```

**Step 2: Commit**

```bash
git add evals/cases/ordinal-month-sort.json
git commit -m "feat(eval): add ordinal-month-sort case for chronological month ordering"
```

---

### Task 15: Add new eval case — strip-plot-ticks

**Files:**
- Create: `evals/cases/strip-plot-ticks.json`

**Step 1: Create the case file**

```json
{
  "name": "strip-plot-ticks",
  "description": "Strip plot using tick marks for distribution",
  "csv": "students.csv",
  "messages": ["Create a strip plot showing the distribution of scores by subject using tick marks"],
  "tags": ["tick", "single-turn"],
  "rubric": "Must use tick mark (NOT point). x=score (quantitative), y=subject (nominal). Should show individual data points as ticks. Color by subject is optional but welcome."
}
```

**Step 2: Commit**

```bash
git add evals/cases/strip-plot-ticks.json
git commit -m "feat(eval): add strip-plot-ticks case for tick mark distribution"
```

---

### Task 16: Run full verification

**Step 1: Run lint**

```bash
bun run lint
```

Expected: Pass.

**Step 2: Run build**

```bash
bun run build
```

Expected: Pass.

**Step 3: Run tests**

```bash
bun run test
```

Expected: All existing tests pass. No new tests needed — the changes are to docs, prompts, eval cases, and the eval runner (which is tested via `bun run eval`).

**Step 4: Commit any fixes if lint/build/test surfaced issues**

---

### Task 17: Run eval on a subset to validate improvements

**Step 1: Run eval on the previously failing cases**

```bash
bun run eval --case color-scheme --case multi-turn-restyle --case colloquial-pareto --case bar-with-reference-line --case line-chart-trend --case strip-plot --no-judge
```

This validates that the spec validation catches errors and the model can self-correct with better docs/prompt guidance. Use `--no-judge` for a quick smoke test first.

**Step 2: If cases render successfully, run with judge**

```bash
bun run eval --case color-scheme --case colloquial-pareto --case bar-with-reference-line --case line-chart-trend
```

Check that scores improve above 20.

**Step 3: Run full eval suite**

```bash
bun run eval
```

Verify: no regressions, avg score improved, all cases above 20.
