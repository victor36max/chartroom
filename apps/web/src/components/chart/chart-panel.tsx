"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartRenderer } from "@/components/chart/chart-renderer";
import { DataTable } from "@/components/data/data-table";
import { exportChartAsPng, exportChartAsSvg } from "@/lib/chart/export-chart";
import { validateSpec } from "@/lib/chart/validate-spec";
import { Download, Check, Code, X, SlidersHorizontal, Palette, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select as ShadSelect, SelectContent as ShadSelectContent, SelectItem as ShadSelectItem, SelectTrigger as ShadSelectTrigger, SelectValue as ShadSelectValue } from "@/components/ui/select";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { VisualSpecEditor } from "./visual-spec-editor";
import { TutorialCard } from "./tutorial-card";
import type { DatasetMap, ChartSpec, ThemeId, ParsedCSV } from "@/types";

interface ChartPanelProps {
  datasets: DatasetMap;
  chartSpec: ChartSpec | null;
  onChartSpecEdited?: (spec: ChartSpec) => void;
  onFilesSelected?: (files: File[]) => void;
  onDatasetChanged?: (name: string, data: ParsedCSV) => void;
  themeId: ThemeId;
  onThemeChange?: (themeId: ThemeId) => void;
  isLoading?: boolean;
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

export function ChartPanel({ datasets, chartSpec, onChartSpecEdited, onFilesSelected, onDatasetChanged, themeId, onThemeChange, isLoading }: ChartPanelProps) {
  const datasetEntries = Object.entries(datasets);
  const hasData = datasetEntries.length > 0;
  const firstDataset = hasData ? datasetEntries[0][1] : null;
  const datasetsRows = Object.fromEntries(datasetEntries.map(([name, d]) => [name, d.data]));
  const hasChart = chartSpec && hasData;

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

  const displaySpec = jsonPanelOpen && previewSpec ? previewSpec : chartSpec;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
      <div className="border-b px-4 py-1.5 flex items-center justify-between">
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
              <ShadSelect value={themeId} onValueChange={(v) => onThemeChange?.(v as ThemeId)}>
                <ShadSelectTrigger size="sm" className="w-[130px] text-xs">
                  <ShadSelectValue />
                </ShadSelectTrigger>
                <ShadSelectContent>
                  {THEME_OPTIONS.map((t) => (
                    <ShadSelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </ShadSelectItem>
                  ))}
                </ShadSelectContent>
              </ShadSelect>
            </div>
          )}
          {hasChart && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setJsonPanelOpen(!jsonPanelOpen)}
              className={`hidden md:inline-flex ${jsonPanelOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={jsonPanelOpen ? "Close spec editor" : "Open spec editor"}
            >
              <Code className="h-4 w-4" />
            </Button>
          )}
          {hasChart && (
            <Popover open={exportOpen} onOpenChange={setExportOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={exportOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}
                  aria-label="Export chart"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-3 space-y-3">
                <div className="flex gap-0 rounded-md bg-muted p-0.5">
                  {(["png", "svg"] as const).map((fmt) => (
                    <Button
                      key={fmt}
                      variant="ghost"
                      size="xs"
                      onClick={() => setExportFormat(fmt)}
                      className={`flex-1 h-7 ${
                        exportFormat === fmt
                          ? "bg-background text-foreground shadow-sm hover:bg-background"
                          : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </Button>
                  ))}
                </div>
                {exportFormat === "png" && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Scale</Label>
                    <div className="flex gap-1">
                      {[1, 2].map((s) => (
                        <Button
                          key={s}
                          variant="ghost"
                          size="xs"
                          onClick={() => setExportScale(s)}
                          className={`flex-1 h-7 ${
                            exportScale === s
                              ? "bg-primary text-primary-foreground hover:bg-primary"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {s}x
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <Label className="flex items-center gap-2">
                  <Checkbox
                    checked={exportTransparent}
                    onCheckedChange={(checked) => setExportTransparent(checked === true)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs">Transparent background</span>
                </Label>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (exportFormat === "png") {
                      exportChartAsPng({ pixelRatio: exportScale, transparent: exportTransparent });
                    } else {
                      exportChartAsSvg({ transparent: exportTransparent });
                    }
                    setExportOpen(false);
                  }}
                >
                  Export {exportFormat.toUpperCase()}
                </Button>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className={`${jsonPanelOpen ? "w-1/2" : "w-full"} flex flex-col overflow-hidden transition-all`}>
          <TabsContent value="chart" className="flex-1 m-0 overflow-auto relative" onClick={() => jsonPanelOpen && handleCloseJsonPanel()}>
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 pointer-events-none">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is working...</span>
                </div>
              </div>
            )}
            {hasChart ? (
              <ChartRenderer spec={displaySpec!} datasets={datasetsRows} themeId={themeId} />
            ) : hasData ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <span className="text-2xl">💬</span>
                <p className="text-sm">Ask the AI to create a chart from your data</p>
              </div>
            ) : (
              <TutorialCard onFilesSelected={onFilesSelected} />
            )}
          </TabsContent>
          <TabsContent value="data" className="flex-1 m-0 overflow-hidden flex flex-col">
            {datasetEntries.length > 1 && (
              <div className="border-b px-3 py-1.5 flex gap-1 shrink-0 overflow-x-auto">
                {datasetEntries.map(([name]) => (
                  <Button
                    key={name}
                    variant="ghost"
                    size="xs"
                    onClick={() => setActiveDataset(name)}
                    className={`whitespace-nowrap ${
                      activeDataset === name
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            )}
            {datasets[activeDataset] && <DataTable csvData={datasets[activeDataset]} datasetName={activeDataset} onDatasetChanged={onDatasetChanged} />}
          </TabsContent>
        </div>
        {jsonPanelOpen && hasChart && (
          <div className="w-1/2 border-l flex flex-col overflow-hidden">
            <div className="border-b px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setEditorTab("visual")}
                  className={
                    editorTab === "visual"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  Visual
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setEditorTab("json")}
                  className={
                    editorTab === "json"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }
                >
                  <Code className="h-3 w-3" />
                  JSON
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={handleApply}
                  aria-label="Apply edits and send the updated spec to the AI conversation"
                >
                  <Check className="h-3.5 w-3.5" />
                  Apply to Chat
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCloseJsonPanel}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close editor"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {editorTab === "visual" ? (
                <VisualSpecEditor
                  editorValue={editorValue}
                  onChange={handleEditorChange}
                  columns={firstDataset?.metadata.columns ?? []}
                  datasets={datasets}
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
