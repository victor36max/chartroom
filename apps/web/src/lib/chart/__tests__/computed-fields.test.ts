import { describe, it, expect } from "vitest";
import { getComputedFields } from "../computed-fields";

describe("getComputedFields", () => {
  it("returns empty array for no transforms", () => {
    expect(getComputedFields([])).toEqual([]);
  });

  it("returns empty for filter (no new fields)", () => {
    expect(getComputedFields([{ filter: "datum.x > 5" }])).toEqual([]);
  });

  it("extracts field from calculate transform", () => {
    const result = getComputedFields([{ calculate: "datum.a + datum.b", as: "total" }]);
    expect(result).toEqual([{ name: "total", type: "number", sample: [], computed: true }]);
  });

  it("extracts fields from fold transform with custom as", () => {
    const result = getComputedFields([{ fold: ["Q1", "Q2"], as: ["quarter", "amount"] }]);
    expect(result).toEqual([
      { name: "quarter", type: "string", sample: [], computed: true },
      { name: "amount", type: "number", sample: [], computed: true },
    ]);
  });

  it("uses default key/value for fold without as", () => {
    const result = getComputedFields([{ fold: ["Q1", "Q2"] }]);
    expect(result).toEqual([
      { name: "key", type: "string", sample: [], computed: true },
      { name: "value", type: "number", sample: [], computed: true },
    ]);
  });

  it("extracts fields from aggregate transform", () => {
    const result = getComputedFields([{
      aggregate: [
        { op: "sum", field: "sales", as: "total_sales" },
        { op: "mean", field: "price", as: "avg_price" },
      ],
      groupby: ["region"],
    }]);
    expect(result).toEqual([
      { name: "total_sales", type: "number", sample: [], computed: true },
      { name: "avg_price", type: "number", sample: [], computed: true },
    ]);
  });

  it("extracts fields from bin transform", () => {
    const result = getComputedFields([{ bin: true, field: "price", as: "bin_price" }]);
    expect(result).toEqual([
      { name: "bin_price", type: "number", sample: [], computed: true },
      { name: "bin_price_end", type: "number", sample: [], computed: true },
    ]);
  });

  it("extracts fields from window transform", () => {
    const result = getComputedFields([{
      window: [{ op: "rank", as: "rank" }],
      sort: [{ field: "sales", order: "descending" }],
    }]);
    expect(result).toEqual([{ name: "rank", type: "number", sample: [], computed: true }]);
  });

  it("handles chained transforms", () => {
    const result = getComputedFields([
      { calculate: "datum.price * datum.qty", as: "total" },
      { filter: "datum.total > 100" },
      { window: [{ op: "rank", field: "total", as: "rank" }] },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("total");
    expect(result[1].name).toBe("rank");
  });

  it("skips calculate without as field", () => {
    const result = getComputedFields([{ calculate: "datum.a + datum.b" }]);
    expect(result).toEqual([]);
  });
});
