export interface ChartSpec {
  marks: Array<MarkSpec>;
  title?: string;
  subtitle?: string;
  width?: number;
  height?: number;
  color?: Record<string, unknown>;
  x?: Record<string, unknown>;
  y?: Record<string, unknown>;
  fx?: Record<string, unknown>;
  fy?: Record<string, unknown>;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  style?: Record<string, unknown>;
  titleStyle?: Record<string, unknown>;
}

export interface MarkSpec {
  type: string;
  data?: string; // "csv" to reference uploaded data, or inline
  options?: Record<string, unknown>;
}

export interface ColumnMeta {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  sample: unknown[];
  unique?: number;
  min?: number | string;
  max?: number | string;
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
