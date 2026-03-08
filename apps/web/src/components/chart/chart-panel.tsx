"use client";

import { useState, useEffect, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartRenderer } from "@/components/chart/chart-renderer";
import { DataTable } from "@/components/data/data-table";
import { exportChartAsPng, exportChartAsSvg } from "@/lib/chart/export-chart";
import { validateSpec } from "@/lib/chart/validate-spec";
import { Download, Check, Code, X, SlidersHorizontal, Palette } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { VisualSpecEditor } from "./visual-spec-editor";
import type { DatasetMap, ChartSpec, ThemeId } from "@/types";

interface ChartPanelProps {
  datasets: DatasetMap;
  chartSpec: ChartSpec | null;
  onChartSpecEdited?: (spec: ChartSpec) => void;
  onFilesSelected?: (files: File[]) => void;
  themeId: ThemeId;
  onThemeChange?: (themeId: ThemeId) => void;
}

const THEME_OPTIONS: { value: ThemeId; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "dark", label: "Dark" },
  { value: "fivethirtyeight", label: "FiveThirtyEight" },
  { value: "latimes", label: "LA Times" },
  { value: "vox", label: "Vox" },
  { value: "urbaninstitute", label: "Urban Institute" },
  { value: "googlecharts", label: "Google Charts" },
  { value: "powerbi", label: "Power BI" },
  { value: "quartz", label: "Quartz" },
  { value: "excel", label: "Excel" },
  { value: "ggplot2", label: "ggplot2" },
];

const jsonExtensions = [json()];

export function ChartPanel({ datasets, chartSpec, onChartSpecEdited, onFilesSelected, themeId, onThemeChange }: ChartPanelProps) {
  const datasetEntries = Object.entries(datasets);
  const hasData = datasetEntries.length > 0;
  const firstDataset = hasData ? datasetEntries[0][1] : null;
  const datasetsRows = Object.fromEntries(datasetEntries.map(([name, d]) => [name, d.data]));
  const hasChart = chartSpec && hasData;

  const dropzoneInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("chart");
  const [activeDataset, setActiveDataset] = useState("");
  const [jsonPanelOpen, setJsonPanelOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"visual" | "json">("visual");
  const [editorValue, setEditorValue] = useState("");
  const [editorError, setEditorError] = useState<string | null>(null);
  const [previewSpec, setPreviewSpec] = useState<ChartSpec | null>(null);

  // Sync editor content when chartSpec changes (new AI-generated spec)
  /* eslint-disable react-hooks/set-state-in-effect -- legitimate prop-to-state sync */
  useEffect(() => {
    if (chartSpec) {
      setEditorValue(JSON.stringify(chartSpec, null, 2));
      setEditorError(null);
      setPreviewSpec(null);
    }
  }, [chartSpec]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Sync activeDataset when datasets change
  /* eslint-disable react-hooks/set-state-in-effect -- legitimate prop-to-state sync */
  useEffect(() => {
    const names = Object.keys(datasets);
    if (names.length > 0 && !datasets[activeDataset]) {
      setActiveDataset(names[0]);
    }
  }, [datasets, activeDataset]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Live preview with debounce
  useEffect(() => {
    if (!jsonPanelOpen || !hasData) return;
    const timer = setTimeout(() => {
      try {
        const parsed = JSON.parse(editorValue);
        const result = validateSpec(parsed as Record<string, unknown>, datasetsRows);
        if (result.valid) {
          setPreviewSpec(parsed as ChartSpec);
        }
      } catch {
        // silently ignore — keep showing last valid spec
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [editorValue, jsonPanelOpen, hasData, datasetsRows]);

  const handleEditorChange = useCallback((value: string) => {
    setEditorValue(value);
    setEditorError(null);
  }, []);

  const handleApply = useCallback(() => {
    if (!hasData || !onChartSpecEdited) return;

    let parsed: ChartSpec;
    try {
      parsed = JSON.parse(editorValue);
    } catch (err) {
      setEditorError(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    const result = validateSpec(parsed as unknown as Record<string, unknown>, datasetsRows);
    if (!result.valid) {
      setEditorError(`Spec error: ${result.error}`);
      return;
    }

    setEditorError(null);
    onChartSpecEdited(parsed);
  }, [editorValue, hasData, datasetsRows, onChartSpecEdited]);

  const handleCloseJsonPanel = useCallback(() => {
    setJsonPanelOpen(false);
    setPreviewSpec(null);
  }, []);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "svg">("png");
  const [exportScale, setExportScale] = useState(2);
  const [exportTransparent, setExportTransparent] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click or Escape
  useEffect(() => {
    if (!exportOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [exportOpen]);

  const displaySpec = jsonPanelOpen && previewSpec ? previewSpec : chartSpec;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
      <div className="border-b px-4 flex items-center justify-between">
        <TabsList className="h-10">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="data" disabled={!hasData}>
            Data
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-1">
          {hasChart && (
            <div className="flex items-center gap-1 mr-1">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={themeId}
                onChange={(e) => onThemeChange?.(e.target.value as ThemeId)}
                className="text-xs border rounded px-1.5 py-1 bg-background"
              >
                {THEME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {hasChart && (
            <button
              onClick={() => setJsonPanelOpen(!jsonPanelOpen)}
              className={`p-1.5 rounded-md transition-colors ${
                jsonPanelOpen
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={jsonPanelOpen ? "Close spec editor" : "Open spec editor"}
            >
              <Code className="h-4 w-4" />
            </button>
          )}
          {hasChart && (
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen(!exportOpen)}
                className={`p-1.5 rounded-md transition-colors ${
                  exportOpen
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title="Export chart"
              >
                <Download className="h-4 w-4" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-md border bg-popover p-3 shadow-md space-y-3">
                  <div className="flex gap-0 rounded-md bg-muted p-0.5">
                    {(["png", "svg"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setExportFormat(fmt)}
                        className={`flex-1 h-7 rounded text-xs font-medium transition-colors ${
                          exportFormat === fmt
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {exportFormat === "png" && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Scale</label>
                      <div className="flex gap-1">
                        {[1, 2].map((s) => (
                          <button
                            key={s}
                            onClick={() => setExportScale(s)}
                            className={`flex-1 h-7 rounded text-xs font-medium transition-colors ${
                              exportScale === s
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportTransparent}
                      onChange={(e) => setExportTransparent(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-muted-foreground accent-primary"
                    />
                    <span className="text-xs">Transparent background</span>
                  </label>
                  <button
                    onClick={() => {
                      if (exportFormat === "png") {
                        exportChartAsPng({ pixelRatio: exportScale, transparent: exportTransparent });
                      } else {
                        exportChartAsSvg({ transparent: exportTransparent });
                      }
                      setExportOpen(false);
                    }}
                    className="w-full h-7 rounded text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Export {exportFormat.toUpperCase()}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className={`${jsonPanelOpen ? "w-1/2" : "w-full"} flex flex-col overflow-hidden transition-all`}>
          <TabsContent value="chart" className="flex-1 m-0 overflow-auto">
            {hasChart ? (
              <ChartRenderer spec={displaySpec!} datasets={datasetsRows} themeId={themeId} />
            ) : hasData ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">Ask the AI to create a chart from your data</p>
              </div>
            ) : (
              <div
                className="flex items-center justify-center h-full"
                onDrop={(e: DragEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  const csvFiles = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".csv"));
                  if (csvFiles.length > 0) onFilesSelected?.(csvFiles);
                }}
                onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
              >
                <button
                  type="button"
                  onClick={() => dropzoneInputRef.current?.click()}
                  className="rounded-lg border-2 border-dashed border-muted-foreground/25 px-12 py-10 text-sm text-muted-foreground hover:border-muted-foreground/50 transition-colors cursor-pointer"
                >
                  Drop CSV file(s) here or click to upload
                </button>
                <input
                  ref={dropzoneInputRef}
                  type="file"
                  accept=".csv"
                  multiple
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      onFilesSelected?.(Array.from(files));
                      e.target.value = "";
                    }
                  }}
                  className="hidden"
                />
              </div>
            )}
          </TabsContent>
          <TabsContent value="data" className="flex-1 m-0 overflow-hidden flex flex-col">
            {datasetEntries.length > 1 && (
              <div className="border-b px-3 py-1.5 flex gap-1 shrink-0 overflow-x-auto">
                {datasetEntries.map(([name]) => (
                  <button
                    key={name}
                    onClick={() => setActiveDataset(name)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      activeDataset === name
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {datasets[activeDataset] && <DataTable csvData={datasets[activeDataset]} />}
          </TabsContent>
        </div>
        {jsonPanelOpen && hasChart && (
          <div className="w-1/2 border-l flex flex-col overflow-hidden">
            <div className="border-b px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setEditorTab("visual")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    editorTab === "visual"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  Visual
                </button>
                <button
                  onClick={() => setEditorTab("json")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    editorTab === "json"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Code className="h-3 w-3" />
                  JSON
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleApply}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  title="Apply changes to AI"
                >
                  <Check className="h-3.5 w-3.5" />
                  Apply
                </button>
                <button
                  onClick={handleCloseJsonPanel}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Close editor"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {editorTab === "visual" ? (
                <VisualSpecEditor
                  editorValue={editorValue}
                  onChange={handleEditorChange}
                  columns={firstDataset?.metadata.columns ?? []}
                />
              ) : (
                <CodeMirror
                  value={editorValue}
                  onChange={handleEditorChange}
                  extensions={jsonExtensions}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    indentOnInput: true,
                    tabSize: 2,
                  }}
                  height="100%"
                  style={{ height: "100%" }}
                />
              )}
            </div>
            {editorError && (
              <div className="px-3 py-2 border-t bg-destructive/10 text-destructive text-xs font-mono shrink-0">
                {editorError}
              </div>
            )}
          </div>
        )}
      </div>
    </Tabs>
  );
}
