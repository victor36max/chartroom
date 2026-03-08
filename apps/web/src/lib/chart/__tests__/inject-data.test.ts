import { describe, it, expect } from "vitest";
import { injectData } from "../inject-data";

const ORDERS = [
  { id: 1, product_id: 10, amount: 100 },
  { id: 2, product_id: 20, amount: 200 },
];

const PRODUCTS = [
  { id: 10, name: "Widget", category: "A" },
  { id: 20, name: "Gadget", category: "B" },
];

const DATASETS = { "orders.csv": ORDERS, "products.csv": PRODUCTS };

describe("injectData", () => {
  it("replaces url sentinel with matching dataset", () => {
    const spec = {
      data: { url: "orders.csv" },
      mark: "bar",
      encoding: { x: { field: "id" }, y: { field: "amount" } },
    };
    const result = injectData(spec, DATASETS);
    expect(result.data).toEqual({ values: ORDERS });
    expect(result.mark).toBe("bar");
  });

  it("replaces different url sentinels in layers", () => {
    const spec = {
      layer: [
        { data: { url: "orders.csv" }, mark: "bar", encoding: {} },
        { data: { url: "products.csv" }, mark: "point", encoding: {} },
      ],
    };
    const result = injectData(spec, DATASETS);
    const layers = result.layer as Record<string, unknown>[];
    expect(layers[0].data).toEqual({ values: ORDERS });
    expect(layers[1].data).toEqual({ values: PRODUCTS });
  });

  it("injects first dataset when spec has no data property", () => {
    const spec = { mark: "bar", encoding: {} };
    const result = injectData(spec, DATASETS);
    expect(result.data).toEqual({ values: ORDERS });
  });

  it("does not mutate original spec", () => {
    const spec = { data: { url: "orders.csv" }, mark: "bar", encoding: {} };
    const original = JSON.parse(JSON.stringify(spec));
    injectData(spec, DATASETS);
    expect(spec).toEqual(original);
  });

  it("handles faceted specs with data on inner spec", () => {
    const spec = {
      facet: { field: "category", type: "nominal" },
      spec: { data: { url: "products.csv" }, mark: "bar", encoding: {} },
    };
    const result = injectData(spec, DATASETS);
    expect((result.spec as Record<string, unknown>).data).toEqual({ values: PRODUCTS });
  });

  it("does not inject data into layer items without data (they inherit)", () => {
    const spec = {
      data: { url: "orders.csv" },
      transform: [{ aggregate: [{ op: "sum", field: "amount", as: "total" }], groupby: ["product_id"] }],
      layer: [
        { mark: "bar", encoding: { y: { field: "total" } } },
        { mark: "line", encoding: { y: { field: "total" } } },
      ],
    };
    const result = injectData(spec, DATASETS);
    expect(result.data).toEqual({ values: ORDERS });
    const layers = result.layer as Record<string, unknown>[];
    expect(layers[0].data).toBeUndefined();
    expect(layers[1].data).toBeUndefined();
  });

  it("preserves non-sentinel data (inline values)", () => {
    const spec = {
      data: { values: [{ a: 1 }] },
      mark: "bar",
      encoding: {},
    };
    const result = injectData(spec, DATASETS);
    expect(result.data).toEqual({ values: [{ a: 1 }] });
  });

  it("leaves unknown dataset sentinel unchanged", () => {
    const spec = {
      data: { url: "nonexistent.csv" },
      mark: "bar",
      encoding: {},
    };
    const result = injectData(spec, DATASETS);
    expect(result.data).toEqual({ url: "nonexistent.csv" });
  });

  it("injects data into lookup transform from.data sentinel", () => {
    const spec = {
      data: { url: "orders.csv" },
      transform: [
        {
          lookup: "product_id",
          from: {
            data: { url: "products.csv" },
            key: "id",
            fields: ["name", "category"],
          },
        },
      ],
      mark: "bar",
      encoding: {},
    };
    const result = injectData(spec, DATASETS);
    expect(result.data).toEqual({ values: ORDERS });
    const transform = (result.transform as Record<string, unknown>[])[0];
    const from = transform.from as Record<string, unknown>;
    expect(from.data).toEqual({ values: PRODUCTS });
    expect(from.key).toBe("id");
    expect(from.fields).toEqual(["name", "category"]);
  });

  it("fixes misplaced fields in lookup transform (top-level instead of inside from)", () => {
    const spec = {
      data: { url: "orders.csv" },
      transform: [
        {
          lookup: "product_id",
          fields: ["name", "category"],
          from: {
            data: { url: "products.csv" },
            key: "id",
          },
        },
      ],
      mark: "bar",
      encoding: {},
    };
    const result = injectData(spec, DATASETS);
    const transform = (result.transform as Record<string, unknown>[])[0];
    // fields should NOT be at top level
    expect(transform.fields).toBeUndefined();
    // fields should be inside from
    const from = transform.from as Record<string, unknown>;
    expect(from.fields).toEqual(["name", "category"]);
    expect(from.data).toEqual({ values: PRODUCTS });
  });

  it("does not move fields if from already has fields", () => {
    const spec = {
      data: { url: "orders.csv" },
      transform: [
        {
          lookup: "product_id",
          fields: ["name"],
          from: {
            data: { url: "products.csv" },
            key: "id",
            fields: ["category"],
          },
        },
      ],
      mark: "bar",
      encoding: {},
    };
    const result = injectData(spec, DATASETS);
    const transform = (result.transform as Record<string, unknown>[])[0];
    const from = transform.from as Record<string, unknown>;
    // from.fields should keep original value
    expect(from.fields).toEqual(["category"]);
  });

  it("injects default data into layered spec without top-level data", () => {
    const spec = {
      layer: [
        { mark: "bar", encoding: { x: { field: "product_id" }, y: { field: "amount" } } },
        { mark: { type: "rule" }, encoding: { y: { datum: 150 } } },
      ],
      title: "Test",
    };
    const result = injectData(spec, DATASETS);
    // Should inject first dataset at top level for layers to inherit
    expect(result.data).toEqual({ values: ORDERS });
    // Layers should remain unchanged (they inherit parent data)
    const layers = result.layer as Record<string, unknown>[];
    expect(layers[0].data).toBeUndefined();
    expect(layers[1].data).toBeUndefined();
  });

  it("injects default data into faceted spec without top-level data", () => {
    const spec = {
      facet: { field: "category", type: "nominal" },
      spec: { mark: "bar", encoding: { x: { field: "id" } } },
    };
    const result = injectData(spec, DATASETS);
    expect(result.data).toEqual({ values: ORDERS });
  });

  it("handles concat specs with different datasets", () => {
    const spec = {
      hconcat: [
        { data: { url: "orders.csv" }, mark: "bar", encoding: {} },
        { data: { url: "products.csv" }, mark: "point", encoding: {} },
      ],
    };
    const result = injectData(spec, DATASETS);
    const panels = result.hconcat as Record<string, unknown>[];
    expect(panels[0].data).toEqual({ values: ORDERS });
    expect(panels[1].data).toEqual({ values: PRODUCTS });
  });
});
