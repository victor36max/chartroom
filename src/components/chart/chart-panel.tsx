"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartRenderer } from "@/components/chart/chart-renderer";
import { DataTable } from "@/components/data/data-table";
import type { ParsedCSV, ChartSpec } from "@/types";

interface ChartPanelProps {
  csvData: ParsedCSV | null;
  chartSpec: ChartSpec | null;
}

export function ChartPanel({ csvData, chartSpec }: ChartPanelProps) {
  const hasData = csvData && csvData.data.length > 0;

  return (
    <Tabs defaultValue="chart" className="flex flex-col h-full">
      <div className="border-b px-4">
        <TabsList className="h-10">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="data" disabled={!hasData}>
            Data
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="chart" className="flex-1 m-0 overflow-auto">
        {chartSpec && hasData ? (
          <ChartRenderer spec={chartSpec} data={csvData.data} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">
              {hasData
                ? "Ask the AI to create a chart from your data"
                : "Upload a CSV to get started"}
            </p>
          </div>
        )}
      </TabsContent>
      <TabsContent value="data" className="flex-1 m-0 overflow-hidden flex flex-col">
        {hasData && <DataTable csvData={csvData} />}
      </TabsContent>
    </Tabs>
  );
}
