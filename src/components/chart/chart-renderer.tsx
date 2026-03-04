"use client";

import { useEffect, useRef } from "react";
import { specToPlot } from "@/lib/chart/spec-to-plot";
import type { ChartSpec } from "@/types";

interface ChartRendererProps {
  spec: ChartSpec;
  data: Record<string, unknown>[];
}

export function ChartRenderer({ spec, data }: ChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      const plot = specToPlot(spec, data);
      container.replaceChildren(plot);
    } catch (err) {
      container.replaceChildren();
      const errorDiv = document.createElement("div");
      errorDiv.className = "p-4 text-sm text-destructive";
      errorDiv.textContent = `Chart error: ${err instanceof Error ? err.message : "Unknown error"}`;
      container.appendChild(errorDiv);
    }
  }, [spec, data]);

  return (
    <div className="flex items-center justify-center p-6 h-full">
      <div ref={containerRef} id="chart-container" className="w-full max-w-3xl" />
    </div>
  );
}
