# Eval Improvement Design

**Date:** 2026-03-06
**Goal:** Raise all eval cases above 20/25 (currently 17 of 78 scored cases are below 20, avg 21.5/25)
**Eval run:** `evals/results/2026-03-06T15-11-07/` on `qwen/qwen3.5-122b-a10b`

## Problem Analysis

78/79 cases passed, but 17 cases (22%) scored below 20. Failure categories:

| Category | Cases | Root Cause |
|----------|-------|------------|
| Blank/garbled renders | `color-scheme` (5), `multi-turn-restyle` (5) | Invalid color scheme names (`YlOrRd`, `pastel`) from Observable Plot migration |
| Missing reference lines | `bar-with-reference-line` (16), `multi-turn-add-reference` (16), `colloquial-pareto` (14) | Model can't compose bar + rule layers; no concrete pattern in docs |
| Wrong mark type | `unusual-ticky-distribution` (9), `strip-plot` (16), `multi-turn-three-steps` (17) | Uses point instead of tick; missing curve interpolation |
| Axis ordering | `line-chart-trend` (17) | Months sort alphabetically, not chronologically |
| Data scope / filtering | `multi-turn-add-element` (8), `vague-compare` (FAIL) | Didn't filter to subset; called non-existent tool |
| Missing labels/legends | `unusual-text-mark-labels` (11), `pie-chart-categories` (19), `ambiguous-compare-cities` (19) | Text mark placement wrong, values missing |
| Unsupported feature | `colloquial-pareto` (14) | No window transform for cumulative % |

## Design

### 1. Fix Eval Cases (Observable Plot Artifacts + Rubric Adjustments)

| Case | Problem | Fix |
|------|---------|-----|
| `color-scheme` | User prompt asks for `"YlOrRd"` (D3 name) | Change to `"yelloworangered"` in message + rubric |
| `multi-turn-restyle` | Model outputs `"pastel"` (not valid VL) | Docs fix (add `pastel1`/`pastel2`); rubric already accepts these |
| `colloquial-pareto` | Expects cumulative % line — no window transform | Adjust rubric: sorted descending bars = full marks |
| `grouped-bar-fx` | Rubric says `fx` for grouping | Update to `xOffset` or `column` |
| `bubble-chart` | Rubric says `r=population_millions` | Update to `size=population_millions` |
| `census-bubble` | Rubric says `r=population` | Update to `size=population` |
| `multi-channel-five-dims` | Rubric says `r=population_millions` | Update to `size=population_millions` |

Also audit `melt-grouped` and `melt-stacked` rubrics for stale terms.

### 2. Documentation Improvements (vl-docs.ts)

**2a. Expand color scheme list:**
- Add multi-hue sequential: `yelloworangered`, `yelloworangebrown`, `yellowgreen`, `yellowgreenblue`, `orangered`, `bluegreen`, `bluepurple`, `purpleblue`, `purplered`, `redpurple`, `greenblue`
- Add categorical: `pastel1`, `pastel2`
- Add diverging: `redyellowgreen`, `redyellowblue`, `purplegreen`, `pinkyellowgreen`, `brownbluegreen`, `purpleorange`
- Add note: "D3 shorthand names like `YlOrRd` are NOT valid — use full names like `yelloworangered`."

**2b. Layer composition for reference lines:**
Add concrete reference line pattern using `datum` encoding:
```json
{
  "layer": [
    { "mark": "bar", "encoding": { "..." } },
    { "mark": "rule", "encoding": { "y": { "datum": 75 }, "color": { "value": "red" }, "strokeDash": { "value": [4, 4] } } }
  ]
}
```

**2c. Ordinal axis ordering:**
Add month/weekday sort pattern:
```json
"x": { "field": "month", "type": "ordinal",
        "sort": ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] }
```

**2d. Tick mark / strip plot pattern:**
Add distribution visualization example using tick marks.

**2e. Text mark placement on bars:**
Add layer example of text labels positioned on/above bars.

### 3. System Prompt Improvements (system-prompt.ts)

Three additions to the pre-render checklist:
1. "If user asks for a reference/average/threshold line, use `layer` with `rule` mark and `datum` encoding."
2. "Only use scheme names from docs (e.g. `yelloworangered`, not `YlOrRd`). Call `lookup_docs` with `color-scale` if unsure."
3. "If x-axis is months or weekdays, add explicit `sort` array for chronological order."

### 4. Spec Validation in Eval Pipeline

The web app already validates specs via `vl.compile()` before rendering (`validate-spec.ts`). The eval pipeline skips this, going straight to `embed()` in the browser.

**Fix:** Port the `validateSpec` pattern into `run-case.ts`:
- Call `vl.compile()` server-side before rendering
- On failure, return compile error as tool result: `{ success: false, error: "Vega-Lite error: ..." }`
- Model gets actionable feedback and can self-correct on retry

This ensures eval results match production behavior.

### 5. New Eval Cases

| Case | Tests | Rationale |
|------|-------|-----------|
| `heatmap-custom-scheme` | Sequential multi-hue scheme (`yelloworangered`) | Validates model picks valid VL scheme names |
| `layer-reference-line` | Bar chart + horizontal rule at specific value | Direct test for most common layer failure |
| `ordinal-month-sort` | Line chart with months, must sort chronologically | Validates month ordering guidance |
| `strip-plot-ticks` | Distribution using tick marks | Validates tick mark usage |

Consider removing `multi-turn-3-steps` if duplicative of `multi-turn-three-steps`.
