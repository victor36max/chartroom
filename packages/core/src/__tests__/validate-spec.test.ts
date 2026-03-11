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

    it("warns with specific aggregate message when field is dropped by aggregate transform", () => {
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
        expect(result.warnings.some(w =>
          w.includes("volume") && w.includes("aggregate") && w.includes("groupby")
        )).toBe(true);
      }
    });

    it("warns with specific aggregate message for scatter plot missing groupby field", () => {
      const STOCK_DATA = [
        { symbol: "AAPL", sector: "Tech", close: 150, marketCap: 3000 },
        { symbol: "GOOG", sector: "Tech", close: 140, marketCap: 2000 },
        { symbol: "JNJ", sector: "Health", close: 160, marketCap: 500 },
      ];
      const spec = {
        mark: { type: "point", filled: true },
        transform: [
          { aggregate: [{ op: "mean", field: "close", as: "avg_close" }, { op: "mean", field: "marketCap", as: "avg_cap" }], groupby: ["symbol"] },
        ],
        encoding: {
          x: { field: "avg_cap", type: "quantitative" },
          y: { field: "avg_close", type: "quantitative" },
          color: { field: "sector", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: STOCK_DATA });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w =>
          w.includes("sector") && w.includes("aggregate") && w.includes('groupby')
        )).toBe(true);
      }
    });

    it("no warning when aggregate groupby includes all encoded fields", () => {
      const STOCK_DATA = [
        { symbol: "AAPL", sector: "Tech", close: 150, marketCap: 3000 },
        { symbol: "GOOG", sector: "Tech", close: 140, marketCap: 2000 },
      ];
      const spec = {
        mark: { type: "point", filled: true },
        transform: [
          { aggregate: [{ op: "mean", field: "close", as: "avg_close" }, { op: "mean", field: "marketCap", as: "avg_cap" }], groupby: ["symbol", "sector"] },
        ],
        encoding: {
          x: { field: "avg_cap", type: "quantitative" },
          y: { field: "avg_close", type: "quantitative" },
          color: { field: "sector", type: "nominal" },
          tooltip: { field: "symbol", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: STOCK_DATA });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("aggregate") && w.includes("groupby"))).toBe(false);
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

  describe("spec pattern linting", () => {
    it("warns when rule layer inherits shared categorical encoding", () => {
      const spec = {
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
        layer: [
          { mark: "bar" },
          { mark: "rule", encoding: { y: { datum: 15 } } },
        ],
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("rule mark") && w.includes("categorical"))).toBe(true);
      }
    });

    it("no warning when rule layer has no shared categorical encoding", () => {
      const spec = {
        layer: [
          { mark: "bar", encoding: { x: { field: "category", type: "nominal" }, y: { field: "value", type: "quantitative" } } },
          { mark: "rule", encoding: { y: { datum: 15 } } },
        ],
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("rule mark"))).toBe(false);
      }
    });

    it("warns when point mark uses inline aggregate without transform groupby", () => {
      const spec = {
        mark: "point",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { aggregate: "mean", field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Point/scatter") && w.includes("inline aggregate"))).toBe(true);
      }
    });

    it("no warning when point mark uses transform groupby", () => {
      const spec = {
        mark: "point",
        transform: [
          { aggregate: [{ op: "mean", field: "value", as: "avg_value" }], groupby: ["category"] },
        ],
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "avg_value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Point/scatter"))).toBe(false);
      }
    });

    it("warns on high cardinality nominal axis", () => {
      const manyCategories = Array.from({ length: 25 }, (_, i) => ({
        category: `cat_${i}`,
        value: i * 10,
      }));
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: manyCategories });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("25 unique values") && w.includes("filtering"))).toBe(true);
      }
    });

    it("no warning on low cardinality nominal axis", () => {
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("unique values"))).toBe(false);
      }
    });

    it("warns when shape encoding has more than 6 unique values", () => {
      const manyCompanies = Array.from({ length: 8 }, (_, i) => ({
        company: `Company_${i}`,
        sector: i < 4 ? "Tech" : "Finance",
        price: (i + 1) * 10,
        marketCap: (i + 1) * 100,
      }));
      const spec = {
        mark: { type: "point", filled: true },
        transform: [
          { aggregate: [{ op: "mean", field: "price", as: "avg_price" }, { op: "mean", field: "marketCap", as: "avg_cap" }], groupby: ["company", "sector"] },
        ],
        encoding: {
          x: { field: "avg_price", type: "quantitative" },
          y: { field: "avg_cap", type: "quantitative" },
          color: { field: "sector", type: "nominal" },
          shape: { field: "company", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: manyCompanies });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("shape") && w.includes("8 unique values") && w.includes("6"))).toBe(true);
      }
    });

    it("no warning when shape encoding has 6 or fewer unique values", () => {
      const fewCompanies = Array.from({ length: 5 }, (_, i) => ({
        company: `Company_${i}`,
        price: (i + 1) * 10,
      }));
      const spec = {
        mark: { type: "point", filled: true },
        encoding: {
          x: { field: "price", type: "quantitative" },
          y: { field: "price", type: "quantitative" },
          shape: { field: "company", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: fewCompanies });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("shape"))).toBe(false);
      }
    });

    it("warns when color encoding has more than 20 nominal values", () => {
      const manyCategories = Array.from({ length: 25 }, (_, i) => ({
        cat: `cat_${i}`,
        value: i * 10,
      }));
      const spec = {
        mark: { type: "point", filled: true },
        encoding: {
          x: { field: "value", type: "quantitative" },
          y: { field: "value", type: "quantitative" },
          color: { field: "cat", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: manyCategories });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("color") && w.includes("25 unique values"))).toBe(true);
      }
    });
  });

  describe("composition spec linting", () => {
    it("warns on unknown field in hconcat sub-spec", () => {
      const spec = {
        hconcat: [
          {
            mark: "bar",
            encoding: {
              x: { field: "nonexistent", type: "nominal" },
              y: { field: "value", type: "quantitative" },
            },
          },
        ],
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("nonexistent") && w.includes("not found"))).toBe(true);
      }
    });

    it("warns on unknown field in facet inner spec", () => {
      const spec = {
        facet: { field: "category", type: "nominal" },
        spec: {
          mark: "bar",
          encoding: {
            x: { field: "category", type: "nominal" },
            y: { field: "missing_field", type: "quantitative" },
          },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("missing_field") && w.includes("not found"))).toBe(true);
      }
    });

    it("warns on aggregate missing alias in vconcat sub-spec", () => {
      const spec = {
        vconcat: [
          {
            mark: "bar",
            transform: [
              { aggregate: [{ op: "sum", field: "value" }], groupby: ["category"] },
            ],
            encoding: {
              x: { field: "category", type: "nominal" },
              y: { field: "value", type: "quantitative" },
            },
          },
        ],
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("missing"))).toBe(true);
      }
    });
  });

  describe("layer-level scatter check", () => {
    it("warns when point mark inside layer uses inline aggregate without transform groupby", () => {
      const spec = {
        layer: [
          {
            mark: "point",
            encoding: {
              x: { field: "category", type: "nominal" },
              y: { aggregate: "mean", field: "value", type: "quantitative" },
            },
          },
        ],
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Point/scatter") && w.includes("inline aggregate"))).toBe(true);
      }
    });
  });

  describe("temporal numeric linting", () => {
    const YEAR_ROWS = [
      { Year: 1990, value: 100 },
      { Year: 2000, value: 200 },
      { Year: 2010, value: 300 },
    ];

    it("warns when numeric field is encoded as temporal", () => {
      const spec = {
        mark: "line",
        encoding: {
          x: { field: "Year", type: "temporal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: YEAR_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Year") && w.includes("temporal") && w.includes("plain numbers"))).toBe(true);
      }
    });

    it("no warning when temporal field has timeUnit", () => {
      const spec = {
        mark: "line",
        encoding: {
          x: { field: "Year", type: "temporal", timeUnit: "year" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: YEAR_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("plain numbers"))).toBe(false);
      }
    });

    it("no warning when temporal field is created by calculate transform", () => {
      const spec = {
        mark: "line",
        transform: [
          { calculate: "datetime(datum.Year, 0, 1)", as: "YearDate" },
        ],
        encoding: {
          x: { field: "YearDate", type: "temporal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: YEAR_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("plain numbers"))).toBe(false);
      }
    });

    it("no warning when temporal field contains date strings", () => {
      const DATE_ROWS = [
        { date: "2024-01-01", value: 100 },
        { date: "2024-02-01", value: 200 },
      ];
      const spec = {
        mark: "line",
        encoding: {
          x: { field: "date", type: "temporal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: DATE_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("plain numbers"))).toBe(false);
      }
    });

    it("warns for string year values like '2010'", () => {
      const STRING_YEAR_ROWS = [
        { Year: "1990", value: 100 },
        { Year: "2000", value: 200 },
      ];
      const spec = {
        mark: "line",
        encoding: {
          x: { field: "Year", type: "temporal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: STRING_YEAR_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Year") && w.includes("plain numbers"))).toBe(true);
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
