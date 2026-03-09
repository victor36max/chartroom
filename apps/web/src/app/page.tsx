"use client";

import { useState, useRef, useCallback } from "react";
import { ChatPanel, type ChatPanelHandle } from "@/components/chat/chat-panel";
import { ChartPanel } from "@/components/chart/chart-panel";
import { DEFAULT_TIER, type ModelTier } from "@/lib/agent/models";
import { parseCSV, fileNameToDatasetName } from "@/lib/csv/parser";
import type { ParsedCSV, DatasetMap, ChartSpec, ThemeId } from "@/types";

export default function Home() {
  const [datasets, setDatasets] = useState<DatasetMap>({});
  const [currentChart, setCurrentChart] = useState<ChartSpec | null>(null);
  const [tier, setTier] = useState<ModelTier>(DEFAULT_TIER);
  const [themeId, setThemeId] = useState<ThemeId>("default");
  const [isAIBusy, setIsAIBusy] = useState(false);
  const chatRef = useRef<ChatPanelHandle>(null);

  const handleStatusChange = useCallback((status: string) => {
    setIsAIBusy(status === "submitted" || status === "streaming");
  }, []);

  const handleCSVParsed = useCallback((name: string, parsed: ParsedCSV) => {
    setDatasets((prev) => ({ ...prev, [name]: parsed }));
  }, []);

  const handleDatasetRemoved = useCallback((name: string) => {
    setDatasets((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    for (const file of files) {
      const result = await parseCSV(file);
      if (result.errors.length > 0 && result.data.length === 0) continue;
      const name = fileNameToDatasetName(file.name);
      handleCSVParsed(name, result);
    }
  }, [handleCSVParsed]);

  const handleChartSpecEdited = useCallback((spec: ChartSpec) => {
    setCurrentChart(spec);
    chatRef.current?.sendSpecEdit(spec);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b px-4 py-2">
        <h1 className="text-lg font-semibold">⛵ Chartroom</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[420px] min-w-[320px] border-r flex flex-col">
          <ChatPanel
            ref={chatRef}
            datasets={datasets}
            onCSVParsed={handleCSVParsed}
            onDatasetRemoved={handleDatasetRemoved}
            onChartSpec={setCurrentChart}
            tier={tier}
            onTierChange={setTier}
            onStatusChange={handleStatusChange}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChartPanel datasets={datasets} chartSpec={currentChart} onChartSpecEdited={handleChartSpecEdited} onFilesSelected={handleFilesSelected} themeId={themeId} onThemeChange={setThemeId} isLoading={isAIBusy} />
        </div>
      </div>
    </div>
  );
}
