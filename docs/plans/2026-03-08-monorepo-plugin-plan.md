# Monorepo Restructure + Claude Code Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure Chartroom into a Bun workspace monorepo with shared packages (`@chartroom/core`, `@chartroom/renderer`) and three apps (`apps/web`, `apps/eval`, `apps/plugin`), then build a Claude Code plugin that provides the full Chartroom chart-generation experience.

**Architecture:** Extract Node-compatible logic (CSV parsing, spec validation, data injection, docs, types, themes, system prompt) into `@chartroom/core`. Extract Playwright-based headless rendering into `@chartroom/renderer`. Move the web app to `apps/web/`, evals to `apps/eval/`, and build a new MCP server + skill-based Claude Code plugin at `apps/plugin/`.

**Tech Stack:** Bun workspaces, TypeScript, Vega-Lite, Playwright, MCP SDK, Vitest

---

## Phase 1: Extract `@chartroom/core`

### Task 1.1: Set up workspace root + core package skeleton

**Files:**
- Modify: `package.json` (root)
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/index.ts`

**Step 1: Create directories**

```bash
mkdir -p packages/core/src/__tests__
mkdir -p packages/core/docs
```

**Step 2: Create `packages/core/package.json`**

```json
{
  "name": "@chartroom/core",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "papaparse": "^5.5.3",
    "vega-lite": "^6.4.2",
    "vega-themes": "^3.0.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/papaparse": "^5.5.2",
    "vitest": "^4.0.18",
    "jsdom": "^28.1.0",
    "typescript": "^5"
  }
}
```

**Step 3: Create `packages/core/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["esnext"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create `packages/core/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

**Step 5: Create empty `packages/core/src/index.ts` barrel**

```typescript
// Barrel exports — will be populated as modules are extracted
```

**Step 6: Add workspace config to root `package.json`**

Add `"workspaces"` field to root package.json:
```json
{
  "workspaces": ["packages/*", "apps/*"]
}
```

**Step 7: Run `bun install` to link workspaces**

```bash
bun install
```

**Step 8: Commit**

```bash
git add packages/core/ package.json bun.lock
git commit -m "chore: set up workspace root and @chartroom/core skeleton"
```

---

### Task 1.2: Extract types to core

**Files:**
- Create: `packages/core/src/types.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Create `packages/core/src/types.ts`**

Copy from `src/types/index.ts` but replace the `vega-lite` import since core has vega-lite as a dependency:

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
  computed?: boolean;
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

export type DatasetMap = Record<string, ParsedCSV>;
```

**Step 2: Add types export to `packages/core/src/index.ts`**

```typescript
export type {
  ChartSpec,
  ThemeId,
  ColumnMeta,
  DataMetadata,
  ParsedCSV,
  DatasetMap,
} from "./types";
```

**Step 3: Verify TypeScript compiles**

```bash
cd packages/core && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts
git commit -m "feat(core): extract shared types"
```

---

### Task 1.3: Extract strip-config to core

**Files:**
- Create: `packages/core/src/strip-config.ts`
- Create: `packages/core/src/__tests__/strip-config.test.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Write the test**

Copy from `src/lib/chart/__tests__/strip-config.test.ts`, update import path:

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

  it("removes background and autosize but preserves padding", () => {
    const spec = { mark: "bar", encoding: {}, background: "white", padding: 10, autosize: "fit" };
    expect(stripStyling(spec)).toEqual({ mark: "bar", encoding: {}, padding: 10 });
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

**Step 2: Run test — should fail (module doesn't exist)**

```bash
cd packages/core && bun run test
```

Expected: FAIL

**Step 3: Create `packages/core/src/strip-config.ts`**

```typescript
const STRIP_KEYS = ["config", "$schema", "background", "autosize"] as const;

export function stripStyling(spec: Record<string, unknown>): Record<string, unknown> {
  const clone = { ...spec };
  for (const key of STRIP_KEYS) {
    delete clone[key];
  }
  return clone;
}
```

**Step 4: Add export to index.ts**

```typescript
export { stripStyling } from "./strip-config";
```

**Step 5: Run test — should pass**

```bash
cd packages/core && bun run test
```

Expected: 5 tests PASS

**Step 6: Commit**

```bash
git add packages/core/src/strip-config.ts packages/core/src/__tests__/strip-config.test.ts packages/core/src/index.ts
git commit -m "feat(core): extract strip-config with tests"
```

---

### Task 1.4: Extract inject-data to core

**Files:**
- Create: `packages/core/src/inject-data.ts`
- Create: `packages/core/src/__tests__/inject-data.test.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Write the test**

Copy from `src/lib/chart/__tests__/inject-data.test.ts`, update import to `../inject-data`.

**Step 2: Run test — should fail**

```bash
cd packages/core && bun run test
```

**Step 3: Create `packages/core/src/inject-data.ts`**

Copy verbatim from `src/lib/chart/inject-data.ts` — it has no external imports.

**Step 4: Add export to index.ts**

```typescript
export { injectData } from "./inject-data";
```

**Step 5: Run test — should pass (13 tests)**

```bash
cd packages/core && bun run test
```

**Step 6: Commit**

```bash
git add packages/core/src/inject-data.ts packages/core/src/__tests__/inject-data.test.ts packages/core/src/index.ts
git commit -m "feat(core): extract inject-data with tests"
```

---

### Task 1.5: Extract csv-parser to core

**Files:**
- Create: `packages/core/src/csv-parser.ts`
- Create: `packages/core/src/__tests__/csv-parser.test.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Write the test**

Copy from `src/lib/csv/__tests__/parser.test.ts`, update imports to `../csv-parser`.

**Step 2: Run test — should fail**

**Step 3: Create `packages/core/src/csv-parser.ts`**

Copy from `src/lib/csv/parser.ts` with these changes:
- Replace `import type { ParsedCSV, ColumnMeta, DataMetadata, DatasetMap } from "@/types"` → `import type { ParsedCSV, ColumnMeta, DataMetadata, DatasetMap } from "./types"`
- The `parseCSV(file: File)` function uses browser `File` API. Keep it for now (both web and core can use it), but also add a `parseCSVString(text: string)` variant for Node/CLI use:

```typescript
export function parseCSVString(text: string): ParsedCSV {
  const results = Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  const data = results.data as Record<string, unknown>[];
  const errors = results.errors.map((e) => `Row ${e.row}: ${e.message}`);
  const metadata = extractMetadata(data);
  return { data, metadata, errors };
}
```

**Step 4: Add exports to index.ts**

```typescript
export {
  parseCSV,
  parseCSVString,
  extractMetadata,
  metadataToContext,
  datasetsToContext,
  fileNameToDatasetName,
} from "./csv-parser";
```

**Step 5: Run test — should pass (12 tests)**

```bash
cd packages/core && bun run test
```

**Step 6: Write additional test for `parseCSVString`**

Add to the test file:

```typescript
import { parseCSVString } from "../csv-parser";

describe("parseCSVString", () => {
  it("parses CSV text with header", () => {
    const csv = "name,value\nAlice,10\nBob,20";
    const result = parseCSVString(csv);
    expect(result.data).toHaveLength(2);
    expect(result.metadata.rowCount).toBe(2);
    expect(result.metadata.columns).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("returns errors for malformed CSV", () => {
    const csv = "name,value\nAlice,10,extra\nBob,20";
    const result = parseCSVString(csv);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

**Step 7: Run test — should pass**

```bash
cd packages/core && bun run test
```

**Step 8: Write additional tests for `datasetsToContext`**

Add to the test file:

```typescript
import { datasetsToContext } from "../csv-parser";
import type { DatasetMap } from "../types";

describe("datasetsToContext", () => {
  it("returns empty string for no datasets", () => {
    expect(datasetsToContext({})).toBe("");
  });

  it("formats single dataset context", () => {
    const datasets: DatasetMap = {
      "sales.csv": {
        data: [{ product: "A", revenue: 100 }],
        metadata: extractMetadata([{ product: "A", revenue: 100 }]),
        errors: [],
      },
    };
    const ctx = datasetsToContext(datasets);
    expect(ctx).toContain("sales.csv");
    expect(ctx).toContain('{ "url": "sales.csv" }');
  });

  it("detects shared columns as join keys", () => {
    const datasets: DatasetMap = {
      "orders.csv": {
        data: [{ product_id: 1, amount: 100 }],
        metadata: extractMetadata([{ product_id: 1, amount: 100 }]),
        errors: [],
      },
      "products.csv": {
        data: [{ product_id: 1, name: "Widget" }],
        metadata: extractMetadata([{ product_id: 1, name: "Widget" }]),
        errors: [],
      },
    };
    const ctx = datasetsToContext(datasets);
    expect(ctx).toContain("product_id");
    expect(ctx).toContain("Join keys");
  });
});
```

**Step 9: Run test — should pass**

**Step 10: Commit**

```bash
git add packages/core/src/csv-parser.ts packages/core/src/__tests__/csv-parser.test.ts packages/core/src/index.ts
git commit -m "feat(core): extract csv-parser with tests"
```

---

### Task 1.6: Extract validate-spec to core

**Files:**
- Create: `packages/core/src/validate-spec.ts`
- Create: `packages/core/src/__tests__/validate-spec.test.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Write the test**

Copy from `src/lib/chart/__tests__/validate-spec.test.ts`, update import to `../validate-spec`.

Add additional tests for lint warnings:

```typescript
  it("warns about aggregate transform without 'as' alias", () => {
    const spec = {
      transform: [
        { aggregate: [{ op: "sum", field: "value" }], groupby: ["category"] },
      ],
      mark: "bar",
      encoding: {
        x: { field: "category", type: "nominal" },
        y: { field: "sum_value", type: "quantitative" },
      },
    };
    const result = validateSpec(spec, { csv: ROWS });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("missing");
  });

  it("warns about encoding referencing original field after aggregate", () => {
    const spec = {
      transform: [
        { aggregate: [{ op: "sum", field: "value", as: "total" }], groupby: ["category"] },
      ],
      mark: "bar",
      encoding: {
        x: { field: "category", type: "nominal" },
        y: { field: "value", type: "quantitative" },
      },
    };
    const result = validateSpec(spec, { csv: ROWS });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w: string) => w.includes("renamed"))).toBe(true);
  });
```

**Step 2: Run test — should fail**

**Step 3: Create `packages/core/src/validate-spec.ts`**

Copy from `src/lib/chart/validate-spec.ts`, change import:
- `import { injectData } from "./inject-data";` (instead of `"./inject-data"`)

**Step 4: Add export to index.ts**

```typescript
export { validateSpec } from "./validate-spec";
```

**Step 5: Run tests — should pass (7+ tests)**

**Step 6: Commit**

```bash
git add packages/core/src/validate-spec.ts packages/core/src/__tests__/validate-spec.test.ts packages/core/src/index.ts
git commit -m "feat(core): extract validate-spec with tests"
```

---

### Task 1.7: Extract themes to core

**Files:**
- Create: `packages/core/src/themes.ts`
- Create: `packages/core/src/__tests__/themes.test.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from "vitest";
import { getThemeConfig, DEFAULT_CONFIG } from "../themes";
import type { ThemeId } from "../types";

const ALL_THEMES: ThemeId[] = [
  "default", "dark", "excel", "fivethirtyeight", "ggplot2",
  "googlecharts", "latimes", "powerbi", "quartz", "urbaninstitute", "vox",
];

describe("getThemeConfig", () => {
  it("returns DEFAULT_CONFIG for 'default' theme", () => {
    const config = getThemeConfig("default");
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("returns a config object for every valid theme", () => {
    for (const theme of ALL_THEMES) {
      const config = getThemeConfig(theme);
      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
    }
  });

  it("dark theme has a non-white background", () => {
    const config = getThemeConfig("dark");
    expect(config.background).toBeDefined();
    expect(config.background).not.toBe("white");
  });

  it("default config has system-ui font", () => {
    expect(DEFAULT_CONFIG.font).toContain("system-ui");
  });

  it("default config has tableau10 color scheme", () => {
    const range = DEFAULT_CONFIG.range as Record<string, unknown>;
    const category = range.category as Record<string, unknown>;
    expect(category.scheme).toBe("tableau10");
  });
});
```

**Step 2: Run test — should fail**

**Step 3: Create `packages/core/src/themes.ts`**

Extract from `src/lib/chart/render-vega.ts`:

```typescript
import * as themes from "vega-themes";
import type { Config } from "vega-lite";
import type { ThemeId } from "./types";

export const DEFAULT_CONFIG: Config = {
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
    subtitlePadding: 8,
    offset: 16,
  },
  legend: {
    labelFont: "system-ui, -apple-system, sans-serif",
    titleFont: "system-ui, -apple-system, sans-serif",
  },
  range: { category: { scheme: "tableau10" } },
  view: { stroke: null },
  padding: { top: 16, bottom: 16, left: 16, right: 16 },
};

export function getThemeConfig(themeId: ThemeId): Config {
  if (themeId === "default") return DEFAULT_CONFIG;
  const themeConfig = (themes as Record<string, Config | undefined>)[themeId];
  if (!themeConfig) return DEFAULT_CONFIG;

  const t = themeConfig as Record<string, unknown>;
  const config: Config = { ...DEFAULT_CONFIG };

  if (t.range) config.range = t.range as Config["range"];
  if (t.background) config.background = t.background as string;
  if (t.style) config.style = t.style as Config["style"];
  if (t.axis) {
    const themeAxis = t.axis as Record<string, unknown>;
    config.axis = {
      ...config.axis,
      ...(themeAxis.domainColor != null && { domainColor: themeAxis.domainColor as string }),
      ...(themeAxis.gridColor != null && { gridColor: themeAxis.gridColor as string }),
      ...(themeAxis.tickColor != null && { tickColor: themeAxis.tickColor as string }),
    };
  }
  if (t.title) {
    const themeTitle = t.title as Record<string, unknown>;
    config.title = {
      ...config.title as Record<string, unknown>,
      ...(themeTitle.color != null && { color: themeTitle.color as string }),
      ...(themeTitle.subtitleColor != null && { subtitleColor: themeTitle.subtitleColor as string }),
    };
  }

  return config;
}
```

**Step 4: Add exports to index.ts**

```typescript
export { getThemeConfig, DEFAULT_CONFIG } from "./themes";
```

**Step 5: Run tests — should pass**

**Step 6: Commit**

```bash
git add packages/core/src/themes.ts packages/core/src/__tests__/themes.test.ts packages/core/src/index.ts
git commit -m "feat(core): extract themes with tests"
```

---

### Task 1.8: Extract spec-schema to core

**Files:**
- Create: `packages/core/src/spec-schema.ts`
- Create: `packages/core/src/__tests__/spec-schema.test.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from "vitest";
import { vlSpecSchema, vlUnitSchema, vlMarkSchema, encodingChannelSchema } from "../spec-schema";

describe("vlSpecSchema", () => {
  it("parses a simple bar chart spec", () => {
    const spec = {
      data: { url: "test.csv" },
      mark: "bar",
      encoding: {
        x: { field: "category", type: "nominal" },
        y: { field: "value", type: "quantitative" },
      },
    };
    expect(() => vlSpecSchema.parse(spec)).not.toThrow();
  });

  it("parses a layered spec", () => {
    const spec = {
      layer: [
        { mark: "bar", encoding: { x: { field: "a" }, y: { field: "b" } } },
        { mark: "rule", encoding: { y: { datum: 50 } } },
      ],
    };
    expect(() => vlSpecSchema.parse(spec)).not.toThrow();
  });

  it("parses spec with transforms", () => {
    const spec = {
      mark: "bar",
      transform: [
        { filter: "datum.x > 5" },
        { calculate: "datum.a + datum.b", as: "total" },
      ],
      encoding: { x: { field: "a" }, y: { field: "total" } },
    };
    expect(() => vlSpecSchema.parse(spec)).not.toThrow();
  });

  it("parses hconcat spec", () => {
    const spec = {
      hconcat: [
        { mark: "bar", encoding: { x: { field: "a" } } },
        { mark: "line", encoding: { x: { field: "b" } } },
      ],
    };
    expect(() => vlSpecSchema.parse(spec)).not.toThrow();
  });

  it("parses mark as object with type", () => {
    const spec = {
      mark: { type: "bar", tooltip: true },
      encoding: { x: { field: "a" } },
    };
    expect(() => vlSpecSchema.parse(spec)).not.toThrow();
  });

  it("parses all valid mark types as strings", () => {
    const marks = ["bar", "line", "area", "point", "rect", "rule", "text", "tick", "arc", "boxplot"];
    for (const mark of marks) {
      expect(() => vlSpecSchema.parse({ mark, encoding: {} })).not.toThrow();
    }
  });

  it("parses spec with facet", () => {
    const spec = {
      facet: { field: "category", type: "nominal" },
      spec: { mark: "bar", encoding: { x: { field: "a" }, y: { field: "b" } } },
    };
    expect(() => vlSpecSchema.parse(spec)).not.toThrow();
  });

  it("parses spec with title as string", () => {
    const spec = { mark: "bar", encoding: {}, title: "My Chart" };
    expect(() => vlSpecSchema.parse(spec)).not.toThrow();
  });

  it("parses spec with title as object", () => {
    const spec = { mark: "bar", encoding: {}, title: { text: "My Chart" } };
    expect(() => vlSpecSchema.parse(spec)).not.toThrow();
  });

  it("parses spec with width and height", () => {
    const spec = { mark: "bar", encoding: {}, width: 500, height: 300 };
    expect(() => vlSpecSchema.parse(spec)).not.toThrow();
  });

  it("parses spec with width as 'container'", () => {
    const spec = { mark: "bar", encoding: {}, width: "container" };
    expect(() => vlSpecSchema.parse(spec)).not.toThrow();
  });
});
```

**Step 2: Run test — should fail**

**Step 3: Create `packages/core/src/spec-schema.ts`**

Extract schema definitions from `src/lib/agent/tools.ts` — standalone, no AI SDK dependency:

```typescript
import { z } from "zod";

export const encodingChannelSchema = z.record(z.string(), z.unknown())
  .describe("Vega-Lite encoding channel: { field, type (quantitative/nominal/ordinal/temporal), aggregate, bin, timeUnit, scale, axis, legend, sort, stack, title, tooltip, ... }");

export const vlMarkSchema = z.union([
  z.string().describe("Mark type: bar, line, area, point, rect, rule, text, tick, arc, boxplot, errorbar, errorband, trail, square, circle"),
  z.object({ type: z.string() }).passthrough().describe("Mark with properties: { type, tooltip, opacity, ... }"),
]);

export const vlUnitSchema: z.ZodType = z.lazy(() => z.object({
  data: z.object({ url: z.string() }).optional(),
  mark: vlMarkSchema.optional(),
  encoding: z.record(z.string(), encodingChannelSchema).optional(),
  transform: z.array(z.record(z.string(), z.unknown())).optional(),
  layer: z.array(vlUnitSchema).optional(),
  title: z.union([z.string(), z.object({ text: z.string() }).passthrough()]).optional(),
  width: z.union([z.number(), z.literal("container")]).optional(),
  height: z.union([z.number(), z.literal("container")]).optional(),
}));

/**
 * Create a top-level Vega-Lite spec schema.
 * Accepts optional dataset names for the data description.
 */
export function createVlSpecSchema(datasetNames?: string[]) {
  const dataDesc = datasetNames && datasetNames.length > 0
    ? `Use { url: "<filename>" } to reference a dataset. Available: ${datasetNames.join(", ")}`
    : 'Use { url: "<filename>" } to reference the uploaded dataset';

  return z.object({
    data: z.object({ url: z.string() }).optional().describe(dataDesc),
    mark: vlMarkSchema.optional(),
    encoding: z.record(z.string(), encodingChannelSchema).optional().describe("Encoding channels: x, y, color, size, shape, opacity, theta, radius, text, tooltip, row, column, facet, detail, order"),
    transform: z.array(z.record(z.string(), z.unknown())).optional().describe("Array of transforms: filter, calculate, fold, aggregate, bin, window, lookup, flatten, pivot, regression, loess, density"),
    layer: z.array(vlUnitSchema).optional().describe("Array of layered specs (each with mark + encoding)"),
    hconcat: z.array(vlUnitSchema).optional().describe("Array of specs displayed horizontally side-by-side"),
    vconcat: z.array(vlUnitSchema).optional().describe("Array of specs stacked vertically"),
    facet: z.record(z.string(), z.unknown()).optional().describe("Facet field for small multiples"),
    repeat: z.unknown().optional().describe("Repeat spec for repeated views"),
    spec: vlUnitSchema.optional().describe("Inner spec for facet/repeat"),
    resolve: z.record(z.string(), z.unknown()).optional().describe("Resolve shared/independent scales across layers/facets"),
    title: z.union([z.string(), z.object({ text: z.string() }).passthrough()]).optional(),
    width: z.union([z.number(), z.literal("container")]).optional(),
    height: z.union([z.number(), z.literal("container")]).optional(),
  });
}

/** Default schema (no dataset names) */
export const vlSpecSchema = createVlSpecSchema();
```

**Step 4: Add exports to index.ts**

```typescript
export {
  vlSpecSchema,
  vlUnitSchema,
  vlMarkSchema,
  encodingChannelSchema,
  createVlSpecSchema,
} from "./spec-schema";
```

**Step 5: Run tests — should pass**

**Step 6: Commit**

```bash
git add packages/core/src/spec-schema.ts packages/core/src/__tests__/spec-schema.test.ts packages/core/src/index.ts
git commit -m "feat(core): extract spec-schema with tests"
```

---

### Task 1.9: Extract system-prompt to core (parameterized)

**Files:**
- Create: `packages/core/src/system-prompt.ts`
- Create: `packages/core/src/__tests__/system-prompt.test.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../system-prompt";

describe("buildSystemPrompt", () => {
  it("web context includes render_chart tool reference", () => {
    const prompt = buildSystemPrompt({ context: "web" });
    expect(prompt).toContain("render_chart");
  });

  it("plugin context includes render_chart tool reference", () => {
    const prompt = buildSystemPrompt({ context: "plugin" });
    expect(prompt).toContain("render_chart");
  });

  it("both contexts include decline list", () => {
    for (const context of ["web", "plugin"] as const) {
      const prompt = buildSystemPrompt({ context });
      expect(prompt).toContain("Funnel charts");
      expect(prompt).toContain("waterfall");
    }
  });

  it("both contexts include stacking rules", () => {
    for (const context of ["web", "plugin"] as const) {
      const prompt = buildSystemPrompt({ context });
      expect(prompt).toContain("NEVER stack");
    }
  });

  it("includes data context when provided", () => {
    const prompt = buildSystemPrompt({
      context: "web",
      dataContext: "Dataset: 100 rows, 3 columns",
    });
    expect(prompt).toContain("100 rows");
  });

  it("shows no-data message when no data context", () => {
    const prompt = buildSystemPrompt({ context: "web" });
    expect(prompt).toContain("No dataset loaded");
  });

  it("plugin context includes file-based instructions", () => {
    const prompt = buildSystemPrompt({ context: "plugin" });
    expect(prompt).toContain("load_csv");
  });
});
```

**Step 2: Run test — should fail**

**Step 3: Create `packages/core/src/system-prompt.ts`**

Refactor from `src/lib/agent/system-prompt.ts` to accept a context parameter:

```typescript
export interface SystemPromptOptions {
  context: "web" | "plugin";
  dataContext?: string;
}

export function buildSystemPrompt(options: SystemPromptOptions): string {
  const { context, dataContext } = options;

  const identity = context === "web"
    ? "You are Chartroom, a data visualization assistant that creates charts using Vega-Lite v6."
    : "You are a data visualization assistant that creates charts using Vega-Lite v6.";

  const toolInstructions = context === "web"
    ? "You MUST call tools to complete any chart request. Never respond with only text — always call `lookup_docs` first, then `render_chart`."
    : "You MUST call tools to complete any chart request. Use `load_csv` to load data, read the Vega-Lite reference docs, then call `render_chart`.";

  const workflow = context === "web"
    ? `## Your workflow
0. **Check the decline list below** — before calling any tools, check if the user's request matches the unsupported chart types list. For unsupported chart types, explain the limitation and render the suggested alternative. For unsupported capabilities, decline in text only.
1. **Look up docs** — call \`lookup_docs\` for the relevant mark type(s) and any transforms/scales you plan to use. Don't guess at encoding options.
2. Look up \`pre-render-checklist\`, then use \`render_chart\` to create the chart
3. After rendering, you'll receive a screenshot — evaluate it for correctness and aesthetics
4. If the chart needs improvement, look up docs again if needed, then call \`render_chart\` with a refined spec
5. If the chart looks good, describe what you created to the user`
    : `## Your workflow
0. **Check the decline list below** — before calling any tools, check if the user's request matches the unsupported chart types list. For unsupported chart types, explain the limitation and render the suggested alternative. For unsupported capabilities, decline in text only.
1. **Load data** — call \`load_csv\` to load the CSV file(s). Read the metadata to understand columns and types.
2. **Read docs** — read the relevant Vega-Lite reference docs for the mark type(s) and any transforms/scales you plan to use.
3. Read the pre-render checklist, then use \`render_chart\` to create the chart
4. After rendering, read the PNG file to evaluate the chart for correctness and aesthetics
5. If the chart needs improvement, read more docs if needed, then call \`render_chart\` with a refined spec
6. If the chart looks good, describe what you created to the user`;

  const docLookup = context === "web"
    ? `## Documentation lookup
Call \`lookup_docs\` before creating any chart. Look up:
1. The mark type(s) you plan to use (bar, line, area, point, arc, rect, etc.)
2. Any transforms needed (aggregate, fold, filter, calculate, lookup)
3. Any layout or composition pattern (layout-patterns, composite-patterns, layer, facet, repeat, concat)
Do not guess at encoding options — always check the docs first.`
    : `## Documentation lookup
Read the relevant reference docs before creating any chart. Look up:
1. The mark type(s) you plan to use (bar, line, area, point, arc, rect, etc.)
2. Any transforms needed (aggregate, fold, filter, calculate, lookup)
3. Any layout or composition pattern (layout-patterns, composite-patterns, layer, facet, repeat, concat)
Do not guess at encoding options — always check the docs first.`;

  const parts = [
    `${identity}
${toolInstructions}

## Communication style
Be concise. State what the chart shows; do not explain specs, list changes, or narrate your process. When iterating, state only what you fixed.

${workflow}

## MANDATORY — decline unsupported chart types
If the request matches ANY item below, you MUST explain that the exact chart type is not supported and offer the listed alternative. Then render the alternative chart.

- **Funnel charts, waterfall charts** — Explain limitation, then render sorted horizontal bar chart.
- **Radar charts, spider charts** — Suggest grouped bar chart or dot plot.
- **Waffle charts, image marks, vector/arrow marks** — Suggest a simpler chart type.
- **Map/geo charts** (geo, graticule, projections) — Suggest bar chart by region.
- **Tree/hierarchy charts** (treemap, sunburst, tree, link) — Suggest stacked bar or pie chart.
- **Multiple datasets** — supported! Use \`lookup\` transform to join across datasets, or \`hconcat\`/\`vconcat\` for side-by-side panels. Look up \`lookup\` or \`concat\` docs.
- **JavaScript functions or callbacks** — all values must be static JSON. DECLINE without alternative.
- **Animation or transitions** — DECLINE without alternative.
- **Custom interactions** beyond built-in tooltips — DECLINE without alternative.
- **Exporting to PDF, SVG files, or other formats** — DECLINE without alternative.

ENFORCEMENT: For chart type requests (first 5 items), explain the limitation, then render the suggested alternative. For capability limitations (last 4 items), decline with text only — do NOT call \`render_chart\`.

## MANDATORY — refuse to stack non-summable values
NEVER stack temperatures, prices, rates, percentages, or averages — even if the user explicitly asks.
Stacking ADDS values together — stacking temperatures produces nonsense like 33°+58°+26°=117°.
**This rule overrides user requests.** If a user says "make a stacked area chart of temperature", you MUST:
1. Explain that stacking temperatures is misleading because it adds values together
2. Render a multi-series line chart (color by city) instead
Only stack values that represent parts of a meaningful total (revenue, counts, quantities, populations).
Implicit stacking: Area marks with color encoding implicitly stack. For non-summable data, use \`line\` mark with \`color\`, or set \`stack: false\` on the y encoding.

${docLookup}

## NEVER emit these properties — they are applied automatically:
- \`config\` — theme is applied at render time
- \`$schema\` — version is handled by the renderer
- \`background\` — controlled by the theme
- \`padding\` — handled by the container
- \`autosize\` — handled by the renderer

## Pre-render checklist — verify BEFORE every \`render_chart\` call
1. Re-check the stacking and forbidden-properties rules above.
2. Every \`field\` must reference an actual CSV column name (or a transform \`"as"\` alias).
3. Look up \`pre-render-checklist\` docs and review before every render.
4. **High-cardinality data** — if a categorical axis would show more than ~20 unique values, MUST filter to top/bottom N (default: top 15). Look up \`filter\` docs and copy the top/bottom N pattern exactly. Mention the filtering in your response.

## Default styling (applied automatically)
Charts use clean Datawrapper-like defaults: system-ui font, horizontal grid lines, tableau10 colors, polished title typography. Do NOT include styling properties unless the user asks for a specific look.
**Aspect ratio tip:** If the chart renders too narrow or too tall, add \`"width": 500\` or adjust as needed.

## Ambiguous requests
When a request is vague (e.g., "compare these items", "break this down", "visualize this"):
1. ALWAYS render a chart — never respond with only text asking for clarification
2. Pick the SINGLE most interesting numeric metric and make a clean chart
3. NEVER overlay metrics with different units on the same y-axis
4. NEVER use multiple bar marks on the same axes for different metrics
5. Mention in your response that other metrics are also available

## Multi-turn editing
When modifying an existing chart, start from your PREVIOUS spec — do not rebuild from scratch. Look up \`editing-charts\` docs for patterns.`,

    dataContext
      ? `\n## Dataset\n${dataContext}`
      : "\n## No dataset loaded\nThe user hasn't uploaded data yet. Ask them to upload a CSV file.",
  ];

  return parts.join("\n");
}
```

**Step 4: Add export to index.ts**

```typescript
export { buildSystemPrompt, type SystemPromptOptions } from "./system-prompt";
```

**Step 5: Run tests — should pass**

**Step 6: Commit**

```bash
git add packages/core/src/system-prompt.ts packages/core/src/__tests__/system-prompt.test.ts packages/core/src/index.ts
git commit -m "feat(core): extract parameterized system-prompt with tests"
```

---

### Task 1.10: Convert vl-docs to markdown files

**Files:**
- Create: `packages/core/docs/bar.md`, `line.md`, `area.md`, etc. (one per topic)
- Create: `packages/core/src/docs.ts` (loader utility)
- Modify: `packages/core/src/index.ts`

**Step 1: Create a script to convert vl-docs.ts to markdown files**

Write a temporary conversion script that reads `src/lib/docs/vl-docs.ts`, extracts each DocChunk, and writes to `packages/core/docs/<topic-id>.md`:

```bash
# This is a one-time conversion script
bun -e "
const fs = require('fs');
const path = require('path');
// We'll import the docs module directly
"
```

Actually, the simplest approach: create `packages/core/src/docs.ts` that re-exports the docs data, and copy `vl-docs.ts` as-is into core (renaming the import). The markdown file split can happen later if needed. For now, keeping it as a TS file is simpler and the skill reference docs can be generated from it.

**Step 1 (revised): Create `packages/core/src/docs.ts`**

Copy from `src/lib/docs/vl-docs.ts` verbatim — it has no external imports:

```typescript
// Copy the entire contents of src/lib/docs/vl-docs.ts
// No imports need changing — it's a self-contained data file
```

**Step 2: Add export to index.ts**

```typescript
export { TOPIC_IDS, lookupDocs, type TopicId } from "./docs";
```

**Step 3: Verify compilation**

```bash
cd packages/core && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add packages/core/src/docs.ts packages/core/src/index.ts
git commit -m "feat(core): extract vega-lite docs corpus"
```

---

### Task 1.11: Run full core test suite

**Step 1: Run all tests**

```bash
cd packages/core && bun run test
```

Expected: All tests pass (35+ tests across 6 test files)

**Step 2: Run type check**

```bash
cd packages/core && npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit (if any fixes needed)**

---

## Phase 2: Extract `@chartroom/renderer`

### Task 2.1: Create renderer package

**Files:**
- Create: `packages/renderer/package.json`
- Create: `packages/renderer/tsconfig.json`
- Create: `packages/renderer/src/index.ts`
- Create: `packages/renderer/src/renderer.ts`
- Create: `packages/renderer/src/bundle-entry.ts`
- Create: `packages/renderer/src/renderer-page.html`
- Create: `packages/renderer/src/build-bundle.ts`

**Step 1: Create directory structure**

```bash
mkdir -p packages/renderer/src
```

**Step 2: Create `packages/renderer/package.json`**

```json
{
  "name": "@chartroom/renderer",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build:bundle": "bun src/build-bundle.ts"
  },
  "dependencies": {
    "@chartroom/core": "workspace:*",
    "playwright": "^1.58.2",
    "esbuild": "^0.27.3",
    "vega-embed": "^7.1.0"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

**Step 3: Create `packages/renderer/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["esnext"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create `packages/renderer/src/renderer-page.html`**

Copy from `evals/runner/renderer-page.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; background: white; }
    #chart-container { padding: 24px; display: inline-block; }
  </style>
</head>
<body>
  <div id="chart-container"></div>
  <script src="./bundle/renderer.js"></script>
</body>
</html>
```

**Step 5: Create `packages/renderer/src/bundle-entry.ts`**

Adapted from `evals/runner/bundle-entry.ts` — imports from `@chartroom/core`:

```typescript
import embed from "vega-embed";
import { stripStyling, injectData, getThemeConfig } from "@chartroom/core";

(window as unknown as Record<string, unknown>).renderVegaLite = async (
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>,
  themeId: string = "default"
) => {
  const container = document.getElementById("chart-container")!;
  container.innerHTML = "";

  const cleaned = stripStyling(spec);
  const withData = injectData(cleaned, datasets);
  const config = getThemeConfig(themeId as Parameters<typeof getThemeConfig>[0]);

  await embed(container, withData as Parameters<typeof embed>[1], {
    config,
    actions: false,
    renderer: "svg",
  });
};
```

**Step 6: Create `packages/renderer/src/build-bundle.ts`**

Adapted from the bundle-building logic in `evals/runner/render.ts`:

```typescript
import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_PATH = path.resolve(__dirname, "bundle/renderer.js");

export async function buildBundle(): Promise<void> {
  console.log("Building vega-embed bundle for browser...");
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, "bundle-entry.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    outfile: BUNDLE_PATH,
  });
  console.log("Bundle built successfully.");
}

// Allow running as standalone script
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("build-bundle.ts")) {
  buildBundle()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
```

**Step 7: Create `packages/renderer/src/renderer.ts`**

Adapted from `evals/runner/render.ts`:

```typescript
import { chromium, type Browser, type Page } from "playwright";
import * as esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_PATH = path.resolve(__dirname, "bundle/renderer.js");
const HTML_PAGE = path.resolve(__dirname, "renderer-page.html");

export async function buildBundle(): Promise<void> {
  console.log("Building vega-embed bundle for browser...");
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, "bundle-entry.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    outfile: BUNDLE_PATH,
  });
  console.log("Bundle built successfully.");
}

function bundleIsStale(): boolean {
  if (!fs.existsSync(BUNDLE_PATH)) return true;
  const bundleMtime = fs.statSync(BUNDLE_PATH).mtimeMs;
  const srcFiles = [
    path.resolve(__dirname, "bundle-entry.ts"),
    path.resolve(__dirname, "renderer-page.html"),
  ];
  for (const file of srcFiles) {
    if (fs.existsSync(file) && fs.statSync(file).mtimeMs > bundleMtime) return true;
  }
  return false;
}

export async function initRenderer(pageCount = 1): Promise<{ browser: Browser; pages: Page[] }> {
  if (bundleIsStale()) {
    await buildBundle();
  }
  const browser = await chromium.launch();
  const pages = await Promise.all(
    Array.from({ length: pageCount }, async () => {
      const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
      await page.goto(`file://${HTML_PAGE}`);
      return page;
    })
  );
  return { browser, pages };
}

export async function renderChart(
  page: Page,
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>,
  themeId: string = "default"
): Promise<{ png: Buffer; warnings: string[]; error?: undefined } | { png?: undefined; warnings?: undefined; error: string }> {
  try {
    const warnings: string[] = [];
    const onConsole = (msg: import("playwright").ConsoleMessage) => {
      if (msg.type() === "warning") {
        warnings.push(msg.text());
      }
    };
    page.on("console", onConsole);

    const evalError = await page.evaluate(
      ([spec, datasets, themeId]) => {
        const fn = (window as unknown as {
          renderVegaLite: (s: unknown, d: unknown, t?: string) => Promise<void>;
        }).renderVegaLite;
        return fn(spec, datasets, themeId).then(() => null).catch((err: unknown) =>
          err instanceof Error ? err.message : String(err)
        );
      },
      [spec, datasets, themeId] as [unknown, unknown, string]
    );

    await page.waitForTimeout(300);
    page.off("console", onConsole);

    if (evalError) {
      return { error: evalError };
    }

    const container = page.locator("#chart-container");
    const box = await container.boundingBox();
    if (box) {
      const width = Math.ceil(box.x + box.width);
      const height = Math.ceil(box.y + box.height);
      await page.setViewportSize({ width, height });
    }
    const png = await container.screenshot({ type: "png" });
    return { png, warnings };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function closeRenderer(browser: Browser): Promise<void> {
  await browser.close();
}
```

**Step 8: Create `packages/renderer/src/index.ts`**

```typescript
export { initRenderer, renderChart, closeRenderer, buildBundle } from "./renderer";
```

**Step 9: Run `bun install` to link workspace packages**

```bash
bun install
```

**Step 10: Build the bundle to verify it works**

```bash
cd packages/renderer && bun run build:bundle
```

**Step 11: Commit**

```bash
git add packages/renderer/
git commit -m "feat(renderer): extract Playwright-based headless renderer"
```

---

## Phase 3: Move Web App to `apps/web/`

### Task 3.1: Move files to apps/web

**Step 1: Create apps/web directory and move files**

```bash
mkdir -p apps/web
# Move web app files
mv src apps/web/
mv public apps/web/
mv next.config.ts apps/web/
mv postcss.config.mjs apps/web/
mv next-env.d.ts apps/web/
mv .env.local apps/web/ 2>/dev/null || true
mv .env.example apps/web/ 2>/dev/null || true
```

**Step 2: Create `apps/web/package.json`**

```json
{
  "name": "@chartroom/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@chartroom/core": "workspace:*",
    "@ai-sdk/react": "^3.0.110",
    "@codemirror/lang-json": "^6.0.2",
    "@openrouter/ai-sdk-provider": "^2.2.3",
    "@uiw/react-codemirror": "^4.25.7",
    "ai": "^6.0.108",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "d3": "^7.9.0",
    "lucide-react": "^0.576.0",
    "next": "16.1.6",
    "papaparse": "^5.5.3",
    "radix-ui": "^1.4.3",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "tailwind-merge": "^3.5.0",
    "vega": "^6.2.0",
    "vega-embed": "^7.1.0",
    "vega-lite": "^6.4.2",
    "vega-themes": "^3.0.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/d3": "^7.4.3",
    "@types/node": "^20",
    "@types/papaparse": "^5.5.2",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "jsdom": "^28.1.0",
    "shadcn": "^3.8.5",
    "tailwindcss": "^4",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5",
    "vitest": "^4.0.18"
  }
}
```

**Step 3: Move and update `tsconfig.json`**

Copy existing tsconfig to `apps/web/tsconfig.json` (paths stay the same since `@/*` → `./src/*` is relative).

**Step 4: Move `vitest.config.ts`**

```bash
mv vitest.config.ts apps/web/vitest.config.ts
```

**Step 5: Commit the move**

```bash
git add -A
git commit -m "refactor: move web app to apps/web/"
```

---

### Task 3.2: Update web app imports to use @chartroom/core

**Files to modify in `apps/web/src/`:**

The key changes:
1. Files that import from `@/types` → import shared types from `@chartroom/core`
2. Files that import from `@/lib/csv/parser` → keep importing locally (the local parser.ts will re-export from core or stay as-is since it uses browser File API)
3. `tools.ts` → import `createVlSpecSchema` from `@chartroom/core` instead of defining schemas inline
4. `system-prompt.ts` → import `buildSystemPrompt` from `@chartroom/core`
5. `render-vega.ts` → import `getThemeConfig` from `@chartroom/core` instead of defining locally
6. `inject-data.ts`, `strip-config.ts`, `validate-spec.ts` → these files in web can become thin re-exports from `@chartroom/core`, OR the imports in consuming files can change directly to `@chartroom/core`

**Step 1: Update `apps/web/src/lib/agent/tools.ts`**

Replace the schema definitions with imports from core:

```typescript
import { tool } from "ai";
import { z } from "zod";
import { TOPIC_IDS, lookupDocs, type TopicId, createVlSpecSchema, vlUnitSchema } from "@chartroom/core";

export function createTools(datasets: Record<string, Record<string, unknown>[]>) {
  const datasetNames = Object.keys(datasets);
  const vlSpecSchema = createVlSpecSchema(datasetNames);

  return {
    render_chart: tool({
      description:
        "Render a chart using Vega-Lite. The chart will be displayed to the user and a screenshot will be returned for you to evaluate. Always use this tool to create or update charts.",
      inputSchema: z.object({
        spec: vlSpecSchema.describe("The Vega-Lite chart specification"),
        title: z.string().optional().describe("Chart title"),
        description: z.string().optional().describe("Brief description of the chart for the user"),
      }),
    }),

    lookup_docs: tool({
      description:
        "Look up Vega-Lite documentation for specific topics. " +
        "Use when you need details about a mark type, encoding, transform, or composition. " +
        "Available topics: " +
        "bar, line, area, point, rect, rule, text, tick, arc, boxplot, " +
        "encoding (channels and types), aggregate (aggregate/bin/timeUnit), " +
        "stack, fold (wide-to-long reshape), filter (includes top/bottom N with window), calculate, " +
        "lookup (cross-dataset joins), " +
        "layer (multi-mark), facet (small multiples), repeat, concat (hconcat/vconcat side-by-side panels), " +
        "color-scale, position-scales, styling, " +
        "layout-patterns (stacked/grouped/horizontal), composite-patterns (lollipop/pareto/dual-axis/trend-line), editing-charts",
      inputSchema: z.object({
        topics: z
          .array(z.string())
          .min(1)
          .max(3)
          .describe("Topic(s) to look up, max 3. Valid: " + TOPIC_IDS.join(", ")),
      }),
      execute: async ({ topics }) => {
        const validSet = new Set<string>(TOPIC_IDS);
        const valid = topics.filter((t) => validSet.has(t)) as TopicId[];
        const invalid = topics.filter((t) => !validSet.has(t));
        const parts: string[] = [];
        if (invalid.length > 0) {
          parts.push(`Unknown topic(s): ${invalid.join(", ")}. Valid topics: ${TOPIC_IDS.join(", ")}`);
        }
        if (valid.length > 0) {
          parts.push(lookupDocs(valid));
        }
        return { documentation: parts.join("\n\n---\n\n") };
      },
    }),
  };
}
```

**Step 2: Update `apps/web/src/lib/agent/system-prompt.ts`**

```typescript
import { buildSystemPrompt as coreBuildSystemPrompt } from "@chartroom/core";

export function buildSystemPrompt(dataContext: string | undefined): string {
  return coreBuildSystemPrompt({ context: "web", dataContext });
}
```

**Step 3: Update `apps/web/src/lib/chart/render-vega.ts`**

Replace the local `getThemeConfig` and `DEFAULT_CONFIG` with imports from core:

```typescript
import embed, { type Result } from "vega-embed";
import type { ThemeId } from "@chartroom/core";
import { injectData, stripStyling, getThemeConfig } from "@chartroom/core";

export async function renderVegaLite(
  container: HTMLElement,
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>,
  themeId: ThemeId = "default"
): Promise<Result> {
  const cleaned = stripStyling(spec);
  const withData = injectData(cleaned, datasets);
  const withDefaults = {
    width: 500,
    height: 300,
    ...withData,
  };
  const config = getThemeConfig(themeId);

  const result = await embed(container, withDefaults as Parameters<typeof embed>[1], {
    config,
    actions: false,
    renderer: "svg",
  });

  return result;
}
```

**Step 4: Update `apps/web/src/types/index.ts`**

Re-export from core:

```typescript
export type {
  ChartSpec,
  ThemeId,
  ColumnMeta,
  DataMetadata,
  ParsedCSV,
  DatasetMap,
} from "@chartroom/core";
```

**Step 5: Update validate-spec import in route.ts or wherever it's used**

Any file importing `@/lib/chart/validate-spec` can either:
- Keep importing locally (the file can re-export from core), or
- Import directly from `@chartroom/core`

The simplest: make `apps/web/src/lib/chart/validate-spec.ts` a re-export:

```typescript
export { validateSpec } from "@chartroom/core";
```

Similarly for `apps/web/src/lib/chart/inject-data.ts`:

```typescript
export { injectData } from "@chartroom/core";
```

And `apps/web/src/lib/chart/strip-config.ts`:

```typescript
export { stripStyling } from "@chartroom/core";
```

And `apps/web/src/lib/docs/vl-docs.ts`:

```typescript
export { TOPIC_IDS, lookupDocs, type TopicId } from "@chartroom/core";
```

**Step 6: Run bun install, build, test, lint**

```bash
bun install
cd apps/web && bun run build
cd apps/web && bun run test
cd apps/web && bun run lint
```

All should pass.

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor(web): update imports to use @chartroom/core"
```

---

### Task 3.3: Update root package.json scripts

**Step 1: Update root `package.json`**

```json
{
  "name": "chartroom",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "dev": "bun --filter @chartroom/web dev",
    "build": "bun --filter @chartroom/web build",
    "lint": "bun --filter @chartroom/web lint",
    "test": "bun --filter '*' test",
    "eval": "bun --filter @chartroom/eval eval"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

**Step 2: Verify root commands work**

```bash
bun run build
bun run test
bun run lint
```

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: update root scripts for monorepo"
```

---

## Phase 4: Move Evals to `apps/eval/`

### Task 4.1: Move eval files

**Step 1: Create directory structure**

```bash
mkdir -p apps/eval/src
```

**Step 2: Move files**

```bash
mv evals/cases apps/eval/
mv evals/data apps/eval/
mv evals/runner/index.ts apps/eval/src/
mv evals/runner/run-case.ts apps/eval/src/
mv evals/runner/judge.ts apps/eval/src/
mv evals/runner/report.ts apps/eval/src/
mv evals/runner/types.ts apps/eval/src/
```

Note: `render.ts` and `bundle-entry.ts` are NOT moved — they're now in `@chartroom/renderer`.

**Step 3: Create `apps/eval/package.json`**

```json
{
  "name": "@chartroom/eval",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "eval": "bun src/index.ts"
  },
  "dependencies": {
    "@chartroom/core": "workspace:*",
    "@chartroom/renderer": "workspace:*",
    "@openrouter/ai-sdk-provider": "^2.2.3",
    "ai": "^6.0.108",
    "papaparse": "^5.5.3",
    "playwright": "^1.58.2"
  },
  "devDependencies": {
    "@types/papaparse": "^5.5.2",
    "typescript": "^5"
  }
}
```

**Step 4: Create `apps/eval/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["esnext"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 5: Update imports in eval files**

`apps/eval/src/types.ts`:
```typescript
import type { ChartSpec } from "@chartroom/core";
// rest unchanged
```

`apps/eval/src/run-case.ts` — update imports:
```typescript
import { generateText, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { buildSystemPrompt, extractMetadata, datasetsToContext, validateSpec, type DatasetMap, type ChartSpec } from "@chartroom/core";
import { renderChart } from "@chartroom/renderer";
// createTools stays imported from web or needs to be duplicated/extracted
// Actually, createTools uses AI SDK's tool() — it should stay in each app
// For eval, we need a local createTools or import from web
```

This is a tricky dependency — `createTools` uses AI SDK `tool()` function. Options:
1. Import from `@chartroom/web` (creates circular workspace dep)
2. Duplicate in eval (small amount of code)
3. Extract to core without the `tool()` wrapper

Best option: **duplicate in eval** since it's small and eval needs custom `execute` functions anyway. The schema comes from `@chartroom/core`.

Update `apps/eval/src/run-case.ts`:
- Import `createVlSpecSchema`, `TOPIC_IDS`, `lookupDocs` from `@chartroom/core`
- Import `renderChart` from `@chartroom/renderer`
- Define `createTools` locally (or import from a local `tools.ts`)
- Replace `../../src/lib/agent/` imports → `@chartroom/core`
- Replace `../../src/types` imports → `@chartroom/core`
- Replace `./render` import → `@chartroom/renderer`

`apps/eval/src/index.ts` — update imports:
- Replace `../../src/lib/agent/models` → local copy or inline (it's 15 lines of config)
- Replace `./render` → `@chartroom/renderer`

**Step 6: Clean up old evals directory**

```bash
rm -rf evals/runner
# Keep evals/results if any, or move to apps/eval/results
mv evals/results apps/eval/ 2>/dev/null || true
rmdir evals 2>/dev/null || true
```

**Step 7: Run bun install**

```bash
bun install
```

**Step 8: Verify eval runs**

```bash
bun run eval -- --case bar-chart-basic --no-judge
```

(Requires OPENROUTER_API_KEY — if not available, just verify TypeScript compiles)

**Step 9: Commit**

```bash
git add -A
git commit -m "refactor: move evals to apps/eval/"
```

---

## Phase 5: Build Claude Code Plugin

### Task 5.1: Create plugin package skeleton

**Files:**
- Create: `apps/plugin/package.json`
- Create: `apps/plugin/tsconfig.json`
- Create: `apps/plugin/src/server.ts`

**Step 1: Create directory structure**

```bash
mkdir -p apps/plugin/src/tools
mkdir -p apps/plugin/skills/chart
```

**Step 2: Create `apps/plugin/package.json`**

```json
{
  "name": "@chartroom/plugin",
  "version": "0.1.0",
  "private": true,
  "main": "src/server.ts",
  "scripts": {
    "start": "bun src/server.ts",
    "build:bundle": "bun run --cwd ../../packages/renderer build:bundle"
  },
  "dependencies": {
    "@chartroom/core": "workspace:*",
    "@chartroom/renderer": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.12.1"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

**Step 3: Create `apps/plugin/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["esnext"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create MCP server skeleton `apps/plugin/src/server.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { ParsedCSV, DatasetMap } from "@chartroom/core";
import { registerLoadCsv } from "./tools/load-csv";
import { registerValidateChart } from "./tools/validate-chart";
import { registerRenderChart } from "./tools/render-chart";
import { registerOpenInteractive } from "./tools/open-interactive";

// In-memory state
const datasets: DatasetMap = {};

const server = new McpServer({
  name: "chartroom",
  version: "0.1.0",
});

registerLoadCsv(server, datasets);
registerValidateChart(server, datasets);
registerRenderChart(server, datasets);
registerOpenInteractive(server, datasets);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Step 5: Run `bun install`**

```bash
bun install
```

**Step 6: Commit**

```bash
git add apps/plugin/
git commit -m "feat(plugin): create MCP server skeleton"
```

---

### Task 5.2: Implement load_csv tool

**Files:**
- Create: `apps/plugin/src/tools/load-csv.ts`

**Step 1: Create the tool**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import { parseCSVString, metadataToContext, datasetsToContext, type DatasetMap, type ParsedCSV } from "@chartroom/core";

export function registerLoadCsv(server: McpServer, datasets: DatasetMap) {
  server.tool(
    "load_csv",
    "Load and parse a CSV file. Returns column metadata (names, types, sample values). Supports loading multiple CSVs.",
    { path: z.string().describe("Path to the CSV file (absolute or relative)") },
    async ({ path: csvPath }) => {
      try {
        const text = fs.readFileSync(csvPath, "utf8");
        const parsed = parseCSVString(text);
        const name = csvPath.split("/").pop() ?? csvPath;
        datasets[name] = parsed;

        const context = Object.keys(datasets).length > 1
          ? datasetsToContext(datasets)
          : `Dataset "${name}" (reference with \`{ "url": "${name}" }\`):\n${metadataToContext(parsed.metadata)}`;

        return { content: [{ type: "text" as const, text: context }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error loading CSV: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
```

**Step 2: Commit**

```bash
git add apps/plugin/src/tools/load-csv.ts
git commit -m "feat(plugin): implement load_csv MCP tool"
```

---

### Task 5.3: Implement validate_chart tool

**Files:**
- Create: `apps/plugin/src/tools/validate-chart.ts`

**Step 1: Create the tool**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateSpec, type DatasetMap } from "@chartroom/core";

export function registerValidateChart(server: McpServer, datasets: DatasetMap) {
  server.tool(
    "validate_chart",
    "Validate a Vega-Lite spec against the compiler. Returns errors or warnings.",
    { spec: z.record(z.string(), z.unknown()).describe("Vega-Lite chart specification as JSON") },
    async ({ spec }) => {
      const dataRows: Record<string, Record<string, unknown>[]> = {};
      for (const [name, parsed] of Object.entries(datasets)) {
        dataRows[name] = parsed.data;
      }

      const result = validateSpec(spec, dataRows);

      if (result.valid) {
        const msg = result.warnings.length > 0
          ? `Spec is valid with warnings:\n${result.warnings.map(w => `- ${w}`).join("\n")}`
          : "Spec is valid.";
        return { content: [{ type: "text" as const, text: msg }] };
      }

      return {
        content: [{ type: "text" as const, text: `Spec is invalid: ${result.error}` }],
        isError: true,
      };
    }
  );
}
```

**Step 2: Commit**

```bash
git add apps/plugin/src/tools/validate-chart.ts
git commit -m "feat(plugin): implement validate_chart MCP tool"
```

---

### Task 5.4: Implement render_chart tool

**Files:**
- Create: `apps/plugin/src/tools/render-chart.ts`

**Step 1: Create the tool**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { type DatasetMap, type ThemeId } from "@chartroom/core";
import { initRenderer, renderChart as rendererRenderChart, closeRenderer } from "@chartroom/renderer";
import type { Browser, Page } from "playwright";

let browser: Browser | null = null;
let page: Page | null = null;

async function getPage(): Promise<Page> {
  if (!page || !browser) {
    const result = await initRenderer(1);
    browser = result.browser;
    page = result.pages[0];
  }
  return page;
}

// Cleanup on process exit
process.on("exit", () => {
  if (browser) browser.close().catch(() => {});
});

export function registerRenderChart(server: McpServer, datasets: DatasetMap) {
  server.tool(
    "render_chart",
    "Render a Vega-Lite spec to a PNG image. Returns the file path of the saved image.",
    {
      spec: z.record(z.string(), z.unknown()).describe("Vega-Lite chart specification"),
      theme: z.string().optional().describe("Theme ID (default, dark, excel, fivethirtyeight, ggplot2, googlecharts, latimes, powerbi, quartz, urbaninstitute, vox)"),
      outputPath: z.string().optional().describe("Custom output path for the PNG file"),
    },
    async ({ spec, theme, outputPath }) => {
      try {
        const p = await getPage();
        const dataRows: Record<string, Record<string, unknown>[]> = {};
        for (const [name, parsed] of Object.entries(datasets)) {
          dataRows[name] = parsed.data;
        }

        const result = await rendererRenderChart(p, spec, dataRows, theme ?? "default");

        if (result.error) {
          return {
            content: [{ type: "text" as const, text: `Render error: ${result.error}` }],
            isError: true,
          };
        }

        // Save PNG
        const tmpDir = "/tmp/chartroom";
        fs.mkdirSync(tmpDir, { recursive: true });
        const filePath = outputPath ?? path.join(tmpDir, `chart-${Date.now()}.png`);
        fs.writeFileSync(filePath, result.png);

        const warningText = result.warnings.length > 0
          ? `\nWarnings:\n${result.warnings.map(w => `- ${w}`).join("\n")}`
          : "";

        return {
          content: [{ type: "text" as const, text: `Chart rendered and saved to: ${filePath}${warningText}\n\nUse the Read tool to view the image and evaluate it.` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
```

**Step 2: Commit**

```bash
git add apps/plugin/src/tools/render-chart.ts
git commit -m "feat(plugin): implement render_chart MCP tool"
```

---

### Task 5.5: Implement open_interactive tool

**Files:**
- Create: `apps/plugin/src/tools/open-interactive.ts`

**Step 1: Create the tool**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { injectData, stripStyling, getThemeConfig, type DatasetMap, type ThemeId } from "@chartroom/core";

function openInBrowser(filePath: string) {
  const cmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "start"
    : "xdg-open";
  exec(`${cmd} "${filePath}"`);
}

export function registerOpenInteractive(server: McpServer, datasets: DatasetMap) {
  server.tool(
    "open_interactive",
    "Open the chart interactively in the user's default browser with hover tooltips and panning.",
    {
      spec: z.record(z.string(), z.unknown()).describe("Vega-Lite chart specification"),
      theme: z.string().optional().describe("Theme ID"),
    },
    async ({ spec, theme }) => {
      try {
        const dataRows: Record<string, Record<string, unknown>[]> = {};
        for (const [name, parsed] of Object.entries(datasets)) {
          dataRows[name] = parsed.data;
        }

        const cleaned = stripStyling(spec);
        const withData = injectData(cleaned, dataRows);
        const themeId = (theme ?? "default") as ThemeId;
        const config = getThemeConfig(themeId);

        const fullSpec = { width: 600, height: 400, ...withData };

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chartroom — Interactive View</title>
  <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
  <style>
    body { margin: 0; display: flex; justify-content: center; padding: 32px; background: #fafafa; font-family: system-ui; }
    #chart { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>
    vegaEmbed('#chart', ${JSON.stringify(fullSpec)}, {
      config: ${JSON.stringify(config)},
      renderer: 'svg'
    });
  </script>
</body>
</html>`;

        const tmpDir = "/tmp/chartroom";
        fs.mkdirSync(tmpDir, { recursive: true });
        const filePath = path.join(tmpDir, `interactive-${Date.now()}.html`);
        fs.writeFileSync(filePath, html);
        openInBrowser(filePath);

        return {
          content: [{ type: "text" as const, text: `Interactive chart opened in browser: ${filePath}` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
```

**Step 2: Commit**

```bash
git add apps/plugin/src/tools/open-interactive.ts
git commit -m "feat(plugin): implement open_interactive MCP tool"
```

---

### Task 5.6: Create /chart skill

**Files:**
- Create: `apps/plugin/skills/chart/SKILL.md`

**Step 1: Write the skill markdown**

```markdown
---
name: chart
description: Generate charts from CSV data using Vega-Lite. Use when the user wants to create, modify, or explore data visualizations from CSV files.
user-invocable: true
allowed-tools: Read, Bash(open *)
---

# Chart Generation Workflow

You have access to Chartroom MCP tools for creating Vega-Lite charts from CSV data.

## Available MCP Tools

- **load_csv** — Parse a CSV file and get column metadata (names, types, sample values)
- **validate_chart** — Validate a Vega-Lite spec before rendering
- **render_chart** — Render a spec to PNG and save to disk
- **open_interactive** — Open the chart interactively in the browser

## Workflow

1. **Load data**: Call `load_csv` with the CSV file path
2. **Read docs**: Read the relevant Vega-Lite reference docs (in this skill's directory) for the mark type and transforms you plan to use
3. **Generate spec**: Create a Vega-Lite JSON spec based on the data and user's request
4. **Validate**: Call `validate_chart` to check for errors
5. **Render**: Call `render_chart` to create a PNG
6. **Evaluate**: Read the PNG file to evaluate the chart visually
7. **Refine**: If needed, modify the spec and re-render
8. **Interactive**: Optionally call `open_interactive` for browser viewing

## Spec Format

Reference data with `{ "url": "<filename>" }` — the renderer injects actual data automatically.

**NEVER include** in your spec: `config`, `$schema`, `background`, `padding`, `autosize` — these are applied by the renderer.

## Pre-render Checklist

Before every `render_chart` call:
1. Every `field` must reference an actual CSV column name or a transform `"as"` alias
2. NEVER stack non-summable values (temperatures, prices, rates, averages)
3. For high-cardinality categorical axes (>20 unique values), filter to top/bottom 15

## Unsupported Chart Types

- **Funnel, waterfall** → Use sorted horizontal bar chart instead
- **Radar, spider** → Use grouped bar chart or dot plot instead
- **Waffle, image marks** → Use simpler chart type
- **Map/geo** → Use bar chart by region instead
- **Tree/hierarchy** → Use stacked bar or pie chart instead
- **JavaScript callbacks, animations, custom interactions** → Not supported

## Tips

- For ambiguous requests, pick the single most interesting metric and make a clean chart
- When editing an existing chart, modify the previous spec — don't rebuild from scratch
- Use `"width": 500` if the chart renders too narrow
```

**Step 2: Copy reference docs from core**

The Vega-Lite docs will be read from `packages/core/src/docs.ts` by Claude using the Read tool. We don't need to duplicate them as files — the skill instructions tell Claude to read them.

Alternatively, generate markdown files from the docs corpus. For now, add a note in SKILL.md:

Add to SKILL.md:
```markdown
## Reference Documentation

The full Vega-Lite documentation is available in the `@chartroom/core` package at `packages/core/src/docs.ts`.
Read the `lookupDocs()` function output for specific topics as needed.
```

**Step 3: Create `apps/plugin/.mcp.json`**

This isn't needed for the monorepo setup — the user will add the MCP server via `claude mcp add`. But we can include it for documentation:

```json
{
  "mcpServers": {
    "chartroom": {
      "command": "bun",
      "args": ["run", "--cwd", "${CLAUDE_PLUGIN_ROOT}", "start"]
    }
  }
}
```

**Step 4: Commit**

```bash
git add apps/plugin/skills/ apps/plugin/.mcp.json
git commit -m "feat(plugin): create /chart skill and MCP config"
```

---

### Task 5.7: Test the plugin end-to-end

**Step 1: Build the renderer bundle**

```bash
cd packages/renderer && bun run build:bundle
```

**Step 2: Start the MCP server manually to verify it runs**

```bash
cd apps/plugin && bun src/server.ts
```

Should start without errors and wait for stdio input.

**Step 3: Register with Claude Code**

```bash
claude mcp add chartroom -- bun run --cwd apps/plugin start
```

**Step 4: Test in Claude Code**

Open a new Claude Code session and test:
- `/chart` — should load skill
- Ask Claude to "make a bar chart from apps/eval/data/sales.csv" (or whatever test CSV exists)
- Verify: `load_csv` called, spec generated, `render_chart` produces PNG, Claude reads and evaluates it

**Step 5: Commit any fixes**

---

## Phase 6: Update Root Configuration

### Task 6.1: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md to document monorepo structure**

Update the commands section, architecture section, and key files table to reflect the new structure. Key changes:
- Commands now reference workspace-aware scripts
- Architecture describes 3 packages + 3 apps
- Key files table updated with new paths
- Add plugin section

**Step 2: Update .gitignore**

Add:
```
packages/renderer/src/bundle/
/tmp/chartroom/
apps/eval/results/
```

**Step 3: Commit**

```bash
git add CLAUDE.md .gitignore
git commit -m "docs: update CLAUDE.md and .gitignore for monorepo"
```

---

### Task 6.2: Final verification

**Step 1: Clean install**

```bash
rm -rf node_modules packages/*/node_modules apps/*/node_modules
bun install
```

**Step 2: Run all tests**

```bash
bun run test
```

**Step 3: Build web app**

```bash
bun run build
```

**Step 4: Lint**

```bash
bun run lint
```

**Step 5: Run dev server**

```bash
bun run dev
```

Manual smoke test: upload CSV, generate chart, verify working.

**Step 6: Final commit if needed**

```bash
git add -A
git commit -m "chore: final monorepo cleanup and verification"
```
