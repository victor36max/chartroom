"use client";

import { useState, useRef, useCallback } from "react";
import { ChatPanel, type ChatPanelHandle } from "@/components/chat/chat-panel";
import { ChartPanel } from "@/components/chart/chart-panel";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { isAuthEnabled } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { LoginModal } from "@/components/auth/login-modal";
import { AccountDropdown } from "@/components/auth/account-dropdown";
import { Button } from "@/components/ui/button";
import { DEFAULT_TIER, type ModelTier } from "@/lib/agent/models";
import {
  parseCSV,
  isExcelFile,
  excelToCSVName,
  getSheetNames,
  parseExcelSheet,
} from "@/lib/csv/parser";
import { SheetPickerDialog } from "@/components/data/sheet-picker-dialog";
import type { ParsedCSV, DatasetMap, ChartSpec, ThemeId } from "@/types";

export default function Home() {
  const { user, isLoading: authLoading, openLogin } = useAuth();
  const [datasets, setDatasets] = useState<DatasetMap>({});
  const [currentChart, setCurrentChart] = useState<ChartSpec | null>(null);
  const [tier, setTier] = useState<ModelTier>(DEFAULT_TIER);
  const [themeId, setThemeId] = useState<ThemeId>("default");
  const [isAIBusy, setIsAIBusy] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "chart">("chat");
  const [pendingExcelFile, setPendingExcelFile] = useState<File | null>(null);
  const [pendingSheetNames, setPendingSheetNames] = useState<string[]>([]);
  const [sheetPickerOpen, setSheetPickerOpen] = useState(false);
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
    if (isAuthEnabled() && !user) {
      openLogin();
      return;
    }
    for (const file of files) {
      if (isExcelFile(file.name)) {
        const sheets = await getSheetNames(file);
        if (sheets.length === 0) continue;
        if (sheets.length === 1) {
          const result = await parseExcelSheet(file, sheets[0]);
          if (result.errors.length > 0 && result.data.length === 0) continue;
          handleCSVParsed(excelToCSVName(file.name), result);
        } else {
          setPendingExcelFile(file);
          setPendingSheetNames(sheets);
          setSheetPickerOpen(true);
        }
      } else {
        const result = await parseCSV(file);
        if (result.errors.length > 0 && result.data.length === 0) continue;
        handleCSVParsed(file.name, result);
      }
    }
  }, [handleCSVParsed, user, openLogin]);

  const handleSheetsSelected = useCallback(async (sheets: string[]) => {
    if (!pendingExcelFile) return;
    for (const sheet of sheets) {
      const result = await parseExcelSheet(pendingExcelFile, sheet);
      if (result.errors.length > 0 && result.data.length === 0) continue;
      const name = sheets.length === 1
        ? excelToCSVName(pendingExcelFile.name)
        : excelToCSVName(pendingExcelFile.name, sheet);
      handleCSVParsed(name, result);
    }
    setPendingExcelFile(null);
    setPendingSheetNames([]);
  }, [pendingExcelFile, handleCSVParsed]);

  const handleLoadSampleData = useCallback(async () => {
    if (isAuthEnabled() && !user) {
      openLogin();
      return;
    }
    const response = await fetch("/test-data.csv");
    const blob = await response.blob();
    const file = new File([blob], "test-data.csv", { type: "text/csv" });
    await handleFilesSelected([file]);
  }, [handleFilesSelected, user, openLogin]);

  const handleChartSpec = useCallback((spec: ChartSpec) => {
    setCurrentChart(spec);
    setMobileTab("chart");
  }, []);

  const handleChartSpecEdited = useCallback((spec: ChartSpec) => {
    setCurrentChart(spec);
    chatRef.current?.sendSpecEdit(spec);
  }, []);

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b px-3 md:px-4 py-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold">⛵ Chartroom</h1>
        <div className="flex items-center gap-2">
          {isAuthEnabled() && !authLoading && (
            user ? (
              <AccountDropdown />
            ) : (
              <Button variant="ghost" size="sm" onClick={openLogin}>
                Sign in
              </Button>
            )
          )}
          <a
            href="https://github.com/victor36max/chartroom"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
        {isAuthEnabled() && <LoginModal />}
      </header>
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <div className={`${mobileTab === "chat" ? "flex" : "hidden"} md:flex flex-col flex-1 md:flex-none md:w-[420px] md:min-w-[320px] md:border-r overflow-hidden`}>
          <ChatPanel
            ref={chatRef}
            datasets={datasets}
            onDatasetRemoved={handleDatasetRemoved}
            onFilesSelected={handleFilesSelected}
            onChartSpec={handleChartSpec}
            tier={tier}
            onTierChange={setTier}
            onStatusChange={handleStatusChange}
            onLoadSampleData={handleLoadSampleData}
          />
        </div>
        <div className={`${mobileTab === "chart" ? "flex" : "hidden"} md:flex flex-1 flex-col overflow-hidden`}>
          <ChartPanel datasets={datasets} chartSpec={currentChart} onChartSpecEdited={handleChartSpecEdited} onFilesSelected={handleFilesSelected} themeId={themeId} onThemeChange={setThemeId} isLoading={isAIBusy} />
        </div>
      </div>
      <BottomTabBar activeTab={mobileTab} onTabChange={setMobileTab} />
      <SheetPickerDialog
        open={sheetPickerOpen}
        onOpenChange={setSheetPickerOpen}
        sheetNames={pendingSheetNames}
        onSheetsSelected={handleSheetsSelected}
      />
    </div>
  );
}
