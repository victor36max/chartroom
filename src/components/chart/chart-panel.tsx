"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartRenderer } from "@/components/chart/chart-renderer";
import { DataTable } from "@/components/data/data-table";
import { exportChartAsPng, exportChartAsSvg } from "@/lib/chart/export-chart";
import { specToPlot } from "@/lib/chart/spec-to-plot";
import { Download, Image, Check, Code, X } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import type { ParsedCSV, ChartSpec } from "@/types";

interface ChartPanelProps {
  csvData: ParsedCSV | null;
  chartSpec: ChartSpec | null;
  onChartSpecEdited?: (spec: ChartSpec) => void;
}

const jsonExtensions = [json()];

export function ChartPanel({ csvData, chartSpec, onChartSpecEdited }: ChartPanelProps) {
  const hasData = csvData && csvData.data.length > 0;
  const hasChart = chartSpec && hasData;

  const [activeTab, setActiveTab] = useState("chart");
  const [jsonPanelOpen, setJsonPanelOpen] = useState(false);
  const [editorValue, setEditorValue] = useState("");
  const [editorError, setEditorError] = useState<string | null>(null);
  const [previewSpec, setPreviewSpec] = useState<ChartSpec | null>(null);

  // Sync editor content when chartSpec changes (new AI-generated spec)
  useEffect(() => {
    if (chartSpec) {
      setEditorValue(JSON.stringify(chartSpec, null, 2));
      setEditorError(null);
      setPreviewSpec(null);
    }
  }, [chartSpec]);

  // Live preview with debounce
  useEffect(() => {
    if (!jsonPanelOpen || !csvData) return;
    const timer = setTimeout(() => {
      try {
        const parsed = JSON.parse(editorValue);
        specToPlot(parsed, csvData.data);
        setPreviewSpec(parsed);
      } catch {
        // silently ignore — keep showing last valid spec
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [editorValue, jsonPanelOpen, csvData]);

  const handleEditorChange = useCallback((value: string) => {
    setEditorValue(value);
    setEditorError(null);
  }, []);

  const handleApply = useCallback(() => {
    if (!csvData || !onChartSpecEdited) return;

    let parsed: ChartSpec;
    try {
      parsed = JSON.parse(editorValue);
    } catch (err) {
      setEditorError(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    try {
      specToPlot(parsed, csvData.data);
    } catch (err) {
      setEditorError(`Render error: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    setEditorError(null);
    onChartSpecEdited(parsed);
  }, [editorValue, csvData, onChartSpecEdited]);

  const handleCloseJsonPanel = useCallback(() => {
    setJsonPanelOpen(false);
    setPreviewSpec(null);
  }, []);

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
            <>
              <button
                onClick={exportChartAsSvg}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Download SVG"
              >
                <Image className="h-4 w-4" />
              </button>
              <button
                onClick={exportChartAsPng}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Download PNG"
              >
                <Download className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className={`${jsonPanelOpen ? "w-1/2" : "w-full"} flex flex-col overflow-hidden transition-all`}>
          <TabsContent value="chart" className="flex-1 m-0 overflow-auto">
            {hasChart ? (
              <ChartRenderer spec={displaySpec!} data={csvData.data} />
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
        </div>
        {jsonPanelOpen && hasChart && (
          <div className="w-1/2 border-l flex flex-col overflow-hidden">
            <div className="border-b px-3 py-1.5 flex items-center justify-between shrink-0">
              <span className="text-xs font-medium text-muted-foreground">Spec Editor</span>
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
