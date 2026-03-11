import { describe, it, expect } from "vitest";
import XLSX from "xlsx";
import {
  getSheetNamesFromBuffer,
  parseExcelBufferSheet,
} from "../excel-parser";
import { isExcelFile, excelToCSVName } from "../csv-parser";

function createWorkbook(
  sheets: Record<string, Record<string, unknown>[]>
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return buf as ArrayBuffer;
}

describe("getSheetNamesFromBuffer", () => {
  it("returns sheet names from a workbook", () => {
    const buffer = createWorkbook({
      Sales: [{ product: "A", amount: 10 }],
      Inventory: [{ product: "A", stock: 50 }],
    });
    const names = getSheetNamesFromBuffer(buffer);
    expect(names).toEqual(["Sales", "Inventory"]);
  });

  it("returns single sheet name", () => {
    const buffer = createWorkbook({
      Sheet1: [{ x: 1 }],
    });
    const names = getSheetNamesFromBuffer(buffer);
    expect(names).toEqual(["Sheet1"]);
  });
});

describe("parseExcelBufferSheet", () => {
  it("parses a sheet into ParsedCSV format", () => {
    const buffer = createWorkbook({
      Data: [
        { name: "Alice", age: 30, city: "NYC" },
        { name: "Bob", age: 25, city: "LA" },
        { name: "Charlie", age: 35, city: "NYC" },
      ],
    });
    const result = parseExcelBufferSheet(buffer, "Data");
    expect(result.errors).toEqual([]);
    expect(result.data).toHaveLength(3);
    expect(result.metadata.rowCount).toBe(3);
    expect(result.metadata.columns).toHaveLength(3);

    const ageCol = result.metadata.columns.find((c) => c.name === "age")!;
    expect(ageCol.type).toBe("number");
    expect(ageCol.min).toBe(25);
    expect(ageCol.max).toBe(35);
  });

  it("uses first sheet when no sheet name provided", () => {
    const buffer = createWorkbook({
      First: [{ val: 1 }],
      Second: [{ val: 2 }],
    });
    const result = parseExcelBufferSheet(buffer);
    expect(result.data).toEqual([{ val: 1 }]);
  });

  it("returns error for non-existent sheet", () => {
    const buffer = createWorkbook({
      Sheet1: [{ x: 1 }],
    });
    const result = parseExcelBufferSheet(buffer, "Missing");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Missing");
    expect(result.data).toEqual([]);
  });

  it("handles empty sheet", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, ws, "Empty");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const result = parseExcelBufferSheet(buffer, "Empty");
    expect(result.data).toEqual([]);
    expect(result.metadata.rowCount).toBe(0);
  });

  it("preserves numeric values as numbers", () => {
    const buffer = createWorkbook({
      Sheet1: [{ price: 19.99, quantity: 5 }],
    });
    const result = parseExcelBufferSheet(buffer, "Sheet1");
    expect(typeof result.data[0].price).toBe("number");
    expect(typeof result.data[0].quantity).toBe("number");
  });
});

describe("isExcelFile", () => {
  it("returns true for Excel extensions", () => {
    expect(isExcelFile("data.xlsx")).toBe(true);
    expect(isExcelFile("data.xls")).toBe(true);
    expect(isExcelFile("data.XLSX")).toBe(true);
    expect(isExcelFile("data.xlsm")).toBe(true);
    expect(isExcelFile("data.xlsb")).toBe(true);
  });

  it("returns false for non-Excel extensions", () => {
    expect(isExcelFile("data.csv")).toBe(false);
    expect(isExcelFile("data.tsv")).toBe(false);
    expect(isExcelFile("data.json")).toBe(false);
  });
});

describe("excelToCSVName", () => {
  it("converts filename without sheet name", () => {
    expect(excelToCSVName("sales.xlsx")).toBe("sales.csv");
  });

  it("converts filename with sheet name", () => {
    expect(excelToCSVName("sales.xlsx", "Q1")).toBe("sales - Q1.csv");
  });

  it("handles .xls extension", () => {
    expect(excelToCSVName("data.xls")).toBe("data.csv");
  });
});
