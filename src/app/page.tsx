"use client";

import { useState, useRef, useCallback } from "react";
import { ChatPanel, type ChatPanelHandle } from "@/components/chat/chat-panel";
import { ChartPanel } from "@/components/chart/chart-panel";
import { DEFAULT_TIER, type ModelTier } from "@/lib/agent/models";
import type { ParsedCSV, ChartSpec } from "@/types";

export default function Home() {
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null);
  const [currentChart, setCurrentChart] = useState<ChartSpec | null>(null);
  const [tier, setTier] = useState<ModelTier>(DEFAULT_TIER);
  const chatRef = useRef<ChatPanelHandle>(null);

  const handleChartSpecEdited = useCallback((spec: ChartSpec) => {
    setCurrentChart(spec);
    chatRef.current?.sendSpecEdit(spec);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Firechart</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[420px] min-w-[320px] border-r flex flex-col">
          <ChatPanel
            ref={chatRef}
            csvData={csvData}
            onCSVParsed={setCsvData}
            onChartSpec={setCurrentChart}
            tier={tier}
            onTierChange={setTier}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChartPanel csvData={csvData} chartSpec={currentChart} onChartSpecEdited={handleChartSpecEdited} />
        </div>
      </div>
    </div>
  );
}
