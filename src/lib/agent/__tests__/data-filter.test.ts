import { describe, it, expect } from "vitest";
import { filterData } from "../data-filter";

const sampleData = [
  { product: "A", revenue: 100, quantity: 10 },
  { product: "B", revenue: 500, quantity: 5 },
  { product: "C", revenue: 300, quantity: 8 },
  { product: "D", revenue: 200, quantity: 15 },
  { product: "E", revenue: 400, quantity: 3 },
];

describe("filterData — raw mode", () => {
  it("returns top N rows by numeric column", () => {
    const result = filterData(sampleData, {
      column: "revenue",
      direction: "top",
      n: 3,
    });
    expect(result).toEqual({
      rows: [
        { product: "B", revenue: 500, quantity: 5 },
        { product: "E", revenue: 400, quantity: 3 },
        { product: "C", revenue: 300, quantity: 8 },
      ],
      total: 5,
    });
  });

  it("returns bottom N rows by numeric column", () => {
    const result = filterData(sampleData, {
      column: "revenue",
      direction: "bottom",
      n: 2,
    });
    expect(result).toEqual({
      rows: [
        { product: "A", revenue: 100, quantity: 10 },
        { product: "D", revenue: 200, quantity: 15 },
      ],
      total: 5,
    });
  });

  it("handles n larger than dataset", () => {
    const result = filterData(sampleData, {
      column: "revenue",
      direction: "top",
      n: 100,
    });
    expect(result.rows).toHaveLength(5);
    expect(result.total).toBe(5);
  });

  it("skips rows with null/undefined values in sort column", () => {
    const dataWithNulls = [
      ...sampleData,
      { product: "F", revenue: null, quantity: 1 },
    ];
    const result = filterData(dataWithNulls, {
      column: "revenue",
      direction: "top",
      n: 2,
    });
    expect(result.rows).toHaveLength(2);
    expect(result.total).toBe(6);
  });

  it("handles empty data", () => {
    const result = filterData([], {
      column: "revenue",
      direction: "top",
      n: 5,
    });
    expect(result).toEqual({ rows: [], total: 0 });
  });

  it("converts string numbers for sorting", () => {
    const stringData = [
      { name: "A", value: "100" },
      { name: "B", value: "50" },
      { name: "C", value: "200" },
    ];
    const result = filterData(stringData, {
      column: "value",
      direction: "top",
      n: 2,
    });
    expect(result.rows[0]).toEqual({ name: "C", value: "200" });
    expect(result.rows[1]).toEqual({ name: "A", value: "100" });
  });
});

describe("filterData — aggregated mode", () => {
  const salesData = [
    { product: "A", region: "North", revenue: 100 },
    { product: "A", region: "South", revenue: 200 },
    { product: "B", region: "North", revenue: 150 },
    { product: "B", region: "South", revenue: 350 },
    { product: "C", region: "North", revenue: 50 },
    { product: "C", region: "South", revenue: 250 },
  ];

  it("returns top N categories by sum", () => {
    const result = filterData(salesData, {
      column: "revenue",
      direction: "top",
      n: 2,
      groupBy: "product",
      aggregate: "sum",
    });
    expect(result).toEqual({
      categories: [
        { name: "B", value: 500 },
        { name: "A", value: 300 },
      ],
      total_groups: 3,
    });
  });

  it("returns bottom N categories by mean", () => {
    const result = filterData(salesData, {
      column: "revenue",
      direction: "bottom",
      n: 1,
      groupBy: "product",
      aggregate: "mean",
    });
    expect(result).toEqual({
      categories: [{ name: "C", value: 150 }],
      total_groups: 3,
    });
  });

  it("returns top N categories by count", () => {
    const mixedData = [
      { category: "X", val: 1 },
      { category: "X", val: 2 },
      { category: "X", val: 3 },
      { category: "Y", val: 1 },
      { category: "Z", val: 1 },
      { category: "Z", val: 2 },
    ];
    const result = filterData(mixedData, {
      column: "val",
      direction: "top",
      n: 2,
      groupBy: "category",
      aggregate: "count",
    });
    expect(result).toEqual({
      categories: [
        { name: "X", value: 3 },
        { name: "Z", value: 2 },
      ],
      total_groups: 3,
    });
  });

  it("returns top N categories by max", () => {
    const result = filterData(salesData, {
      column: "revenue",
      direction: "top",
      n: 1,
      groupBy: "product",
      aggregate: "max",
    });
    expect(result).toEqual({
      categories: [{ name: "B", value: 350 }],
      total_groups: 3,
    });
  });

  it("returns bottom N categories by min", () => {
    const result = filterData(salesData, {
      column: "revenue",
      direction: "bottom",
      n: 1,
      groupBy: "product",
      aggregate: "min",
    });
    expect(result).toEqual({
      categories: [{ name: "C", value: 50 }],
      total_groups: 3,
    });
  });

  it("handles empty data in aggregated mode", () => {
    const result = filterData([], {
      column: "revenue",
      direction: "top",
      n: 5,
      groupBy: "product",
      aggregate: "sum",
    });
    expect(result).toEqual({ categories: [], total_groups: 0 });
  });
});
