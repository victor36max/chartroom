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

  describe("field reference validation", () => {
    const STOCKS = [
      { symbol: "AAPL", close: 150, volume: 1000, date: "2024-01-01" },
      { symbol: "GOOG", close: 140, volume: 2000, date: "2024-01-01" },
    ];
    const COMPANIES = [
      { symbol: "AAPL", sector: "Technology", name: "Apple" },
      { symbol: "GOOG", sector: "Technology", name: "Google" },
    ];

    it("warns when encoding references a field from another dataset without lookup", () => {
      const spec = {
        data: { url: "stocks.csv" },
        mark: "bar",
        encoding: {
          y: { field: "sector", type: "nominal" },
          x: { field: "close", type: "quantitative", aggregate: "mean" },
        },
      };
      const result = validateSpec(spec, { "stocks.csv": STOCKS, "companies.csv": COMPANIES });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("sector") && w.includes("companies.csv") && w.includes("lookup"))).toBe(true);
        expect(result.warnings.some(w => w.includes('shared key "symbol"'))).toBe(true);
      }
    });

    it("no warning when lookup transform joins the field", () => {
      const spec = {
        data: { url: "stocks.csv" },
        mark: "bar",
        transform: [
          { aggregate: [{ op: "mean", field: "close", as: "avg_close" }], groupby: ["symbol"] },
          { lookup: "symbol", from: { data: { url: "companies.csv" }, key: "symbol", fields: ["sector"] } },
        ],
        encoding: {
          y: { field: "sector", type: "nominal" },
          x: { field: "avg_close", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { "stocks.csv": STOCKS, "companies.csv": COMPANIES });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("sector"))).toBe(false);
      }
    });

    it("warns when encoding references a completely unknown field", () => {
      const spec = {
        data: { url: "stocks.csv" },
        mark: "bar",
        encoding: {
          x: { field: "nonexistent", type: "nominal" },
          y: { field: "close", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { "stocks.csv": STOCKS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("nonexistent") && w.includes("not found"))).toBe(true);
      }
    });

    it("warns when encoding references pre-aggregate column after aggregate", () => {
      const spec = {
        data: { url: "stocks.csv" },
        mark: "bar",
        transform: [
          { aggregate: [{ op: "mean", field: "close", as: "avg_close" }], groupby: ["symbol"] },
        ],
        encoding: {
          x: { field: "symbol", type: "nominal" },
          y: { field: "volume", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { "stocks.csv": STOCKS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("volume"))).toBe(true);
      }
    });

    it("no warning when all fields are from primary dataset", () => {
      const spec = {
        data: { url: "stocks.csv" },
        mark: "point",
        encoding: {
          x: { field: "close", type: "quantitative" },
          y: { field: "volume", type: "quantitative" },
          color: { field: "symbol", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { "stocks.csv": STOCKS, "companies.csv": COMPANIES });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("not in") || w.includes("not found"))).toBe(false);
      }
    });
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
