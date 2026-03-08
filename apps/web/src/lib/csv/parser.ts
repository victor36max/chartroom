import Papa from "papaparse";
import type { ParsedCSV } from "@firechart/core";
import { extractMetadata } from "@firechart/core";

// Re-export shared functions from core
export { extractMetadata, metadataToContext, datasetsToContext, fileNameToDatasetName } from "@firechart/core";

// Browser-only: parse a File object
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
