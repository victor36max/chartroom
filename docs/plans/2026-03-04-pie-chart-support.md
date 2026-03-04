# Pie Chart Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a working `arc` mark type that renders pie/donut charts using D3, since Observable Plot 0.6.x has no native arc mark.

**Architecture:** When `specToPlot` encounters an `arc` mark, it bypasses `Plot.plot()` and calls a standalone `renderPieChart()` function that creates a plain SVG with D3 pie/arc generators. Title, subtitle, and width/height from the spec are applied to this SVG directly. SVG-native `<title>` elements provide hover tooltips on each slice.

**Tech Stack:** D3 7.x (`d3-shape` pie/arc, `d3-scale-chromatic` for colors) — already installed transitively via `@observablehq/plot`. Must be added as a direct dependency.

---

### Task 1: Add d3 as a direct dependency

**Files:**
- Modify: `package.json`

**Step 1: Install d3**

```bash
bun add d3
bun add -d @types/d3
```

**Step 2: Verify**

```bash
node --input-type=module -e "import * as d3 from 'd3'; console.log(d3.version)"
```

Expected: prints `7.x.x`

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add d3 as direct dependency for pie chart support"
```

---

### Task 2: Create `renderPieChart` in `src/lib/chart/arc-mark.ts`

**Files:**
- Create: `src/lib/chart/arc-mark.ts`

**Step 1: Create the file with this exact content**

```typescript
import * as d3 from "d3";
import type { ChartSpec, MarkSpec } from "@/types";

const COLORS = d3.schemeTableau10;

export function renderPieChart(
  arcSpec: MarkSpec,
  csvData: Record<string, unknown>[],
  spec: ChartSpec
): SVGSVGElement {
  const opts = arcSpec.options ?? {};
  const valueField = opts.value as string;
  const labelField = opts.label as string;
  const innerRadius = (opts.innerRadius as number) ?? 0;

  const width = (spec.width as number) ?? 500;
  const height = (spec.height as number) ?? 400;
  const titleHeight = spec.title ? 28 : 0;
  const subtitleHeight = spec.subtitle ? 20 : 0;
  const headerHeight = titleHeight + subtitleHeight;

  // Chart area dimensions
  const chartHeight = height - headerHeight;
  const radius = Math.min(width, chartHeight) / 2 - 30;
  const cx = width / 2;
  const cy = headerHeight + chartHeight / 2;

  // SVG root
  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .style("font-family", "system-ui, sans-serif")
    .style("overflow", "visible");

  // Apply spec styles
  if (spec.style) {
    for (const [k, v] of Object.entries(spec.style)) {
      svg.style(k, v as string);
    }
  }

  // Title
  if (spec.title) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", "#1a1a1a")
      .text(spec.title);
  }

  // Subtitle
  if (spec.subtitle) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", titleHeight + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text(spec.subtitle);
  }

  // Compute pie layout
  const pie = d3
    .pie<Record<string, unknown>>()
    .value((d) => Number(d[valueField]) || 0)
    .sort(null);

  const arcGen = d3
    .arc<d3.PieArcDatum<Record<string, unknown>>>()
    .innerRadius(innerRadius)
    .outerRadius(radius);

  const labelArc = d3
    .arc<d3.PieArcDatum<Record<string, unknown>>>()
    .innerRadius(radius * 0.65)
    .outerRadius(radius * 0.65);

  const total = d3.sum(csvData, (d) => Number(d[valueField]) || 0);
  const arcs = pie(csvData);

  const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

  // Slices
  g.selectAll<SVGPathElement, d3.PieArcDatum<Record<string, unknown>>>("path")
    .data(arcs)
    .join("path")
    .attr("d", arcGen)
    .attr("fill", (_, i) => COLORS[i % COLORS.length])
    .attr("stroke", "white")
    .attr("stroke-width", 1.5)
    .each(function (d) {
      // Native SVG tooltip
      const value = Number(d.data[valueField]) || 0;
      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
      const label = d.data[labelField] ?? "";
      d3.select(this)
        .append("title")
        .text(`${label}: ${value.toLocaleString()} (${pct}%)`);
    });

  // Slice labels (only show if slice is big enough)
  g.selectAll<SVGTextElement, d3.PieArcDatum<Record<string, unknown>>>("text.label")
    .data(arcs)
    .join("text")
    .attr("class", "label")
    .attr("transform", (d) => `translate(${labelArc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("fill", "white")
    .attr("pointer-events", "none")
    .text((d) => {
      const pct = total > 0 ? (((Number(d.data[valueField]) || 0) / total) * 100) : 0;
      return pct >= 5 ? String(d.data[labelField] ?? "") : "";
    });

  return svg.node() as SVGSVGElement;
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun run build 2>&1 | head -30
```

Expected: no type errors related to `arc-mark.ts`

**Step 3: Commit**

```bash
git add src/lib/chart/arc-mark.ts
git commit -m "feat: add renderPieChart function using D3 pie/arc generators"
```

---

### Task 3: Wire `arc` into `specToPlot`

**Files:**
- Modify: `src/lib/chart/spec-to-plot.ts`

**Step 1: Add the import at the top of the file**

After line 2 (`import type { ChartSpec, MarkSpec } from "@/types";`), add:

```typescript
import { renderPieChart } from "./arc-mark";
```

**Step 2: Add arc detection at the start of `specToPlot`** (before `const marks = ...`)

In `specToPlot`, after line 84 (`const marks = spec.marks.map...` line), add this block **before** that line:

```typescript
  // Pie/donut charts use a standalone D3 renderer — Observable Plot has no arc mark
  const arcMark = spec.marks.find((m) => m.type === "arc");
  if (arcMark) {
    return renderPieChart(arcMark, csvData, spec);
  }
```

The resulting start of `specToPlot` should look like:

```typescript
export function specToPlot(spec: ChartSpec, csvData: Record<string, unknown>[]): HTMLElement | SVGSVGElement {
  // Pie/donut charts use a standalone D3 renderer — Observable Plot has no arc mark
  const arcMark = spec.marks.find((m) => m.type === "arc");
  if (arcMark) {
    return renderPieChart(arcMark, csvData, spec);
  }

  const marks = spec.marks.map((m) => buildMark(m, csvData));
  ...
```

**Step 3: Build to verify**

```bash
bun run build 2>&1 | head -30
```

Expected: clean build

**Step 4: Commit**

```bash
git add src/lib/chart/spec-to-plot.ts
git commit -m "feat: route arc marks to D3 pie chart renderer in specToPlot"
```

---

### Task 4: Update system prompt to teach AI about `arc`

**Files:**
- Modify: `src/lib/agent/system-prompt.ts`

**Step 1: Replace the "Unsupported chart types" block with an arc entry in the mark types list**

Find this section:

```
## Unsupported chart types
- **Pie/donut charts**: Observable Plot 0.6.x has no "arc" mark. Do NOT use "arc". For part-to-whole comparisons, use a horizontal barX chart with groupY instead, or explain to the user that pie charts aren't available.
```

Replace it with:

```
- **arc**: Pie and donut charts. Uses \`value\` (numeric field for slice size) and \`label\` (categorical field for slice names). Set \`innerRadius: 0\` for pie (default), or \`innerRadius: 60\` for donut. Example: \`{ "type": "arc", "data": "csv", "options": { "value": "revenue", "label": "region", "innerRadius": 0 } }\`
```

This line should go right after the `tip` line in the mark types list (before the closing of that section).

**Step 2: Build and run dev server briefly to confirm no errors**

```bash
bun run build 2>&1 | head -20
```

Expected: clean build

**Step 3: Commit**

```bash
git add src/lib/agent/system-prompt.ts
git commit -m "feat: document arc mark in system prompt for AI chart generation"
```

---

### Task 5: Manual smoke test

**Step 1: Start dev server**

```bash
bun dev
```

**Step 2: Open browser at http://localhost:3000**

**Step 3: Upload `public/test-data.csv`**

**Step 4: Ask the AI:** "Show me a pie chart of total revenue by region"

**Expected:**
- AI emits `render_chart` with `type: "arc"`, `value: "revenue"`, `label: "region"`
- A pie chart appears in the right panel with colored slices
- Hovering a slice shows a tooltip: `East: 123,456 (25.3%)`
- Title from the spec appears above the chart

**Step 5: Ask:** "Make it a donut chart"

**Expected:** Same chart with a hole in the center (`innerRadius: 60` or similar)

---
