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
