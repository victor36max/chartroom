"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ChartPanel } from "@/components/chart/chart-panel";
import type { ParsedCSV, ChartSpec } from "@/types";

export default function Home() {
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null);
  const [currentChart, setCurrentChart] = useState<ChartSpec | null>(null);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Firechart</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[420px] min-w-[320px] border-r flex flex-col">
          <ChatPanel
            csvData={csvData}
            onCSVParsed={setCsvData}
            onChartSpec={setCurrentChart}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChartPanel csvData={csvData} chartSpec={currentChart} />
        </div>
      </div>
    </div>
  );
}
