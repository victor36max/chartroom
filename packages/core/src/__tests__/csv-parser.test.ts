import { describe, it, expect } from "vitest";
import { extractMetadata, metadataToContext, parseCSVString, datasetsToContext } from "../csv-parser";

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

  it("extracts categorical info for string columns with ≤20 unique values", () => {
    const data = [
      { region: "North", value: 1 },
      { region: "South", value: 2 },
      { region: "East", value: 3 },
      { region: "North", value: 4 },
    ];
    const meta = extractMetadata(data);
    const regionCol = meta.columns.find((c) => c.name === "region")!;
    expect(regionCol.categorical).toEqual({ values: ["East", "North", "South"] });
  });

  it("does not extract categorical info for string columns with >20 unique values", () => {
    const data = Array.from({ length: 21 }, (_, i) => ({ label: `item-${i}` }));
    const meta = extractMetadata(data);
    const col = meta.columns.find((c) => c.name === "label")!;
    expect(col.categorical).toBeUndefined();
  });

  it("does not extract categorical info for number columns", () => {
    const data = [
      { score: 1 },
      { score: 2 },
      { score: 3 },
    ];
    const meta = extractMetadata(data);
    const col = meta.columns.find((c) => c.name === "score")!;
    expect(col.categorical).toBeUndefined();
  });

  it("extracts dateRange with day granularity for YYYY-MM-DD dates", () => {
    const data = [
      { date: "2023-01-15", val: 1 },
      { date: "2023-06-20", val: 2 },
      { date: "2023-12-01", val: 3 },
    ];
    const meta = extractMetadata(data);
    const dateCol = meta.columns.find((c) => c.name === "date")!;
    expect(dateCol.dateRange).toEqual({
      min: "2023-01-15",
      max: "2023-12-01",
      granularity: "day",
    });
  });

  it("extracts dateRange with month granularity for YYYY-MM dates", () => {
    const data = [
      { month: "2023-01", val: 1 },
      { month: "2023-06", val: 2 },
      { month: "2023-12", val: 3 },
    ];
    const meta = extractMetadata(data);
    const col = meta.columns.find((c) => c.name === "month")!;
    expect(col.dateRange).toEqual({
      min: "2023-01",
      max: "2023-12",
      granularity: "month",
    });
  });

  it("extracts dateRange with day granularity for MM/DD/YYYY dates", () => {
    const data = [
      { date: "01/15/2023", val: 1 },
      { date: "06/20/2023", val: 2 },
    ];
    const meta = extractMetadata(data);
    const col = meta.columns.find((c) => c.name === "date")!;
    expect(col.dateRange).toBeDefined();
    expect(col.dateRange!.granularity).toBe("day");
  });

  it("extracts correct dateRange min/max for MM/DD/YYYY dates", () => {
    const data = [
      { date: "12/25/2022", val: 1 },
      { date: "01/01/2024", val: 2 },
      { date: "06/15/2023", val: 3 },
    ];
    const meta = extractMetadata(data);
    const col = meta.columns.find((c) => c.name === "date")!;
    expect(col.dateRange).toBeDefined();
    expect(col.dateRange!.min).toBe("12/25/2022");
    expect(col.dateRange!.max).toBe("01/01/2024");
  });

  it("does not extract dateRange for non-date columns", () => {
    const data = [{ name: "Alice" }, { name: "Bob" }];
    const meta = extractMetadata(data);
    expect(meta.columns[0].dateRange).toBeUndefined();
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

  it("shows full value list for categorical columns", () => {
    const data = [
      { status: "active", val: 1 },
      { status: "inactive", val: 2 },
      { status: "pending", val: 3 },
    ];
    const ctx = metadataToContext(extractMetadata(data));
    expect(ctx).toContain("active, inactive, pending");
    // The status line should show values, not sample
    const statusLine = ctx.split("\n").find((l) => l.includes("status"))!;
    expect(statusLine).not.toContain("sample:");
  });

  it("shows date range and granularity for date columns", () => {
    const data = [
      { date: "2023-01-01", val: 1 },
      { date: "2023-06-15", val: 2 },
      { date: "2023-12-31", val: 3 },
    ];
    const ctx = metadataToContext(extractMetadata(data));
    const dateLine = ctx.split("\n").find((l) => l.includes("date (date)"))!;
    expect(dateLine).toContain("range: 2023-01-01 to 2023-12-31");
    expect(dateLine).toContain("granularity: day");
    expect(dateLine).not.toContain("sample:");
  });

  it("does not show wide-format hints for unrelated numeric columns", () => {
    const data = [
      { age: 25, height: 170, weight: 70 },
    ];
    const ctx = metadataToContext(extractMetadata(data));
    expect(ctx).not.toContain("Wide-format");
  });
});

// --- parseCSVString ---

describe("parseCSVString", () => {
  it("parses CSV text into rows with metadata", () => {
    const csv = "name,value\nAlice,10\nBob,20";
    const result = parseCSVString(csv);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({ name: "Alice", value: 10 });
    expect(result.metadata.rowCount).toBe(2);
    expect(result.metadata.columns).toHaveLength(2);
  });

  it("returns errors for malformed CSV", () => {
    const csv = "";
    const result = parseCSVString(csv);
    expect(result.data).toHaveLength(0);
  });
});

// --- datasetsToContext ---

describe("datasetsToContext", () => {
  it("returns empty string for no datasets", () => {
    expect(datasetsToContext({})).toBe("");
  });

  it("formats single dataset", () => {
    const datasets = {
      "sales.csv": parseCSVString("product,amount\nWidget,100\nGadget,200"),
    };
    const ctx = datasetsToContext(datasets);
    expect(ctx).toContain("sales.csv");
    expect(ctx).toContain("product");
  });

  it("formats multiple datasets with join key hints", () => {
    const datasets = {
      "orders.csv": parseCSVString("id,product_id,amount\n1,10,100"),
      "products.csv": parseCSVString("product_id,name\n10,Widget"),
    };
    const ctx = datasetsToContext(datasets);
    expect(ctx).toContain("2 datasets");
    expect(ctx).toContain("product_id");
    expect(ctx).toContain("Join keys");
  });
});

// --- Date handling improvements ---

describe("date detection improvements", () => {
  it("detects ISO dates with timezone suffix Z", () => {
    const data = [
      { ts: "2024-01-15T10:30:00Z" },
      { ts: "2024-02-20T14:00:00Z" },
    ];
    const meta = extractMetadata(data);
    const tsCol = meta.columns.find((c) => c.name === "ts")!;
    expect(tsCol.type).toBe("date");
  });

  it("detects ISO dates with timezone offset", () => {
    const data = [
      { ts: "2024-01-15T10:30:00+05:30" },
      { ts: "2024-02-20T14:00:00-08:00" },
    ];
    const meta = extractMetadata(data);
    const tsCol = meta.columns.find((c) => c.name === "ts")!;
    expect(tsCol.type).toBe("date");
  });

  it("infers second granularity for dates with seconds", () => {
    const data = [
      { ts: "2024-01-15T10:30:45" },
      { ts: "2024-01-15T10:31:20" },
    ];
    const meta = extractMetadata(data);
    const tsCol = meta.columns.find((c) => c.name === "ts")!;
    expect(tsCol.type).toBe("date");
    expect(tsCol.dateRange?.granularity).toBe("second");
  });

  it("uses most-specific granularity for mixed date formats", () => {
    const data = [
      { d: "2024-01" },
      { d: "2024-02-15" },
    ];
    const meta = extractMetadata(data);
    const col = meta.columns.find((c) => c.name === "d")!;
    expect(col.type).toBe("date");
    // day is more specific than month, so granularity should be "day"
    expect(col.dateRange?.granularity).toBe("day");
  });
});

// --- Number type inference edge cases ---

describe("number inference edge cases", () => {
  it("does not classify 'Infinity' string as number", () => {
    const data = [
      { val: "Infinity" },
      { val: "42" },
      { val: "-Infinity" },
    ];
    const meta = extractMetadata(data);
    const col = meta.columns.find((c) => c.name === "val")!;
    expect(col.type).toBe("string");
  });

  it("classifies scientific notation as number", () => {
    const data = [
      { val: "1e5" },
      { val: "2.3e-4" },
      { val: "100" },
    ];
    const meta = extractMetadata(data);
    const col = meta.columns.find((c) => c.name === "val")!;
    expect(col.type).toBe("number");
  });
});

// --- High-cardinality threshold ---

describe("high-cardinality warning threshold", () => {
  it("warns for string columns with >20 unique values", () => {
    const data = Array.from({ length: 25 }, (_, i) => ({ name: `item_${i}` }));
    const meta = extractMetadata(data);
    const ctx = metadataToContext(meta);
    expect(ctx).toContain("High-cardinality");
    expect(ctx).toContain("25 unique values");
  });

  it("does not warn for string columns with <=20 unique values", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ name: `item_${i}` }));
    const meta = extractMetadata(data);
    const ctx = metadataToContext(meta);
    expect(ctx).not.toContain("High-cardinality");
  });
});
