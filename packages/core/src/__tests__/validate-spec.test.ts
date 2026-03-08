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
    const result = validateSpec(spec, { csv: ROWS });
    expect(result.valid).toBe(true);
  });

  it("returns error for spec with missing mark", () => {
    const spec = { encoding: { x: { field: "category" } } };
    const result = validateSpec(spec, { csv: ROWS });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeDefined();
    }
  });

  it("returns valid for a layered spec", () => {
    const spec = {
      layer: [
        { mark: "bar", encoding: { x: { field: "category", type: "nominal" }, y: { field: "value", type: "quantitative" } } },
        { mark: "rule", encoding: { y: { datum: 15 } } },
      ],
    };
    const result = validateSpec(spec, { csv: ROWS });
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
    const result = validateSpec(spec, { csv: ROWS });
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
    const result = validateSpec(spec, { csv: ROWS });
    expect(result.valid).toBe(true);
  });

  it("warns on aggregate transform missing 'as' alias", () => {
    const spec = {
      mark: "bar",
      transform: [
        { aggregate: [{ op: "sum", field: "value" }], groupby: ["category"] },
      ],
      encoding: {
        x: { field: "category", type: "nominal" },
        y: { field: "value", type: "quantitative" },
      },
    };
    const result = validateSpec(spec, { csv: ROWS });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.warnings.some(w => w.includes("missing"))).toBe(true);
    }
  });

  it("rejects spec with a v5 $schema", () => {
    const spec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: "bar",
      encoding: {
        x: { field: "category", type: "nominal" },
        y: { field: "value", type: "quantitative" },
      },
    };
    const result = validateSpec(spec, { csv: ROWS });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Invalid $schema");
    }
  });

  it("rejects spec with an arbitrary invalid $schema", () => {
    const spec = {
      $schema: "https://example.com/schema.json",
      mark: "bar",
      encoding: {
        x: { field: "category", type: "nominal" },
        y: { field: "value", type: "quantitative" },
      },
    };
    const result = validateSpec(spec, { csv: ROWS });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Invalid $schema");
    }
  });

  it("accepts spec with valid v6 $schema", () => {
    const spec = {
      $schema: "https://vega.github.io/schema/vega-lite/v6.json",
      mark: "bar",
      encoding: {
        x: { field: "category", type: "nominal" },
        y: { field: "value", type: "quantitative" },
      },
    };
    const result = validateSpec(spec, { csv: ROWS });
    expect(result.valid).toBe(true);
  });

  it("warns when encoding references original field instead of alias", () => {
    const spec = {
      mark: "bar",
      transform: [
        { aggregate: [{ op: "sum", field: "value", as: "total" }], groupby: ["category"] },
      ],
      encoding: {
        x: { field: "category", type: "nominal" },
        y: { field: "value", type: "quantitative" },
      },
    };
    const result = validateSpec(spec, { csv: ROWS });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.warnings.some(w => w.includes("total"))).toBe(true);
    }
  });
});
