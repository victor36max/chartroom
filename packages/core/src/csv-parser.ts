import Papa from "papaparse";
import type { ParsedCSV, ColumnMeta, DataMetadata, DatasetMap, DateGranularity } from "./types";

// Matches common date formats: YYYY-MM-DD, YYYY-MM, YYYY-MM-DDTHH:mm, YYYY/MM/DD, MM/DD/YYYY
// Supports timezone suffix: Z, +HH:MM, -HH:MM
const ISO_DATE_RE = /^(\d{4}[-/]\d{2}([-/]\d{2})?(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?)?|\d{1,2}\/\d{1,2}\/\d{4})$/;

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

export function parseCSVString(text: string): ParsedCSV {
  const results = Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  const data = results.data as Record<string, unknown>[];
  const errors = results.errors.map((e) => `Row ${e.row}: ${e.message}`);
  const metadata = extractMetadata(data);
  return { data, metadata, errors };
}

function inferType(values: unknown[]): ColumnMeta["type"] {
  const nonNull = values.filter((v) => v != null && v !== "");
  if (nonNull.length === 0) return "string";

  const sample = nonNull.slice(0, 100);

  if (sample.every((v) => typeof v === "number" || (typeof v === "string" && !isNaN(Number(v)) && v.trim() !== "" && v !== "Infinity" && v !== "-Infinity"))) {
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

function inferDateGranularity(sample: string): DateGranularity {
  // YYYY-MM (no day part)
  if (/^\d{4}[-/]\d{2}$/.test(sample)) return "month";
  // Has time with seconds (HH:MM:SS)
  if (/T\d{2}:\d{2}:\d{2}/.test(sample)) return "second";
  // Has time without seconds (HH:MM)
  if (/T\d{2}:\d{2}/.test(sample)) return "hour";
  // YYYY-MM-DD or MM/DD/YYYY (date only)
  return "day";
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
    const uniqueSet = new Set(nonNull);
    const unique = uniqueSet.size;
    const sample = nonNull.slice(0, 5);

    const col: ColumnMeta = { name, type, sample, unique };

    if (type === "string" && unique <= 20) {
      col.categorical = { values: ([...uniqueSet] as string[]).sort() };
    }

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

    if (type === "date" && nonNull.length > 0) {
      const dateStrings = (nonNull as string[]).slice().sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );
      // Use the most specific granularity found across a sample of dates
      const granularityRank: Record<DateGranularity, number> = {
        year: 0, quarter: 1, month: 2, week: 3, day: 4, hour: 5, minute: 6, second: 7,
      };
      let bestGranularity = inferDateGranularity(dateStrings[0]);
      const sampleDates = dateStrings.slice(0, 20);
      for (const d of sampleDates) {
        const g = inferDateGranularity(d);
        if (granularityRank[g] > granularityRank[bestGranularity]) {
          bestGranularity = g;
        }
      }
      col.dateRange = {
        min: dateStrings[0],
        max: dateStrings[dateStrings.length - 1],
        granularity: bestGranularity,
      };
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

export function datasetsToContext(datasets: DatasetMap): string {
  const entries = Object.entries(datasets);
  if (entries.length === 0) return "";
  if (entries.length === 1) {
    const [name, parsed] = entries[0];
    return `Dataset "${name}" (reference with \`{ "url": "${name}" }\`):\n${metadataToContext(parsed.metadata)}`;
  }
  const sections = entries.map(([name, parsed]) =>
    `### ${name} (reference with \`{ "url": "${name}" }\`)\n${metadataToContext(parsed.metadata)}`
  );

  // Detect shared column names across datasets as potential join keys
  const columnSets = entries.map(([name, parsed]) => ({
    name,
    cols: new Set(parsed.metadata.columns.map(c => c.name)),
  }));
  const joinKeys: string[] = [];
  for (let i = 0; i < columnSets.length; i++) {
    for (let j = i + 1; j < columnSets.length; j++) {
      for (const col of columnSets[i].cols) {
        if (columnSets[j].cols.has(col)) {
          joinKeys.push(`\`${col}\` (${columnSets[i].name} ↔ ${columnSets[j].name})`);
        }
      }
    }
  }

  const header = `${entries.length} datasets available. Use lookup transforms to join across datasets.`;
  const keyHint = joinKeys.length > 0 ? `\nJoin keys: ${joinKeys.join(", ")}` : "";
  return `${header}${keyHint}\n\n${sections.join("\n\n")}`;
}

const EXCEL_EXTENSIONS = new Set([".xls", ".xlsx", ".xlsm", ".xlsb"]);

export function isExcelFile(filename: string): boolean {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  return EXCEL_EXTENSIONS.has(ext);
}

export function excelToCSVName(filename: string, sheetName?: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  return sheetName ? `${base} - ${sheetName}.csv` : `${base}.csv`;
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
    if (col.dateRange) {
      desc += `, range: ${col.dateRange.min} to ${col.dateRange.max}, granularity: ${col.dateRange.granularity}`;
    }
    if (col.categorical) {
      desc += `: ${col.categorical.values.join(", ")}`;
    } else if (!col.dateRange && col.sample.length > 0) {
      desc += ` — sample: ${col.sample.slice(0, 3).join(", ")}`;
    }
    lines.push(desc);
  }

  // Warn about high-cardinality categorical columns
  const highCardCols = metadata.columns.filter(
    (c) => c.type === "string" && c.unique !== undefined && c.unique > 20
  );
  if (highCardCols.length > 0) {
    lines.push("");
    lines.push("⚠ High-cardinality columns:");
    for (const col of highCardCols) {
      lines.push(`  - ${col.name}: ${col.unique} unique values — too many for a categorical axis. Consider filtering to top/bottom N, binning, or using a different chart type.`);
    }
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
