import type { TopLevelSpec } from "vega-lite";

export type ChartSpec = TopLevelSpec;

export type ThemeId =
  | "default"
  | "dark"
  | "excel"
  | "fivethirtyeight"
  | "ggplot2"
  | "googlecharts"
  | "latimes"
  | "powerbi"
  | "quartz"
  | "urbaninstitute"
  | "vox";

export interface CategoricalInfo {
  values: string[];
}

export type DateGranularity = "year" | "quarter" | "month" | "week" | "day" | "hour" | "minute" | "second";

export interface ColumnMeta {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  sample: unknown[];
  unique?: number;
  min?: number | string;
  max?: number | string;
  nullCount?: number;
  zeroCount?: number;
  negativeCount?: number;
  median?: number;
  topValues?: Array<{ value: string; count: number }>;
  computed?: boolean;
  categorical?: CategoricalInfo;
  dateRange?: { min: string; max: string; granularity: DateGranularity };
}

export interface DataMetadata {
  rowCount: number;
  columns: ColumnMeta[];
}

export interface ParsedCSV {
  data: Record<string, unknown>[];
  metadata: DataMetadata;
  errors: string[];
}

export type DatasetMap = Record<string, ParsedCSV>;
