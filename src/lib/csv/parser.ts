import Papa from "papaparse";
import type { ParsedCSV, ColumnMeta, DataMetadata } from "@/types";

// Matches common date formats: YYYY-MM-DD, YYYY-MM, YYYY-MM-DDTHH:mm, YYYY/MM/DD, MM/DD/YYYY
const ISO_DATE_RE = /^(\d{4}[-/]\d{2}([-/]\d{2})?(T\d{2}:\d{2}(:\d{2})?)?|\d{1,2}\/\d{1,2}\/\d{4})$/;

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

  // Check for dates — use explicit patterns to avoid false positives from Date.parse
  // (e.g. Date.parse("1") is valid but "1" is not a date)
  if (sample.every((v) => typeof v === "string" && ISO_DATE_RE.test(v as string))) {
    return "date";
  }

  return "string";
}

export function extractMetadata(data: Record<string, unknown>[]): DataMetadata {
  if (data.length === 0) return { rowCount: 0, columns: [] };

  const columnNames = Object.keys(data[0]);

  // Single pass: collect per-column values instead of iterating all rows once per column
  const colValues = new Map<string, unknown[]>();
  for (const name of columnNames) colValues.set(name, []);
  for (const row of data) {
    for (const name of columnNames) colValues.get(name)!.push(row[name]);
  }

  const columns: ColumnMeta[] = columnNames.map((name) => {
    const values = colValues.get(name)!;
    const type = inferType(values);
    const nonNull = values.filter((v) => v != null && v !== "");
    const unique = new Set(nonNull).size;
    const sample = nonNull.slice(0, 5);

    const col: ColumnMeta = { name, type, sample, unique };

    if (type === "number") {
      let min = Infinity;
      let max = -Infinity;
      for (const v of nonNull) {
        if (typeof v === "number") {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      if (min !== Infinity) {
        col.min = min;
        col.max = max;
      }
    }

    return col;
  });

  return { rowCount: data.length, columns };
}

/**
 * Detect groups of 3+ numeric columns that share a common prefix or suffix,
 * suggesting they are wide-format data that should be melted.
 */
function detectWideFormat(columns: ColumnMeta[]): string[] {
  const numericCols = columns.filter((c) => c.type === "number");
  if (numericCols.length < 3) return [];

  const hints: string[] = [];
  const seen = new Set<string>();

  // Group by shared suffix (e.g. q1_score, q2_score, q3_score → suffix "score")
  const suffixGroups = new Map<string, string[]>();
  for (const col of numericCols) {
    const parts = col.name.split(/[_\-]/);
    if (parts.length >= 2) {
      const suffix = parts.slice(1).join("_");
      let group = suffixGroups.get(suffix);
      if (!group) { group = []; suffixGroups.set(suffix, group); }
      group.push(col.name);
    }
  }

  // Group by shared prefix (e.g. revenue_2020, revenue_2021 → prefix "revenue")
  const prefixGroups = new Map<string, string[]>();
  for (const col of numericCols) {
    const parts = col.name.split(/[_\-]/);
    if (parts.length >= 2) {
      const prefix = parts[0];
      let group = prefixGroups.get(prefix);
      if (!group) { group = []; prefixGroups.set(prefix, group); }
      group.push(col.name);
    }
  }

  suffixGroups.forEach((cols, suffix) => {
    if (cols.length >= 3) {
      const key = cols.slice().sort().join(",");
      if (seen.has(key)) return;
      seen.add(key);
      hints.push(
        `Columns ${cols.join(", ")} appear to be wide-format (same measure "${suffix}" across categories). ` +
        `To compare them, use melt: { "columns": ${JSON.stringify(cols)}, "key": "category", "value": "${suffix}" }`,
      );
    }
  });
  prefixGroups.forEach((cols, prefix) => {
    if (cols.length >= 3) {
      const key = cols.slice().sort().join(",");
      if (seen.has(key)) return;
      seen.add(key);
      hints.push(
        `Columns ${cols.join(", ")} appear to be wide-format (same measure "${prefix}" across categories). ` +
        `To compare them, use melt: { "columns": ${JSON.stringify(cols)}, "key": "category", "value": "${prefix}" }`,
      );
    }
  });

  return hints;
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

  const wideHints = detectWideFormat(metadata.columns);
  if (wideHints.length > 0) {
    lines.push("");
    lines.push("Wide-format columns detected:");
    for (const hint of wideHints) {
      lines.push(`  ${hint}`);
    }
  }

  return lines.join("\n");
}
