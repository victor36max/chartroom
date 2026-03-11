import type { ParsedCSV } from "./types";
import { extractMetadata } from "./csv-parser";

/**
 * Get sheet names from an Excel file (browser path).
 * Uses bookSheets option to avoid parsing cell data.
 */
export async function getSheetNames(file: File): Promise<string[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { bookSheets: true });
  return wb.SheetNames;
}

/**
 * Get sheet names from a buffer (Node path).
 */
export function getSheetNamesFromBuffer(buffer: ArrayBuffer): string[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx") as typeof import("xlsx");
  const wb = XLSX.read(buffer, { bookSheets: true });
  return wb.SheetNames;
}

/**
 * Parse a single sheet from an Excel file (browser path).
 */
export async function parseExcelSheet(
  file: File,
  sheetName: string
): Promise<ParsedCSV> {
  try {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { cellDates: true });
    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      return {
        data: [],
        metadata: { rowCount: 0, columns: [] },
        errors: [`Sheet "${sheetName}" not found`],
      };
    }
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });
    // Convert Date objects to ISO strings for consistency with CSV pipeline
    normalizeDates(data);
    const metadata = extractMetadata(data);
    return { data, metadata, errors: [] };
  } catch (err) {
    return {
      data: [],
      metadata: { rowCount: 0, columns: [] },
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

/**
 * Parse a single sheet from a buffer (Node/MCP path).
 * If no sheetName is provided, uses the first sheet.
 */
export function parseExcelBufferSheet(
  buffer: ArrayBuffer,
  sheetName?: string
): ParsedCSV {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require("xlsx") as typeof import("xlsx");
    const wb = XLSX.read(buffer, { cellDates: true });
    const name = sheetName ?? wb.SheetNames[0];
    if (!name) {
      return {
        data: [],
        metadata: { rowCount: 0, columns: [] },
        errors: ["No sheets found in workbook"],
      };
    }
    const sheet = wb.Sheets[name];
    if (!sheet) {
      return {
        data: [],
        metadata: { rowCount: 0, columns: [] },
        errors: [`Sheet "${name}" not found`],
      };
    }
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });
    normalizeDates(data);
    const metadata = extractMetadata(data);
    return { data, metadata, errors: [] };
  } catch (err) {
    return {
      data: [],
      metadata: { rowCount: 0, columns: [] },
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

/** Convert Date objects to ISO date strings for consistency with CSV pipeline. */
function normalizeDates(data: Record<string, unknown>[]): void {
  for (const row of data) {
    for (const key of Object.keys(row)) {
      const val = row[key];
      if (val instanceof Date) {
        row[key] = val.toISOString().split("T")[0];
      }
    }
  }
}
