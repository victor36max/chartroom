"use client";

import { useEffect, useRef, useState } from "react";
import { renderVegaLite } from "@/lib/chart/render-vega";
import { setCurrentVegaResult } from "./chart-capture";
import { setExportView } from "@/lib/chart/export-chart";
import type { ChartSpec, ThemeId } from "@/types";
import type { Result } from "vega-embed";

interface ChartRendererProps {
  spec: ChartSpec;
  datasets: Record<string, Record<string, unknown>[]>;
  themeId?: ThemeId;
  onViewReady?: (result: Result) => void;
}

export function ChartRenderer({ spec, datasets, themeId = "default", onViewReady }: ChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    renderVegaLite(container, spec as unknown as Record<string, unknown>, datasets, themeId)
      .then((result) => {
        if (cancelled) {
          result.view.finalize();
          return;
        }
        setError(null);
        resultRef.current = result;
        setCurrentVegaResult(result);
        setExportView(result);
        onViewReady?.(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      });

    return () => {
      cancelled = true;
      resultRef.current?.view.finalize();
      resultRef.current = null;
      setCurrentVegaResult(null);
      setExportView(null);
    };
  }, [spec, datasets, themeId, onViewReady]);

  return (
    <div className="flex items-center justify-center p-6 h-full">
      {error && (
        <div className="p-4 text-sm text-destructive">Chart error: {error}</div>
      )}
      <div
        ref={containerRef}
        id="chart-container"
        className={`max-w-full max-h-full ${error ? "hidden" : ""}`}
      />
    </div>
  );
}
