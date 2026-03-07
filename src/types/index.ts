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

export interface ColumnMeta {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  sample: unknown[];
  unique?: number;
  min?: number | string;
  max?: number | string;
  computed?: boolean;
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
