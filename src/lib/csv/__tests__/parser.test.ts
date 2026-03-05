import { describe, it, expect } from "vitest";
import { extractMetadata, metadataToContext } from "../parser";

// --- extractMetadata ---

describe("extractMetadata", () => {
  it("returns empty metadata for empty data", () => {
    const result = extractMetadata([]);
    expect(result).toEqual({ rowCount: 0, columns: [] });
  });

  it("detects number columns with min/max/unique", () => {
    const data = [
      { id: 1, value: 10 },
      { id: 2, value: 20 },
      { id: 3, value: 30 },
    ];
    const meta = extractMetadata(data);
    expect(meta.rowCount).toBe(3);

    const valueCol = meta.columns.find((c) => c.name === "value")!;
    expect(valueCol.type).toBe("number");
    expect(valueCol.min).toBe(10);
    expect(valueCol.max).toBe(30);
    expect(valueCol.unique).toBe(3);
  });

  it("detects string columns", () => {
    const data = [
      { name: "Alice", city: "NYC" },
      { name: "Bob", city: "LA" },
      { name: "Charlie", city: "NYC" },
    ];
    const meta = extractMetadata(data);
    const cityCol = meta.columns.find((c) => c.name === "city")!;
    expect(cityCol.type).toBe("string");
    expect(cityCol.unique).toBe(2);
    expect(cityCol.sample).toEqual(["NYC", "LA", "NYC"]);
  });

  it("detects date columns (ISO YYYY-MM-DD)", () => {
    const data = [
      { date: "2024-01-15", val: 1 },
      { date: "2024-02-20", val: 2 },
    ];
    const meta = extractMetadata(data);
    const dateCol = meta.columns.find((c) => c.name === "date")!;
    expect(dateCol.type).toBe("date");
  });

  it("detects date columns (YYYY-MM)", () => {
    const data = [
      { month: "2024-01", val: 1 },
      { month: "2024-06", val: 2 },
    ];
    const meta = extractMetadata(data);
    expect(meta.columns.find((c) => c.name === "month")!.type).toBe("date");
  });

  it("detects date columns (MM/DD/YYYY)", () => {
    const data = [
      { date: "01/15/2024", val: 1 },
      { date: "02/20/2024", val: 2 },
    ];
    const meta = extractMetadata(data);
    expect(meta.columns.find((c) => c.name === "date")!.type).toBe("date");
  });

  it("detects boolean columns", () => {
    const data = [
      { active: true, name: "A" },
      { active: false, name: "B" },
      { active: true, name: "C" },
    ];
    const meta = extractMetadata(data);
    expect(meta.columns.find((c) => c.name === "active")!.type).toBe("boolean");
  });

  it("handles null and empty values gracefully", () => {
    const data = [
      { name: "Alice", score: null },
      { name: "", score: 10 },
      { name: "Bob", score: 20 },
    ];
    const meta = extractMetadata(data);
    expect(meta.rowCount).toBe(3);

    const scoreCol = meta.columns.find((c) => c.name === "score")!;
    expect(scoreCol.type).toBe("number");
    expect(scoreCol.min).toBe(10);
    expect(scoreCol.max).toBe(20);
    expect(scoreCol.unique).toBe(2); // null excluded
  });

  it("provides sample values (up to 5)", () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ label: `item-${i}` }));
    const meta = extractMetadata(data);
    const col = meta.columns[0];
    expect(col.sample.length).toBe(5);
    expect(col.sample[0]).toBe("item-0");
  });

  it("treats numeric strings as number type", () => {
    const data = [
      { val: "100" },
      { val: "200" },
      { val: "300" },
    ];
    const meta = extractMetadata(data);
    expect(meta.columns[0].type).toBe("number");
  });
});

// --- metadataToContext ---

describe("metadataToContext", () => {
  it("formats basic metadata correctly", () => {
    const meta = extractMetadata([
      { name: "Alice", score: 95 },
      { name: "Bob", score: 87 },
    ]);
    const ctx = metadataToContext(meta);
    expect(ctx).toContain("2 rows");
    expect(ctx).toContain("2 columns");
    expect(ctx).toContain("name (string)");
    expect(ctx).toContain("score (number)");
    expect(ctx).toContain("range: 87");
  });

  it("includes wide-format hints for 3+ numeric columns with shared prefix", () => {
    const data = [
      { category: "A", revenue_2020: 10, revenue_2021: 20, revenue_2022: 30 },
      { category: "B", revenue_2020: 40, revenue_2021: 50, revenue_2022: 60 },
    ];
    const ctx = metadataToContext(extractMetadata(data));
    expect(ctx).toContain("Wide-format");
    expect(ctx).toContain("melt");
  });

  it("includes wide-format hints for 3+ numeric columns with shared suffix", () => {
    const data = [
      { category: "A", q1_score: 10, q2_score: 20, q3_score: 30 },
      { category: "B", q1_score: 40, q2_score: 50, q3_score: 60 },
    ];
    const ctx = metadataToContext(extractMetadata(data));
    expect(ctx).toContain("Wide-format");
    expect(ctx).toContain("melt");
  });

  it("does not show wide-format hints when fewer than 3 numeric columns", () => {
    const data = [
      { name: "A", val1: 10, val2: 20 },
    ];
    const ctx = metadataToContext(extractMetadata(data));
    expect(ctx).not.toContain("Wide-format");
  });

  it("does not show wide-format hints for unrelated numeric columns", () => {
    const data = [
      { age: 25, height: 170, weight: 70 },
    ];
    const ctx = metadataToContext(extractMetadata(data));
    expect(ctx).not.toContain("Wide-format");
  });
});
