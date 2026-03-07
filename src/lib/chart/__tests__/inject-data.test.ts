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

  it("does not inject data into layer items without data (they inherit from parent)", () => {
    const spec = {
      data: { name: "csv" },
      transform: [{ aggregate: [{ op: "sum", field: "score", as: "total" }], groupby: ["name"] }],
      layer: [
        { mark: "bar", encoding: { y: { field: "total" } } },
        { mark: "line", encoding: { y: { field: "total" } } },
      ],
    };
    const result = injectData(spec, SAMPLE_ROWS);
    expect(result.data).toEqual({ values: SAMPLE_ROWS });
    // Layer items should NOT have data injected — they inherit from parent
    const layers = result.layer as Record<string, unknown>[];
    expect(layers[0].data).toBeUndefined();
    expect(layers[1].data).toBeUndefined();
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
