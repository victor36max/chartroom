"use client";

import Papa from "papaparse";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ParsedCSV } from "@/types";

interface DataTableProps {
  csvData: ParsedCSV;
  datasetName: string;
}

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTable({ csvData, datasetName }: DataTableProps) {
  const { data, metadata } = csvData;
  const columns = metadata.columns.map((c) => c.name);
  const displayRows = data.slice(0, 100);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-xs text-muted-foreground border-b shrink-0 flex items-center justify-between">
        <span>
          {metadata.rowCount} rows, {columns.length} columns
          {metadata.rowCount > 100 && " (showing first 100)"}
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => downloadCSV(data, datasetName)}
          title="Download as CSV"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate"
                  >
                    {String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
