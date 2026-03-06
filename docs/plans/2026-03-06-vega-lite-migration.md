# Vega-Lite v6 Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Observable Plot with Vega-Lite v6 so the AI emits native VL JSON specs rendered directly by vega-embed, eliminating the 661-line translation layer.

**Architecture:** AI emits native Vega-Lite v6 JSON (mark, encoding, transform). No intermediate format. `stripStyling()` removes any config, `injectData()` swaps sentinel `{name:"csv"}` with actual rows, then `vega-embed` renders with a theme config applied at render time. Theme picker uses `vega-themes`.

**Tech Stack:** vega-lite v6, vega, vega-embed, vega-themes, Zod v4, Vitest, Playwright (evals)

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install vega ecosystem, remove Observable Plot**

```bash
bun add vega vega-lite vega-embed vega-themes
bun remove @observablehq/plot html-to-image
```

Note: Keep `d3` (used by data-filter.ts and vega internally). Remove `html-to-image` since we'll use vega's built-in `view.toImageURL()`.

**Step 2: Verify install**

```bash
bun run build
```

Expected: Build will FAIL because existing code imports `@observablehq/plot` and `html-to-image`. That's expected — we'll fix imports in subsequent tasks.

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "feat: add vega-lite v6, vega, vega-embed, vega-themes; remove @observablehq/plot and html-to-image"
```

---

## Task 2: Update Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Rewrite types**

Replace `ChartSpec` and `MarkSpec` with Vega-Lite's `TopLevelSpec`. Keep CSV types unchanged.

```typescript
import type { TopLevelSpec } from "vega-lite";

export type ChartSpec = TopLevelSpec;

export type ThemeId =
  | "default"
  | "dark"
  | "excel"
  | "fivethirtyeight"
  | "ggplot2"
  | "googlecharts"
  | "latimes"
  | "powerbi"
  | "quartz"
  | "urbaninstitute"
  | "vox";

export interface ColumnMeta {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  sample: unknown[];
  unique?: number;
  min?: number | string;
  max?: number | string;
}

export interface DataMetadata {
  rowCount: number;
  columns: ColumnMeta[];
}

export interface ParsedCSV {
  data: Record<string, unknown>[];
  metadata: DataMetadata;
  errors: string[];
}
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: replace ChartSpec/MarkSpec with Vega-Lite TopLevelSpec"
```

---

## Task 3: Create `injectData` with TDD

**Files:**
- Create: `src/lib/chart/__tests__/inject-data.test.ts`
- Create: `src/lib/chart/inject-data.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { injectData } from "../inject-data";

const SAMPLE_ROWS = [
  { name: "Alice", score: 90 },
  { name: "Bob", score: 85 },
];

describe("injectData", () => {
  it("replaces top-level data sentinel with values", () => {
    const spec = {
      data: { name: "csv" },
      mark: "bar",
      encoding: { x: { field: "name" }, y: { field: "score" } },
    };
    const result = injectData(spec, SAMPLE_ROWS);
    expect(result.data).toEqual({ values: SAMPLE_ROWS });
    expect(result.mark).toBe("bar"); // rest preserved
  });

  it("replaces data in each layer", () => {
    const spec = {
      layer: [
        { data: { name: "csv" }, mark: "bar", encoding: {} },
        { data: { name: "csv" }, mark: "line", encoding: {} },
      ],
    };
    const result = injectData(spec, SAMPLE_ROWS);
    expect(result.layer[0].data).toEqual({ values: SAMPLE_ROWS });
    expect(result.layer[1].data).toEqual({ values: SAMPLE_ROWS });
  });

  it("injects top-level data when spec has no data property", () => {
    const spec = { mark: "bar", encoding: {} };
    const result = injectData(spec, SAMPLE_ROWS);
    expect(result.data).toEqual({ values: SAMPLE_ROWS });
  });

  it("does not mutate original spec", () => {
    const spec = { data: { name: "csv" }, mark: "bar", encoding: {} };
    const original = JSON.parse(JSON.stringify(spec));
    injectData(spec, SAMPLE_ROWS);
    expect(spec).toEqual(original);
  });

  it("handles faceted specs with data on inner spec", () => {
    const spec = {
      facet: { field: "category", type: "nominal" },
      spec: { data: { name: "csv" }, mark: "bar", encoding: {} },
    };
    const result = injectData(spec, SAMPLE_ROWS);
    expect(result.spec.data).toEqual({ values: SAMPLE_ROWS });
  });

  it("preserves non-csv data (e.g. inline values)", () => {
    const spec = {
      data: { values: [{ a: 1 }] },
      mark: "bar",
      encoding: {},
    };
    const result = injectData(spec, SAMPLE_ROWS);
    // Non-sentinel data left alone
    expect(result.data).toEqual({ values: [{ a: 1 }] });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
bun run test src/lib/chart/__tests__/inject-data.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement**

```typescript
// src/lib/chart/inject-data.ts

type SpecObj = Record<string, unknown>;

function isCSVSentinel(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "name" in data &&
    (data as Record<string, unknown>).name === "csv"
  );
}

function replaceData(obj: SpecObj, rows: Record<string, unknown>[]): SpecObj {
  const clone = { ...obj };

  // Replace sentinel data
  if (isCSVSentinel(clone.data)) {
    clone.data = { values: rows };
  }

  // Inject data if spec has no data at all (single view)
  if (!clone.data && !clone.layer && !clone.hconcat && !clone.vconcat && !clone.concat && !clone.facet && !clone.repeat) {
    clone.data = { values: rows };
  }

  // Recurse into layers
  if (Array.isArray(clone.layer)) {
    clone.layer = (clone.layer as SpecObj[]).map((l) => replaceData(l, rows));
  }

  // Recurse into facet inner spec
  if (clone.spec && typeof clone.spec === "object") {
    clone.spec = replaceData(clone.spec as SpecObj, rows);
  }

  // Recurse into concat arrays
  for (const key of ["hconcat", "vconcat", "concat"] as const) {
    if (Array.isArray(clone[key])) {
      clone[key] = (clone[key] as SpecObj[]).map((s) => replaceData(s, rows));
    }
  }

  return clone;
}

export function injectData(
  spec: Record<string, unknown>,
  rows: Record<string, unknown>[]
): Record<string, unknown> {
  return replaceData(structuredClone(spec) as SpecObj, rows);
}
```

**Step 4: Run tests**

```bash
bun run test src/lib/chart/__tests__/inject-data.test.ts
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add src/lib/chart/inject-data.ts src/lib/chart/__tests__/inject-data.test.ts
git commit -m "feat: add injectData with TDD tests"
```

---

## Task 4: Create `stripStyling` with TDD

**Files:**
- Create: `src/lib/chart/__tests__/strip-config.test.ts`
- Create: `src/lib/chart/strip-config.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { stripStyling } from "../strip-config";

describe("stripStyling", () => {
  it("removes config from spec", () => {
    const spec = { mark: "bar", encoding: {}, config: { font: "Arial" } };
    expect(stripStyling(spec)).toEqual({ mark: "bar", encoding: {} });
  });

  it("removes $schema", () => {
    const spec = { $schema: "https://vega.github.io/schema/vega-lite/v6.json", mark: "bar", encoding: {} };
    expect(stripStyling(spec)).toEqual({ mark: "bar", encoding: {} });
  });

  it("removes background, padding, autosize", () => {
    const spec = { mark: "bar", encoding: {}, background: "white", padding: 10, autosize: "fit" };
    expect(stripStyling(spec)).toEqual({ mark: "bar", encoding: {} });
  });

  it("preserves data, mark, encoding, transform, layer, title", () => {
    const spec = {
      data: { name: "csv" },
      mark: "bar",
      encoding: { x: { field: "a" } },
      transform: [{ filter: "datum.a > 5" }],
      title: "My Chart",
      width: 400,
      height: 300,
    };
    expect(stripStyling(spec)).toEqual(spec);
  });

  it("does not mutate original spec", () => {
    const spec = { mark: "bar", encoding: {}, config: { font: "Arial" } };
    const original = JSON.parse(JSON.stringify(spec));
    stripStyling(spec);
    expect(spec).toEqual(original);
  });
});
```

**Step 2: Run tests to verify failure**

```bash
bun run test src/lib/chart/__tests__/strip-config.test.ts
```

**Step 3: Implement**

```typescript
// src/lib/chart/strip-config.ts

const STRIP_KEYS = ["config", "$schema", "background", "padding", "autosize"] as const;

export function stripStyling(spec: Record<string, unknown>): Record<string, unknown> {
  const clone = { ...spec };
  for (const key of STRIP_KEYS) {
    delete clone[key];
  }
  return clone;
}
```

**Step 4: Run tests**

```bash
bun run test src/lib/chart/__tests__/strip-config.test.ts
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add src/lib/chart/strip-config.ts src/lib/chart/__tests__/strip-config.test.ts
git commit -m "feat: add stripStyling with TDD tests"
```

---

## Task 5: Create `validateSpec` with TDD

**Files:**
- Create: `src/lib/chart/__tests__/validate-spec.test.ts`
- Create: `src/lib/chart/validate-spec.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { validateSpec } from "../validate-spec";

const ROWS = [
  { category: "A", value: 10 },
  { category: "B", value: 20 },
];

describe("validateSpec", () => {
  it("returns valid for a correct bar chart spec", () => {
    const spec = {
      mark: "bar",
      encoding: {
        x: { field: "category", type: "nominal" },
        y: { field: "value", type: "quantitative" },
      },
    };
    const result = validateSpec(spec, ROWS);
    expect(result.valid).toBe(true);
  });

  it("returns error for spec with missing mark", () => {
    const spec = { encoding: { x: { field: "category" } } };
    const result = validateSpec(spec, ROWS);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns valid for a layered spec", () => {
    const spec = {
      layer: [
        { mark: "bar", encoding: { x: { field: "category", type: "nominal" }, y: { field: "value", type: "quantitative" } } },
        { mark: "rule", encoding: { y: { datum: 15 } } },
      ],
    };
    const result = validateSpec(spec, ROWS);
    expect(result.valid).toBe(true);
  });

  it("returns valid for arc (pie) chart", () => {
    const spec = {
      mark: { type: "arc" },
      encoding: {
        theta: { field: "value", type: "quantitative" },
        color: { field: "category", type: "nominal" },
      },
    };
    const result = validateSpec(spec, ROWS);
    expect(result.valid).toBe(true);
  });

  it("returns valid for boxplot", () => {
    const spec = {
      mark: "boxplot",
      encoding: {
        x: { field: "category", type: "nominal" },
        y: { field: "value", type: "quantitative" },
      },
    };
    const result = validateSpec(spec, ROWS);
    expect(result.valid).toBe(true);
  });
});
```

**Step 2: Run tests to verify failure**

```bash
bun run test src/lib/chart/__tests__/validate-spec.test.ts
```

**Step 3: Implement**

```typescript
// src/lib/chart/validate-spec.ts
import * as vl from "vega-lite";
import { injectData } from "./inject-data";

export function validateSpec(
  spec: Record<string, unknown>,
  data: Record<string, unknown>[]
): { valid: true } | { valid: false; error: string } {
  try {
    const fullSpec = injectData(spec, data);
    vl.compile(fullSpec as vl.TopLevelSpec);
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
```

**Step 4: Run tests**

```bash
bun run test src/lib/chart/__tests__/validate-spec.test.ts
```

Expected: All PASS. Note: `vl.compile()` is pure JS, works fine in jsdom/node.

**Step 5: Commit**

```bash
git add src/lib/chart/validate-spec.ts src/lib/chart/__tests__/validate-spec.test.ts
git commit -m "feat: add validateSpec using vega-lite compile with TDD tests"
```

---

## Task 6: Create `renderVegaLite` and Rewrite `ChartRenderer`

**Files:**
- Create: `src/lib/chart/render-vega.ts`
- Modify: `src/components/chart/chart-renderer.tsx`

**Step 1: Create render-vega.ts**

```typescript
// src/lib/chart/render-vega.ts
import embed, { type Result } from "vega-embed";
import * as themes from "vega-themes";
import type { Config } from "vega-lite";
import type { ThemeId } from "@/types";
import { injectData } from "./inject-data";
import { stripStyling } from "./strip-config";

// Datawrapper-like defaults matching the current Firechart aesthetic
const DEFAULT_CONFIG: Config = {
  font: "system-ui, -apple-system, sans-serif",
  axis: {
    labelFont: "system-ui, -apple-system, sans-serif",
    titleFont: "system-ui, -apple-system, sans-serif",
    gridColor: "#e5e5e5",
    gridOpacity: 0.8,
    domainColor: "#888",
    tickColor: "#888",
  },
  title: {
    font: "system-ui, -apple-system, sans-serif",
    fontSize: 16,
    fontWeight: 600,
    anchor: "start",
    subtitleFont: "system-ui, -apple-system, sans-serif",
    subtitleFontSize: 13,
    subtitleColor: "#666",
  },
  legend: {
    labelFont: "system-ui, -apple-system, sans-serif",
    titleFont: "system-ui, -apple-system, sans-serif",
  },
  range: { category: { scheme: "tableau10" } },
  view: { stroke: null },
};

export function getThemeConfig(themeId: ThemeId): Config {
  if (themeId === "default") return DEFAULT_CONFIG;
  const themeConfig = (themes as Record<string, Config | undefined>)[themeId];
  return themeConfig ?? DEFAULT_CONFIG;
}

export async function renderVegaLite(
  container: HTMLElement,
  spec: Record<string, unknown>,
  data: Record<string, unknown>[],
  themeId: ThemeId = "default"
): Promise<Result> {
  const cleaned = stripStyling(spec);
  const withData = injectData(cleaned, data);
  const config = getThemeConfig(themeId);

  const result = await embed(container, withData as Parameters<typeof embed>[1], {
    config,
    actions: false,
    renderer: "svg",
  });

  return result;
}
```

**Step 2: Rewrite ChartRenderer**

```typescript
// src/components/chart/chart-renderer.tsx
"use client";

import { useEffect, useRef } from "react";
import { renderVegaLite } from "@/lib/chart/render-vega";
import type { ChartSpec, ThemeId } from "@/types";
import type { Result } from "vega-embed";

interface ChartRendererProps {
  spec: ChartSpec;
  data: Record<string, unknown>[];
  themeId?: ThemeId;
  onViewReady?: (result: Result) => void;
}

export function ChartRenderer({ spec, data, themeId = "default", onViewReady }: ChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<Result | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    renderVegaLite(container, spec as Record<string, unknown>, data, themeId)
      .then((result) => {
        if (cancelled) {
          result.view.finalize();
          return;
        }
        resultRef.current = result;
        onViewReady?.(result);
      })
      .catch((err) => {
        if (cancelled) return;
        container.innerHTML = "";
        const errorDiv = document.createElement("div");
        errorDiv.className = "p-4 text-sm text-destructive";
        errorDiv.textContent = `Chart error: ${err instanceof Error ? err.message : "Unknown error"}`;
        container.appendChild(errorDiv);
      });

    return () => {
      cancelled = true;
      resultRef.current?.view.finalize();
      resultRef.current = null;
    };
  }, [spec, data, themeId, onViewReady]);

  return (
    <div className="flex items-center justify-center p-6 h-full">
      <div ref={containerRef} id="chart-container" className="w-full max-w-3xl" />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/lib/chart/render-vega.ts src/components/chart/chart-renderer.tsx
git commit -m "feat: add renderVegaLite + rewrite ChartRenderer for vega-embed"
```

---

## Task 7: Rewrite Chart Capture and Export

**Files:**
- Modify: `src/components/chart/chart-capture.ts`
- Modify: `src/lib/chart/export-chart.ts`

**Step 1: Rewrite chart-capture.ts to use vega view API**

The capture function needs access to the vega View. We'll use a module-level ref set by ChartRenderer.

```typescript
// src/components/chart/chart-capture.ts
import type { Result } from "vega-embed";

let currentResult: Result | null = null;

export function setCurrentVegaResult(result: Result | null) {
  currentResult = result;
}

export async function captureChart(): Promise<string> {
  if (!currentResult) {
    throw new Error("No chart view available for capture");
  }

  const dataUrl = await currentResult.view.toImageURL("png", 1);
  // Strip the data:image/png;base64, prefix
  return dataUrl.replace(/^data:image\/png;base64,/, "");
}
```

**Step 2: Update ChartRenderer to register the view**

Update the `onViewReady` callback in ChartRenderer's parent, or wire `setCurrentVegaResult` directly. We'll update ChartRenderer's effect to call `setCurrentVegaResult`:

In `chart-renderer.tsx`, add to the `.then()` block:
```typescript
import { setCurrentVegaResult } from "./chart-capture";
// ... inside .then():
setCurrentVegaResult(result);
// ... inside cleanup:
setCurrentVegaResult(null);
```

**Step 3: Rewrite export-chart.ts**

```typescript
// src/lib/chart/export-chart.ts
import type { Result } from "vega-embed";

let currentResult: Result | null = null;

export function setExportView(result: Result | null) {
  currentResult = result;
}

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportChartAsPng(options?: {
  pixelRatio?: number;
}) {
  if (!currentResult) return;
  const scaleFactor = options?.pixelRatio ?? 2;
  const dataUrl = await currentResult.view.toImageURL("png", scaleFactor);
  download(dataUrl, "chart.png");
}

export async function exportChartAsSvg() {
  if (!currentResult) return;
  const svg = await currentResult.view.toSVG();
  const blob = new Blob([svg], { type: "image/svg+xml" });
  download(URL.createObjectURL(blob), "chart.svg");
}
```

**Step 4: Commit**

```bash
git add src/components/chart/chart-capture.ts src/lib/chart/export-chart.ts src/components/chart/chart-renderer.tsx
git commit -m "feat: rewrite chart capture and export to use vega view API"
```

---

## Task 8: Delete Old Observable Plot Files

**Files:**
- Delete: `src/lib/chart/spec-to-plot.ts`
- Delete: `src/lib/chart/arc-mark.ts`
- Delete: `src/lib/chart/__tests__/spec-to-plot.test.ts`

**Step 1: Delete files**

```bash
rm src/lib/chart/spec-to-plot.ts src/lib/chart/arc-mark.ts src/lib/chart/__tests__/spec-to-plot.test.ts
```

**Step 2: Run tests to verify remaining tests pass**

```bash
bun run test
```

Expected: inject-data, strip-config, validate-spec tests pass. Parser tests pass. Any test importing spec-to-plot is already deleted.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete spec-to-plot.ts, arc-mark.ts, and old tests"
```

---

## Task 9: Rewrite AI Tool Definitions

**Files:**
- Modify: `src/lib/agent/tools.ts`

**Step 1: Rewrite with Vega-Lite schema**

```typescript
import { tool } from "ai";
import { z } from "zod";
import { filterData } from "./data-filter";
import { TOPIC_IDS, lookupDocs, type TopicId } from "@/lib/docs/vl-docs";

// Encoding channel schema — field, type, aggregate, bin, etc.
const encodingChannelSchema = z.record(z.string(), z.unknown())
  .describe("Vega-Lite encoding channel: { field, type (quantitative/nominal/ordinal/temporal), aggregate, bin, timeUnit, scale, axis, legend, sort, stack, title, tooltip, ... }");

const vlMarkSchema = z.union([
  z.string().describe("Mark type: bar, line, area, point, rect, rule, text, tick, arc, boxplot, errorbar, errorband, trail, square, circle"),
  z.object({ type: z.string() }).passthrough().describe("Mark with properties: { type, tooltip, opacity, ... }"),
]);

const vlSpecSchema = z.object({
  data: z.object({ name: z.literal("csv") }).optional().describe('Use { name: "csv" } to reference the uploaded dataset'),
  mark: vlMarkSchema.optional(),
  encoding: z.record(z.string(), encodingChannelSchema).optional().describe("Encoding channels: x, y, color, size, shape, opacity, theta, radius, text, tooltip, row, column, facet, detail, order"),
  transform: z.array(z.record(z.string(), z.unknown())).optional().describe("Array of transforms: filter, calculate, fold, aggregate, bin, window, lookup, flatten, pivot, regression, loess, density"),
  layer: z.array(z.lazy(() => vlUnitSchema)).optional().describe("Array of layered specs (each with mark + encoding)"),
  facet: z.record(z.string(), z.unknown()).optional().describe("Facet field for small multiples"),
  repeat: z.unknown().optional().describe("Repeat spec for repeated views"),
  spec: z.lazy(() => vlUnitSchema).optional().describe("Inner spec for facet/repeat"),
  resolve: z.record(z.string(), z.unknown()).optional().describe("Resolve shared/independent scales across layers/facets"),
  title: z.union([z.string(), z.object({ text: z.string() }).passthrough()]).optional(),
  width: z.union([z.number(), z.literal("container")]).optional(),
  height: z.union([z.number(), z.literal("container")]).optional(),
  // NO config, NO $schema, NO background, NO padding, NO autosize
});

const vlUnitSchema = z.object({
  data: z.object({ name: z.literal("csv") }).optional(),
  mark: vlMarkSchema.optional(),
  encoding: z.record(z.string(), encodingChannelSchema).optional(),
  transform: z.array(z.record(z.string(), z.unknown())).optional(),
  layer: z.array(z.lazy(() => vlUnitSchema)).optional(),
  title: z.union([z.string(), z.object({ text: z.string() }).passthrough()]).optional(),
  width: z.union([z.number(), z.literal("container")]).optional(),
  height: z.union([z.number(), z.literal("container")]).optional(),
});

export function createTools(csvData: Record<string, unknown>[] | undefined) {
  return {
    render_chart: tool({
      description:
        "Render a chart using Vega-Lite. The chart will be displayed to the user and a screenshot will be returned for you to evaluate. Always use this tool to create or update charts.",
      inputSchema: z.object({
        spec: vlSpecSchema.describe("The Vega-Lite chart specification"),
        title: z.string().optional().describe("Chart title"),
        description: z.string().optional().describe("Brief description of the chart for the user"),
      }),
      // No execute — this is a client-side tool
    }),

    filter_data: tool({
      description:
        "Filter CSV data to top/bottom N entries by a column. Can aggregate first (e.g., top 5 products by total revenue). Use before render_chart when you need to limit which rows or categories appear.",
      inputSchema: z.object({
        column: z.string().describe("Column to sort by (or value column when using groupBy)"),
        direction: z.enum(["top", "bottom"]).describe("Whether to get highest or lowest values"),
        n: z.number().int().min(1).max(50).describe("Number of entries to return"),
        groupBy: z.string().optional().describe("Category column to group by before aggregating"),
        aggregate: z.enum(["sum", "count", "mean", "max", "min"]).optional().describe("Aggregation function when groupBy is used"),
      }),
      execute: async ({ column, direction, n, groupBy, aggregate }) => {
        if (!csvData || csvData.length === 0) {
          return { error: "No CSV data available" };
        }
        return filterData(csvData, { column, direction, n, groupBy, aggregate });
      },
    }),

    lookup_docs: tool({
      description:
        "Look up Vega-Lite documentation for specific topics. " +
        "Use when you need details about a mark type, encoding, transform, or composition. " +
        "Available topics: " +
        "bar, line, area, point, rect, rule, text, tick, arc, boxplot, " +
        "encoding (channels and types), aggregate (aggregate/bin/timeUnit), " +
        "stack, fold (wide-to-long reshape), filter, calculate, " +
        "layer (multi-mark), facet (small multiples), repeat, " +
        "color-scale, position-scales, styling, " +
        "layout-patterns (stacked/grouped/horizontal), composite-patterns, editing-charts",
      inputSchema: z.object({
        topics: z
          .array(z.enum(TOPIC_IDS))
          .min(1)
          .max(3)
          .describe("Topic(s) to look up, max 3"),
      }),
      execute: async ({ topics }) => {
        return { documentation: lookupDocs(topics as TopicId[]) };
      },
    }),
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/agent/tools.ts
git commit -m "feat: rewrite tool schemas for Vega-Lite v6"
```

---

## Task 10: Create Vega-Lite Documentation (`vl-docs.ts`)

**Files:**
- Create: `src/lib/docs/vl-docs.ts`
- Delete: `src/lib/docs/plot-docs.ts` (after vl-docs is complete)

This is the largest single file. Use context7 MCP to fetch Vega-Lite v6 documentation for accuracy.

**Step 1: Create vl-docs.ts with topic structure**

The topics should cover:
- **Marks:** bar, line, area, point, rect, rule, text, tick, arc, boxplot
- **Encoding:** encoding (channel overview), aggregate (aggregate/bin/timeUnit), stack, fold (wide-to-long), filter, calculate
- **Composition:** layer, facet, repeat
- **Scales:** color-scale, position-scales
- **Patterns:** styling, layout-patterns, composite-patterns, editing-charts

Each topic should be a concise reference card (50-100 lines) with:
- Required/key properties
- JSON examples
- Common gotchas
- Tips for common mistakes

**IMPORTANT:** For each topic, use `mcp__plugin_context7_context7__query-docs` with library ID `/websites/vega_github_io_vega-lite` to fetch current v6 docs. Do NOT guess at Vega-Lite API details.

**Step 2: Delete old plot-docs.ts**

```bash
rm src/lib/docs/plot-docs.ts
```

**Step 3: Commit**

```bash
git add src/lib/docs/vl-docs.ts
git rm src/lib/docs/plot-docs.ts
git commit -m "feat: add Vega-Lite v6 documentation for lookup_docs tool"
```

---

## Task 11: Rewrite System Prompt

**Files:**
- Modify: `src/lib/agent/system-prompt.ts`

**Step 1: Rewrite for Vega-Lite v6**

Key sections to rewrite:
- Tool workflow: same structure but reference VL marks and `encoding` instead of Observable Plot marks + options
- Decline list: remove boxplot (now supported). Keep map/treemap/radar/funnel/waffle. Add note that boxplot, error bars are now native.
- Chart spec format: show VL JSON structure with `mark`, `encoding`, `transform`
- Pre-render checklist: adapted for VL (data sentinel, encoding types, aggregate in encoding, stack property, etc.)
- Multi-turn editing: same principle, reference VL patterns

The system prompt should teach:
1. `data: { name: "csv" }` always present
2. Encoding types: `quantitative`, `nominal`, `ordinal`, `temporal`
3. Aggregation via `aggregate` property in encoding (NOT separate transforms for simple cases)
4. `transform` array for complex ops (filter, fold, calculate, window)
5. Layer for multi-mark (line + point, bar + rule)
6. Facet for small multiples
7. Never emit `config`, `$schema`, `background` — theme is applied automatically
8. VL mark types: bar, line, area, point, rect, rule, text, tick, arc, boxplot, errorbar
9. No orientation variants (no barX/barY) — orientation determined by which channel is ordinal/nominal vs quantitative

**Step 2: Commit**

```bash
git add src/lib/agent/system-prompt.ts
git commit -m "feat: rewrite system prompt for Vega-Lite v6"
```

---

## Task 12: Update Chat Panel

**Files:**
- Modify: `src/components/chat/chat-panel.tsx`

**Step 1: Replace specToPlot validation with validateSpec**

Changes:
- Replace `import { specToPlot }` with `import { validateSpec }`
- In `onToolCall`, replace `specToPlot(chartSpec, data)` with `validateSpec(chartSpec, data)` and check `.valid`
- Simplify chartSpec extraction — the spec IS the VL spec now

```typescript
// Line 13: Change import
import { validateSpec } from "@/lib/chart/validate-spec";

// Lines 74-91: Update onToolCall handler
const spec = (toolCall as unknown as { input: unknown }).input as {
  spec: ChartSpec;
  title?: string;
  description?: string;
};

// Merge title into VL spec if provided separately
const chartSpec: ChartSpec = spec.title
  ? { ...spec.spec, title: spec.title }
  : spec.spec;

// Validate via VL compile
const validation = validateSpec(chartSpec as Record<string, unknown>, csvDataRef.current?.data ?? []);
if (!validation.valid) {
  addToolOutput({
    tool: "render_chart",
    toolCallId: toolCall.toolCallId,
    output: JSON.stringify({ success: false, error: validation.error }),
  });
  return;
}
```

**Step 2: Commit**

```bash
git add src/components/chat/chat-panel.tsx
git commit -m "feat: update ChatPanel to use validateSpec instead of specToPlot"
```

---

## Task 13: Update Page.tsx and Chart Panel (Theme Support)

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/chart/chart-panel.tsx`

**Step 1: Add theme state to page.tsx**

```typescript
// Add to imports
import type { ParsedCSV, ChartSpec, ThemeId } from "@/types";

// Add state
const [themeId, setThemeId] = useState<ThemeId>("default");

// Pass to ChartPanel
<ChartPanel
  csvData={csvData}
  chartSpec={currentChart}
  onChartSpecEdited={handleChartSpecEdited}
  themeId={themeId}
  onThemeChange={setThemeId}
/>
```

**Step 2: Update ChartPanel props and validation**

- Add `themeId` and `onThemeChange` props
- Replace `specToPlot` import with `validateSpec`
- Replace `specToPlot()` call in live preview (line 51) with `validateSpec()`
- Replace `specToPlot()` in handleApply (line 77) with `validateSpec()`
- Pass `themeId` to `ChartRenderer`
- Add theme picker dropdown in the editor header (between Visual/JSON tabs and Apply button)

Theme picker UI:
```tsx
<select
  value={themeId}
  onChange={(e) => onThemeChange?.(e.target.value as ThemeId)}
  className="text-xs border rounded px-1.5 py-1"
>
  <option value="default">Default</option>
  <option value="dark">Dark</option>
  <option value="fivethirtyeight">FiveThirtyEight</option>
  <option value="latimes">LA Times</option>
  <option value="vox">Vox</option>
  <option value="urbaninstitute">Urban Institute</option>
  <option value="googlecharts">Google Charts</option>
  <option value="powerbi">Power BI</option>
  <option value="quartz">Quartz</option>
  <option value="excel">Excel</option>
  <option value="ggplot2">ggplot2</option>
</select>
```

**Step 3: Commit**

```bash
git add src/app/page.tsx src/components/chart/chart-panel.tsx
git commit -m "feat: add theme picker and update chart panel for Vega-Lite"
```

---

## Task 14: Rewrite Visual Spec Editor

**Files:**
- Modify: `src/components/chart/visual-spec-editor.tsx`

This is a significant rewrite. The editor directly edits Vega-Lite JSON.

**Sections:**
1. **General** — title (string), subtitle (via title.subtitle), width, height
2. **Mark** — type dropdown (bar, line, area, point, rect, rule, text, tick, arc, boxplot)
3. **Encoding** — x, y, color, size, shape, opacity. Each: field dropdown (from CSV columns), type dropdown (Q/N/O/T), aggregate dropdown, bin checkbox
4. **Layer list** — if `layer` exists, show add/remove layer buttons. Each layer is a card with mark + encoding.
5. **Facet** — row field, column field, columns (wrap count)

The editor reads/writes the JSON string via `editorValue`/`onChange` (same interface as current).

Helper to parse/update spec:
```typescript
function parseSpec(editorValue: string): Record<string, unknown> | null {
  try { return JSON.parse(editorValue); } catch { return null; }
}
function updateSpec(editorValue: string, updater: (spec: Record<string, unknown>) => void, onChange: (v: string) => void) {
  const spec = parseSpec(editorValue);
  if (!spec) return;
  const clone = structuredClone(spec);
  updater(clone);
  onChange(JSON.stringify(clone, null, 2));
}
```

**Step 1: Implement the visual editor**

Since this is a large UI component, implement it section by section. The encoding editor is the most important — it should show dropdowns for field, type, and aggregate for each channel.

**Step 2: Verify in browser**

```bash
bun dev
```

Upload a CSV, create a chart via chat, open the visual editor. Verify that:
- Mark type dropdown shows and changes the mark
- Encoding fields show CSV columns
- Type dropdown shows Q/N/O/T
- Aggregate dropdown shows none/sum/count/mean/min/max
- Changes reflect in JSON editor tab
- Apply button sends updated spec

**Step 3: Commit**

```bash
git add src/components/chart/visual-spec-editor.tsx
git commit -m "feat: rewrite visual spec editor for Vega-Lite encoding model"
```

---

## Task 15: Create Layer Editor Card

**Files:**
- Create: `src/components/chart/layer-editor-card.tsx`
- Modify: `src/components/chart/visual-spec-editor.tsx` (import + use)

**Step 1: Implement layer editor card**

Each card edits one layer within a `layer` array. Shows:
- Mark type dropdown
- Encoding channels (x, y, color, size, opacity, text, tooltip)
- Remove layer button

**Step 2: Add layer management to visual editor**

- "Add Layer" button
- Convert single spec to layered spec when adding first layer
- Remove layer converts back to single spec when only 1 layer remains

**Step 3: Commit**

```bash
git add src/components/chart/layer-editor-card.tsx src/components/chart/visual-spec-editor.tsx
git commit -m "feat: add layer editor card for multi-mark composition"
```

---

## Task 16: Delete Old mark-editor-card.tsx

**Files:**
- Delete: `src/components/chart/mark-editor-card.tsx`

Only delete after visual-spec-editor.tsx no longer imports it.

```bash
rm src/components/chart/mark-editor-card.tsx
git add -A
git commit -m "chore: delete old mark-editor-card.tsx"
```

---

## Task 17: Verify Full App Works End-to-End

**Step 1: Run lint, build, tests**

```bash
bun run lint
bun run build
bun run test
```

All must pass.

**Step 2: Manual smoke test**

```bash
bun dev
```

1. Upload `evals/data/sales.csv`
2. Type "make a bar chart of revenue by product"
3. Verify chart renders with Vega-Lite
4. Change theme to "fivethirtyeight" — verify chart re-renders with new theme
5. Open visual editor — change mark to "point" — verify scatter plot
6. Open JSON editor — edit encoding — verify live preview
7. Click Apply — verify spec sent to AI
8. Export PNG — verify download works

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: end-to-end smoke test fixes"
```

---

## Task 18: Update Eval Runner for Vega-Lite

**Files:**
- Modify: `evals/runner/bundle-entry.ts`
- Modify: `evals/runner/render.ts`
- Modify: `evals/runner/renderer-page.html`
- Modify: `evals/runner/run-case.ts`

**Step 1: Rewrite bundle-entry.ts**

```typescript
// evals/runner/bundle-entry.ts
import embed from "vega-embed";

(window as unknown as Record<string, unknown>).renderVegaLite = async (
  spec: Record<string, unknown>,
  data: Record<string, unknown>[]
) => {
  const container = document.getElementById("chart-container")!;
  container.innerHTML = "";

  // Inject data
  const fullSpec = { ...spec, data: { values: data } };

  await embed(container, fullSpec as Parameters<typeof embed>[1], {
    actions: false,
    renderer: "svg",
  });
};
```

**Step 2: Update render.ts**

Change `renderChart` to call async `window.renderVegaLite` instead of sync `window.specToPlot`:

```typescript
export async function renderChart(
  page: Page,
  spec: Record<string, unknown>,
  data: Record<string, unknown>[]
): Promise<{ png: Buffer; error?: undefined } | { png?: undefined; error: string }> {
  try {
    const evalError = await page.evaluate(
      async ([spec, data]) => {
        try {
          const fn = (window as unknown as { renderVegaLite: (s: unknown, d: unknown) => Promise<void> })
            .renderVegaLite;
          await fn(spec, data);
          return null;
        } catch (err) {
          return err instanceof Error ? err.message : String(err);
        }
      },
      [spec, data] as [unknown, unknown]
    );

    if (evalError) {
      return { error: evalError };
    }

    // Vega-Lite rendering is async, give it a moment to settle
    await page.waitForTimeout(300);

    const container = page.locator("#chart-container");
    const png = await container.screenshot({ type: "png" });
    return { png };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
```

Also update the `buildBundle` alias to remove `@/types` if no longer needed (bundle-entry.ts doesn't import from `@/types` anymore).

**Step 3: Update run-case.ts**

Update type references: `ChartSpec` is now `TopLevelSpec` from vega-lite. The tool execute and title merging logic is simpler:

```typescript
execute: async (input: { spec: Record<string, unknown>; title?: string; description?: string }) => {
  const chartSpec = input.title
    ? { ...input.spec, title: input.title }
    : input.spec;
  capturedSpec = chartSpec as ChartSpec;

  const result = await renderChart(page, chartSpec, csvData);
  // ... rest same
},
```

**Step 4: Build and test the eval bundle**

```bash
bun run eval:build
```

Expected: Bundle builds successfully with vega-embed.

**Step 5: Commit**

```bash
git add evals/runner/bundle-entry.ts evals/runner/render.ts evals/runner/run-case.ts evals/runner/renderer-page.html
git commit -m "feat: update eval runner for Vega-Lite rendering"
```

---

## Task 19: Update Eval Case Rubrics

**Files:**
- Modify: `evals/cases/*.json` (79 files)

**Step 1: Automated term mapping**

Use search-and-replace across all rubric fields:
- `barY` → `bar` (vertical bar)
- `barX` → `bar` (horizontal bar)
- `dot` → `point`
- `lineY` / `lineX` → `line`
- `areaY` / `areaX` → `area`
- `cell` → `rect`
- `rectY` / `rectX` → `bar` (histogram context)
- `tickX` / `tickY` → `tick`
- `ruleX` / `ruleY` → `rule`
- `groupX` / `groupY` → `aggregate`
- `binX` / `binY` → `bin`
- `stackY` / `stackX` → `stack`
- `melt` → `fold`
- `fx` / `fy` → `facet` / `row` / `column`
- `fill:` → `color:`
- `stroke:` → `stroke:` (same in VL)
- `tip: true` → `tooltip: true` or tooltip encoding

**Step 2: Convert decline-boxplot to positive case**

`evals/cases/decline-boxplot.json`:
- Remove `expectDecline: true`
- Update rubric: "Must use boxplot mark. x=subject (nominal), y=score (quantitative). Should show distribution."
- Update tags: remove "decline", add "boxplot"

**Step 3: Manual review of transform-heavy rubrics**

Review the ~24 cases that reference groupX/binX/stackY. Ensure rubrics describe the desired outcome, not Observable Plot implementation details.

**Step 4: Commit**

```bash
git add evals/cases/
git commit -m "feat: update eval case rubrics for Vega-Lite terminology"
```

---

## Task 20: Run Evals and Iterate

**Step 1: Run basic eval subset**

```bash
bun run eval --tag bar --tag single-turn --no-judge
```

Verify charts render without errors.

**Step 2: Run with judge**

```bash
bun run eval --tag single-turn
```

Target: scores >= 20/25 on basic chart types.

**Step 3: Iterate on system prompt and docs**

If scores are low:
1. Check failure screenshots in `evals/results/`
2. Identify patterns (wrong encoding types, missing aggregation, bad data reference)
3. Update system prompt checklist or vl-docs accordingly
4. Re-run failing cases

**Step 4: Run full eval suite**

```bash
bun run eval
```

**Step 5: Commit after stabilization**

```bash
git add -A
git commit -m "feat: stabilize system prompt and docs via eval iteration"
```

---

## Task 21: Final Verification

**Step 1: Full verification suite**

```bash
bun run lint
bun run build
bun run test
```

All must pass.

**Step 2: Manual end-to-end test**

1. Upload CSV → "make a bar chart" → renders
2. "make it horizontal" → VL spec updates
3. "add a trend line" → layered spec
4. "show as pie chart" → arc mark
5. "make a boxplot" → native boxplot
6. Change theme → re-renders with new theme
7. Visual editor → edit encoding → Apply
8. JSON editor → edit spec → live preview
9. Export PNG → downloads

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Vega-Lite v6 migration"
```
