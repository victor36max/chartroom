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
    expect(!result.valid && result.error).toBeDefined();
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

  describe("lintTransformOrder", () => {
    const TIME_ROWS = [
      { year: 2020, country: "US", population: 331 },
      { year: 2020, country: "UK", population: 67 },
      { year: 2021, country: "US", population: 332 },
      { year: 2021, country: "UK", population: 67 },
    ];

    it("warns when filter references a field not yet created", () => {
      const spec = {
        mark: "line",
        transform: [
          { filter: "datum.rank <= 5" },
          { joinaggregate: [{ op: "max", field: "population", as: "max_pop" }], groupby: ["country"] },
          { window: [{ op: "dense_rank", as: "rank" }], sort: [{ field: "max_pop", order: "descending" }] },
        ],
        encoding: {
          x: { field: "year", type: "quantitative" },
          y: { field: "population", type: "quantitative" },
          color: { field: "country", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { data: TIME_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some((w) => w.includes('"datum.rank"') && w.includes("not available"))).toBe(true);
      }
    });

    it("warns when window sort references a field not yet created", () => {
      const spec = {
        mark: "line",
        transform: [
          { window: [{ op: "dense_rank", as: "rank" }], sort: [{ field: "max_pop", order: "descending" }] },
          { joinaggregate: [{ op: "max", field: "population", as: "max_pop" }], groupby: ["country"] },
          { filter: "datum.rank <= 5" },
        ],
        encoding: {
          x: { field: "year", type: "quantitative" },
          y: { field: "population", type: "quantitative" },
          color: { field: "country", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { data: TIME_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some((w) => w.includes('"max_pop"') && w.includes("not available"))).toBe(true);
      }
    });

    it("no warning when transforms are correctly ordered", () => {
      const spec = {
        mark: "line",
        transform: [
          { joinaggregate: [{ op: "max", field: "population", as: "max_pop" }], groupby: ["country"] },
          { window: [{ op: "dense_rank", as: "rank" }], sort: [{ field: "max_pop", order: "descending" }] },
          { filter: "datum.rank <= 5" },
        ],
        encoding: {
          x: { field: "year", type: "quantitative" },
          y: { field: "population", type: "quantitative" },
          color: { field: "country", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { data: TIME_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some((w) => w.includes("not available"))).toBe(false);
      }
    });

    it("warns on filter referencing field from later calculate", () => {
      const spec = {
        mark: "bar",
        transform: [
          { filter: "datum.profit > 0" },
          { calculate: "datum.value * 0.3", as: "profit" },
        ],
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "profit", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some((w) => w.includes('"datum.profit"') && w.includes("not available"))).toBe(true);
      }
    });
  });
});
