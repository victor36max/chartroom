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

    it("no cardinality warning when field is filtered (string expression)", () => {
      const manyEntities = Array.from({ length: 50 }, (_, i) => ({
        entity: `entity_${i}`,
        value: i * 10,
      }));
      const spec = {
        mark: "line",
        transform: [
          { filter: "datum['entity'] == 'entity_0' || datum['entity'] == 'entity_1'" },
        ],
        encoding: {
          x: { field: "value", type: "quantitative" },
          y: { field: "value", type: "quantitative" },
          color: { field: "entity", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: manyEntities });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("entity") && w.includes("unique values"))).toBe(false);
      }
    });

    it("no cardinality warning when field is filtered (predicate object)", () => {
      const manyEntities = Array.from({ length: 50 }, (_, i) => ({
        entity: `entity_${i}`,
        value: i * 10,
      }));
      const spec = {
        mark: "bar",
        transform: [
          { filter: { field: "entity", oneOf: ["entity_0", "entity_1", "entity_2"] } },
        ],
        encoding: {
          x: { field: "entity", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: manyEntities });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("entity") && w.includes("unique values"))).toBe(false);
      }
    });

    it("no cardinality warning when all layers filter the same field", () => {
      const manyEntities = Array.from({ length: 50 }, (_, i) => ({
        entity: `entity_${i}`,
        value: i * 10,
        projected: i * 12,
      }));
      const spec = {
        encoding: {
          x: { field: "value", type: "quantitative" },
          color: { field: "entity", type: "nominal" },
        },
        layer: [
          {
            mark: "line",
            transform: [
              { filter: { field: "entity", oneOf: ["entity_0", "entity_1"] } },
            ],
            encoding: { y: { field: "value", type: "quantitative" } },
          },
          {
            mark: { type: "line", strokeDash: [4, 4] },
            transform: [
              { filter: { field: "entity", oneOf: ["entity_0", "entity_1"] } },
            ],
            encoding: { y: { field: "projected", type: "quantitative" } },
          },
        ],
      };
      const result = validateSpec(spec, { csv: manyEntities });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("entity") && w.includes("unique values"))).toBe(false);
      }
    });

    it("still warns on high cardinality when a different field is filtered", () => {
      const manyEntities = Array.from({ length: 25 }, (_, i) => ({
        entity: `entity_${i}`,
        group: i < 10 ? "A" : "B",
        value: i * 10,
      }));
      const spec = {
        mark: "bar",
        transform: [
          { filter: "datum.group == 'A'" },
        ],
        encoding: {
          x: { field: "entity", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: manyEntities });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("entity") && w.includes("25 unique values"))).toBe(true);
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

  describe("layer-level transform field references", () => {
    it("no false warning when layer has its own transform creating a field", () => {
      const spec = {
        layer: [
          { mark: "point", encoding: { x: { field: "category", type: "nominal" }, y: { field: "value", type: "quantitative" } } },
          {
            mark: { type: "line", color: "red" },
            transform: [{ regression: "value", on: "category", as: ["category", "trend"] }],
            encoding: { x: { field: "category", type: "nominal" }, y: { field: "trend", type: "quantitative" } },
          },
        ],
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("trend") && w.includes("not found"))).toBe(false);
      }
    });

    it("no false warning when layer has its own calculate transform", () => {
      const spec = {
        layer: [
          { mark: "bar", encoding: { x: { field: "category", type: "nominal" }, y: { field: "value", type: "quantitative" } } },
          {
            mark: { type: "text", dy: -8 },
            transform: [{ calculate: "datum.value * 2", as: "doubled" }],
            encoding: { x: { field: "category", type: "nominal" }, y: { field: "value", type: "quantitative" }, text: { field: "doubled", type: "quantitative" } },
          },
        ],
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("doubled") && w.includes("not found"))).toBe(false);
      }
    });

    it("still warns when layer references truly unknown field", () => {
      const spec = {
        layer: [
          { mark: "bar", encoding: { x: { field: "category", type: "nominal" }, y: { field: "value", type: "quantitative" } } },
          { mark: "rule", encoding: { y: { field: "nonexistent", type: "quantitative" } } },
        ],
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("nonexistent") && w.includes("not found"))).toBe(true);
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

  describe("stacking non-summable values", () => {
    it("warns when stacked area uses non-summable field", () => {
      const TEMP_ROWS = [
        { city: "NYC", temperature: 33 },
        { city: "LA", temperature: 58 },
        { city: "CHI", temperature: 26 },
      ];
      const spec = {
        mark: "area",
        encoding: {
          x: { field: "city", type: "nominal" },
          y: { field: "temperature", type: "quantitative" },
          color: { field: "city", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: TEMP_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("temperature") && w.includes("non-summable"))).toBe(true);
      }
    });

    it("warns when stacked bar uses non-summable field (avg_price)", () => {
      const PRICE_ROWS = [
        { category: "A", avg_price: 10 },
        { category: "B", avg_price: 20 },
      ];
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "avg_price", type: "quantitative" },
          color: { field: "category", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: PRICE_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("avg_price") && w.includes("non-summable"))).toBe(true);
      }
    });

    it("no warning when stack is explicitly false", () => {
      const TEMP_ROWS = [
        { city: "NYC", temperature: 33 },
        { city: "LA", temperature: 58 },
      ];
      const spec = {
        mark: "area",
        encoding: {
          x: { field: "city", type: "nominal" },
          y: { field: "temperature", type: "quantitative", stack: false },
          color: { field: "city", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: TEMP_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("non-summable"))).toBe(false);
      }
    });

    it("no warning for summable field (revenue)", () => {
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
          color: { field: "category", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("non-summable"))).toBe(false);
      }
    });

    it("no warning without color encoding (no stacking)", () => {
      const TEMP_ROWS = [
        { city: "NYC", temperature: 33 },
        { city: "LA", temperature: 58 },
      ];
      const spec = {
        mark: "area",
        encoding: {
          x: { field: "city", type: "nominal" },
          y: { field: "temperature", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: TEMP_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("non-summable"))).toBe(false);
      }
    });

    it("no warning for line mark even with non-summable field", () => {
      const TEMP_ROWS = [
        { city: "NYC", temperature: 33 },
        { city: "LA", temperature: 58 },
      ];
      const spec = {
        mark: "line",
        encoding: {
          x: { field: "city", type: "nominal" },
          y: { field: "temperature", type: "quantitative" },
          color: { field: "city", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: TEMP_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("non-summable"))).toBe(false);
      }
    });
  });

  describe("arc without theta", () => {
    it("warns when arc mark has no theta encoding", () => {
      const spec = {
        mark: { type: "arc" },
        encoding: {
          color: { field: "category", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Arc/pie") && w.includes("theta"))).toBe(true);
      }
    });

    it("no warning when arc mark has theta encoding", () => {
      const spec = {
        mark: { type: "arc" },
        encoding: {
          theta: { field: "value", type: "quantitative" },
          color: { field: "category", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Arc/pie"))).toBe(false);
      }
    });
  });

  describe("same field on x and y", () => {
    it("warns when same field is on both x and y", () => {
      const spec = {
        mark: "point",
        encoding: {
          x: { field: "value", type: "quantitative" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Same field") && w.includes("value"))).toBe(true);
      }
    });

    it("no warning when different fields on x and y", () => {
      const spec = {
        mark: "point",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Same field"))).toBe(false);
      }
    });

    it("no warning when same field has different aggregates (min/max range)", () => {
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "value", type: "quantitative", aggregate: "min" },
          y: { field: "value", type: "quantitative", aggregate: "max" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Same field"))).toBe(false);
      }
    });
  });

  describe("fold referencing non-existent columns", () => {
    it("warns when fold references column not in dataset", () => {
      const spec = {
        mark: "bar",
        transform: [
          { fold: ["value", "nonexistent"] },
        ],
        encoding: {
          x: { field: "key", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Fold") && w.includes("nonexistent"))).toBe(true);
      }
    });

    it("no warning when fold references existing columns", () => {
      const WIDE_ROWS = [
        { name: "A", metric1: 10, metric2: 20 },
        { name: "B", metric1: 30, metric2: 40 },
      ];
      const spec = {
        mark: "bar",
        transform: [
          { fold: ["metric1", "metric2"] },
        ],
        encoding: {
          x: { field: "key", type: "nominal" },
          y: { field: "value", type: "quantitative" },
          color: { field: "name", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: WIDE_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Fold"))).toBe(false);
      }
    });

    it("no warning when fold references field created by prior calculate", () => {
      const spec = {
        mark: "bar",
        transform: [
          { calculate: "datum.value * 2", as: "doubled" },
          { fold: ["value", "doubled"] },
        ],
        encoding: {
          x: { field: "key", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Fold") && w.includes("doubled"))).toBe(false);
      }
    });
  });

  describe("redundant double-aggregate", () => {
    it("warns when encoding has inline aggregate on already-aggregated field", () => {
      const spec = {
        mark: "bar",
        transform: [
          { aggregate: [{ op: "sum", field: "value", as: "total" }], groupby: ["category"] },
        ],
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "total", type: "quantitative", aggregate: "mean" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("total") && w.includes("double-aggregate"))).toBe(true);
      }
    });

    it("no warning when encoding has no inline aggregate on aggregated field", () => {
      const spec = {
        mark: "bar",
        transform: [
          { aggregate: [{ op: "sum", field: "value", as: "total" }], groupby: ["category"] },
        ],
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "total", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("double-aggregate"))).toBe(false);
      }
    });

    it("no warning when inline aggregate is on a non-aggregated field", () => {
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative", aggregate: "mean" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("double-aggregate"))).toBe(false);
      }
    });
  });

  describe("nominal on continuous numeric", () => {
    it("warns when nominal encoding has many unique numeric values", () => {
      const numericRows = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        value: i * 10,
      }));
      const spec = {
        mark: "point",
        encoding: {
          x: { field: "id", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: numericRows });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("id") && w.includes("nominal") && w.includes("numeric values"))).toBe(true);
      }
    });

    it("no warning for low cardinality nominal numeric field", () => {
      const fewRows = [
        { rating: 1, count: 10 },
        { rating: 2, count: 20 },
        { rating: 3, count: 30 },
      ];
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "rating", type: "ordinal" },
          y: { field: "count", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: fewRows });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("numeric values"))).toBe(false);
      }
    });

    it("no warning when nominal field has string values", () => {
      const stringRows = Array.from({ length: 25 }, (_, i) => ({
        name: `item_${i}`,
        value: i * 10,
      }));
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "name", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: stringRows });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("name") && w.includes("numeric values"))).toBe(false);
      }
    });
  });

  describe("timeUnit on non-temporal field", () => {
    it("warns when timeUnit is used on plain string field", () => {
      const STRING_ROWS = [
        { category: "apple", value: 10 },
        { category: "banana", value: 20 },
      ];
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "category", type: "nominal", timeUnit: "month" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: STRING_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("timeUnit") && w.includes("category"))).toBe(true);
      }
    });

    it("no warning when timeUnit is used on date field", () => {
      const DATE_ROWS = [
        { date: "2024-01-01", value: 10 },
        { date: "2024-02-01", value: 20 },
      ];
      const spec = {
        mark: "line",
        encoding: {
          x: { field: "date", type: "temporal", timeUnit: "month" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: DATE_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("timeUnit") && w.includes("not dates"))).toBe(false);
      }
    });
  });

  describe("log scale issues", () => {
    it("warns when log scale domain includes zero", () => {
      const spec = {
        mark: "point",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative", scale: { type: "log", domain: [0, 100] } },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Log scale") && w.includes("zero"))).toBe(true);
      }
    });

    it("warns when log scale field contains zero values", () => {
      const ZERO_ROWS = [
        { category: "A", value: 0 },
        { category: "B", value: 20 },
      ];
      const spec = {
        mark: "point",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative", scale: { type: "log" } },
        },
      };
      const result = validateSpec(spec, { csv: ZERO_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Log scale") && w.includes("zero or negative"))).toBe(true);
      }
    });

    it("no warning for log scale with all positive values", () => {
      const spec = {
        mark: "point",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative", scale: { type: "log" } },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Log scale"))).toBe(false);
      }
    });

    it("no warning for symlog scale with zero values", () => {
      const ZERO_ROWS = [
        { category: "A", value: 0 },
        { category: "B", value: 20 },
      ];
      const spec = {
        mark: "point",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative", scale: { type: "symlog" } },
        },
      };
      const result = validateSpec(spec, { csv: ZERO_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Log scale"))).toBe(false);
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

  describe("joinaggregate support", () => {
    const POP_ROWS = [
      { Entity: "China", Year: 1990, "Population": 1000 },
      { Entity: "China", Year: 2000, "Population": 1200 },
      { Entity: "India", Year: 1990, "Population": 800 },
      { Entity: "India", Year: 2000, "Population": 1000 },
      { Entity: "USA", Year: 1990, "Population": 250 },
      { Entity: "USA", Year: 2000, "Population": 280 },
    ];

    it("tracks joinaggregate fields in available fields (no false warning)", () => {
      const spec = {
        mark: "line",
        transform: [
          { joinaggregate: [{ op: "max", field: "Population", as: "max_pop" }], groupby: ["Entity"] },
          { window: [{ op: "rank", as: "rank" }], sort: [{ field: "max_pop", order: "descending" }] },
          { filter: "datum.rank <= 2" },
        ],
        encoding: {
          x: { field: "Year", type: "quantitative", axis: { format: "d" } },
          y: { field: "Population", type: "quantitative" },
          color: { field: "Entity", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: POP_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Year"))).toBe(false);
        expect(result.warnings.some(w => w.includes("Population"))).toBe(false);
      }
    });

    it("suggests joinaggregate when aggregate is used in ranking pattern", () => {
      const spec = {
        mark: "line",
        transform: [
          { aggregate: [{ op: "max", field: "Population", as: "max_pop" }], groupby: ["Entity"] },
          { window: [{ op: "rank", as: "rank" }], sort: [{ field: "max_pop", order: "descending" }] },
          { filter: "datum.rank <= 2" },
        ],
        encoding: {
          x: { field: "Year", type: "quantitative", axis: { format: "d" } },
          y: { field: "Population", type: "quantitative" },
          color: { field: "Entity", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: POP_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w =>
          w.includes("Year") && w.includes("joinaggregate")
        )).toBe(true);
        expect(result.warnings.some(w =>
          w.includes("Population") && w.includes("joinaggregate")
        )).toBe(true);
      }
    });

    it("warns when rank is used after joinaggregate instead of dense_rank", () => {
      const spec = {
        mark: "line",
        transform: [
          { joinaggregate: [{ op: "max", field: "Population", as: "max_pop" }], groupby: ["Entity"] },
          { window: [{ op: "rank", as: "rank" }], sort: [{ field: "max_pop", order: "descending" }] },
          { filter: "datum.rank <= 2" },
        ],
        encoding: {
          x: { field: "Year", type: "quantitative", axis: { format: "d" } },
          y: { field: "Population", type: "quantitative" },
          color: { field: "Entity", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: POP_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w =>
          w.includes("dense_rank") && w.includes("rank")
        )).toBe(true);
      }
    });

    it("no warning when dense_rank is used after joinaggregate", () => {
      const spec = {
        mark: "line",
        transform: [
          { joinaggregate: [{ op: "max", field: "Population", as: "max_pop" }], groupby: ["Entity"] },
          { window: [{ op: "dense_rank", as: "rank" }], sort: [{ field: "max_pop", order: "descending" }] },
          { filter: "datum.rank <= 2" },
        ],
        encoding: {
          x: { field: "Year", type: "quantitative", axis: { format: "d" } },
          y: { field: "Population", type: "quantitative" },
          color: { field: "Entity", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: POP_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("dense_rank"))).toBe(false);
      }
    });

    it("still suggests groupby when aggregate has no subsequent window", () => {
      const spec = {
        mark: "bar",
        transform: [
          { aggregate: [{ op: "sum", field: "Population", as: "total_pop" }], groupby: ["Entity"] },
        ],
        encoding: {
          x: { field: "Entity", type: "nominal" },
          y: { field: "total_pop", type: "quantitative" },
          color: { field: "Year", type: "ordinal" },
        },
      };
      const result = validateSpec(spec, { csv: POP_ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w =>
          w.includes("Year") && w.includes("groupby") && !w.includes("joinaggregate")
        )).toBe(true);
      }
    });
  });

  describe("lintFormatStrings", () => {
    it("warns on invalid d3-format string (double comma)", () => {
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative", format: "$,,.0f" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("format") && w.includes("$,,.0f"))).toBe(true);
      }
    });

    it("accepts valid d3-format strings", () => {
      const formats = ["$,.0f", ".2f", ".2e", "d", ".1%", "+$,.2f", ",.0f", ".2s", "08d"];
      for (const fmt of formats) {
        const spec = {
          mark: "bar",
          encoding: {
            x: { field: "category", type: "nominal" },
            y: { field: "value", type: "quantitative", format: fmt },
          },
        };
        const result = validateSpec(spec, { csv: ROWS });
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.warnings.some(w => w.includes("format") && w.includes(fmt))).toBe(false);
        }
      }
    });

    it("warns on invalid d3-format in axis.format", () => {
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative", axis: { format: "$$" } },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("format") && w.includes("$$"))).toBe(true);
      }
    });

    it("warns on invalid d3-time-format directive", () => {
      const spec = {
        mark: "line",
        encoding: {
          x: { field: "category", type: "temporal", format: "%Y-%K-%Z" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("format") && w.includes("%K"))).toBe(true);
      }
    });

    it("accepts valid d3-time-format strings", () => {
      const formats = ["%Y-%m-%d", "%B of %Y", "%H:%M:%S", "%b %d, %Y"];
      for (const fmt of formats) {
        const spec = {
          mark: "line",
          encoding: {
            x: { field: "category", type: "temporal", format: fmt },
            y: { field: "value", type: "quantitative" },
          },
        };
        const result = validateSpec(spec, { csv: ROWS });
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.warnings.some(w => w.includes("format") && w.includes(fmt))).toBe(false);
        }
      }
    });

    it("skips validation when formatType is custom", () => {
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative", formatType: "myCustom", format: "anything goes" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Invalid d3-format") || w.includes("Invalid d3-time-format"))).toBe(false);
      }
    });

    it("skips validation when format is an object (dynamic time format)", () => {
      const spec = {
        mark: "line",
        encoding: {
          x: { field: "category", type: "temporal", format: { year: "%Y", month: "%b %Y" } },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("format"))).toBe(false);
      }
    });

    it("checks format in legend.format", () => {
      const spec = {
        mark: "point",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
          color: { field: "value", type: "quantitative", legend: { format: "abc!!" } },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("format") && w.includes("abc!!"))).toBe(true);
      }
    });

    it("skips validation when axis has its own custom formatType", () => {
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative", axis: { format: "anything", formatType: "myCustom" } },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Invalid d3-format") || w.includes("Invalid d3-time-format"))).toBe(false);
      }
    });

    it("skips validation when legend has its own custom formatType", () => {
      const spec = {
        mark: "point",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
          color: { field: "value", type: "quantitative", legend: { format: "anything", formatType: "myCustom" } },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("Invalid d3-format") || w.includes("Invalid d3-time-format"))).toBe(false);
      }
    });

    it("checks format strings in nested layer specs", () => {
      const spec = {
        layer: [
          {
            mark: "bar",
            encoding: {
              x: { field: "category", type: "nominal" },
              y: { field: "value", type: "quantitative", format: "$,,.0f" },
            },
          },
        ],
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("format") && w.includes("$,,.0f"))).toBe(true);
      }
    });

    it("validates format strings in tooltip arrays", () => {
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
          tooltip: [
            { field: "category", type: "nominal" },
            { field: "value", type: "quantitative", format: "abc" },
          ],
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("tooltip[1]") && w.includes("abc"))).toBe(true);
      }
    });
  });

  describe("tooltip array field validation", () => {
    it("warns when tooltip array references non-existent field", () => {
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
          tooltip: [
            { field: "category", type: "nominal" },
            { field: "nonexistent", type: "quantitative" },
          ],
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("nonexistent"))).toBe(true);
      }
    });
  });

  describe("predicate filter field checking", () => {
    it("warns when object-predicate filter references unavailable field", () => {
      const spec = {
        mark: "bar",
        transform: [
          { filter: { field: "rank", oneOf: [1, 2, 3] } },
        ],
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("rank") && w.includes("not available"))).toBe(true);
      }
    });

    it("no warning for predicate filter on existing field", () => {
      const spec = {
        mark: "bar",
        transform: [
          { filter: { field: "category", equal: "A" } },
        ],
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("not available"))).toBe(false);
      }
    });
  });

  describe("NON_SUMMABLE_PATTERN compound field names", () => {
    it("does not warn for compound summable fields like average_count", () => {
      const data = [
        { city: "A", average_count: 10 },
        { city: "B", average_count: 20 },
      ];
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "city", type: "nominal" },
          y: { field: "average_count", type: "quantitative" },
          color: { field: "city", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: data });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("non-summable"))).toBe(false);
      }
    });

    it("still warns for pure non-summable fields like temperature", () => {
      const data = [
        { city: "A", temperature: 30 },
        { city: "B", temperature: 25 },
      ];
      const spec = {
        mark: "bar",
        encoding: {
          x: { field: "city", type: "nominal" },
          y: { field: "temperature", type: "quantitative" },
          color: { field: "city", type: "nominal" },
        },
      };
      const result = validateSpec(spec, { csv: data });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("non-summable"))).toBe(true);
      }
    });
  });

  describe("unknown transform keys", () => {
    it("warns on flat joinaggregate (missing wrapper)", () => {
      const spec = {
        mark: "line",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
        transform: [
          { op: "max", field: "value", as: "max_val", groupby: ["category"] },
        ],
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes('"joinaggregate" wrapper'))).toBe(true);
      }
    });

    it("warns on window transform with extra keys like op and field", () => {
      const spec = {
        mark: "line",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "value", type: "quantitative" },
        },
        transform: [
          {
            window: [{ op: "dense_rank", as: "rank" }],
            sort: [{ field: "value", order: "descending" }],
            op: "dense_rank",
            field: "value",
          },
        ],
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes('unrecognized key "op"'))).toBe(true);
        expect(result.warnings.some(w => w.includes('unrecognized key "field"'))).toBe(true);
      }
    });

    it("does not warn on valid transforms", () => {
      const spec = {
        mark: "line",
        encoding: {
          x: { field: "category", type: "nominal" },
          y: { field: "max_val", type: "quantitative" },
        },
        transform: [
          { joinaggregate: [{ op: "max", field: "value", as: "max_val" }], groupby: ["category"] },
          { window: [{ op: "dense_rank", as: "rank" }], sort: [{ field: "max_val", order: "descending" }] },
          { filter: "datum.rank <= 5" },
          { calculate: "'prefix_' + datum.category", as: "label" },
        ],
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("unrecognized"))).toBe(false);
        expect(result.warnings.some(w => w.includes("joinaggregate"))).toBe(false);
      }
    });
  });

  describe("repeat spec field validation", () => {
    it("does not warn for repeat variable field references", () => {
      const spec = {
        repeat: { column: ["value", "category"] },
        spec: {
          mark: "bar",
          encoding: {
            x: { field: { repeat: "column" }, type: "nominal" },
            y: { aggregate: "count", type: "quantitative" },
          },
        },
      };
      const result = validateSpec(spec, { csv: ROWS });
      expect(result.valid).toBe(true);
      // repeat field refs are objects, not strings — getOwnEncodingFields skips them
      if (result.valid) {
        expect(result.warnings.some(w => w.includes("not found"))).toBe(false);
      }
    });
  });
});
