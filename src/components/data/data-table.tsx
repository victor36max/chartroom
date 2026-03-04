"use client";

import type { ParsedCSV } from "@/types";

interface DataTableProps {
  csvData: ParsedCSV;
}

export function DataTable({ csvData }: DataTableProps) {
  const { data, metadata } = csvData;
  const columns = metadata.columns.map((c) => c.name);
  const displayRows = data.slice(0, 100);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-xs text-muted-foreground border-b shrink-0">
        {metadata.rowCount} rows, {columns.length} columns
        {metadata.rowCount > 100 && " (showing first 100)"}
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
