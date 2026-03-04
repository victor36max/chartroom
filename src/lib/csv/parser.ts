import Papa from "papaparse";
import type { ParsedCSV, ColumnMeta, DataMetadata } from "@/types";

export function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete(results) {
        const data = results.data as Record<string, unknown>[];
        const errors = results.errors.map(
          (e) => `Row ${e.row}: ${e.message}`
        );
        const metadata = extractMetadata(data);
        resolve({ data, metadata, errors });
      },
      error(err: Error) {
        resolve({ data: [], metadata: { rowCount: 0, columns: [] }, errors: [err.message] });
      },
    });
  });
}

function inferType(values: unknown[]): ColumnMeta["type"] {
  const nonNull = values.filter((v) => v != null && v !== "");
  if (nonNull.length === 0) return "string";

  const sample = nonNull.slice(0, 100);

  if (sample.every((v) => typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)) && v.trim() !== ""))) {
    return "number";
  }

  if (sample.every((v) => typeof v === "boolean")) {
    return "boolean";
  }

  // Check for dates
  if (sample.every((v) => typeof v === "string" && !isNaN(Date.parse(v as string)))) {
    return "date";
  }

  return "string";
}

function extractMetadata(data: Record<string, unknown>[]): DataMetadata {
  if (data.length === 0) return { rowCount: 0, columns: [] };

  const columnNames = Object.keys(data[0]);
  const columns: ColumnMeta[] = columnNames.map((name) => {
    const values = data.map((row) => row[name]);
    const type = inferType(values);
    const nonNull = values.filter((v) => v != null && v !== "");
    const unique = new Set(nonNull).size;
    const sample = nonNull.slice(0, 5);

    const col: ColumnMeta = { name, type, sample, unique };

    if (type === "number") {
      const nums = nonNull.filter((v) => typeof v === "number") as number[];
      if (nums.length > 0) {
        col.min = Math.min(...nums);
        col.max = Math.max(...nums);
      }
    }

    return col;
  });

  return { rowCount: data.length, columns };
}

export function metadataToContext(metadata: DataMetadata): string {
  const lines = [
    `Dataset: ${metadata.rowCount} rows, ${metadata.columns.length} columns`,
    "",
    "Columns:",
  ];

  for (const col of metadata.columns) {
    let desc = `- ${col.name} (${col.type})`;
    if (col.unique !== undefined) desc += ` — ${col.unique} unique values`;
    if (col.min !== undefined) desc += `, range: ${col.min}–${col.max}`;
    if (col.sample.length > 0) desc += ` — sample: ${col.sample.slice(0, 3).join(", ")}`;
    lines.push(desc);
  }

  return lines.join("\n");
}
