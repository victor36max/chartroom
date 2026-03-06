import type { Result } from "vega-embed";

let currentResult: Result | null = null;

export function setExportView(result: Result | null) {
  currentResult = result;
}

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportChartAsPng(options?: {
  pixelRatio?: number;
}) {
  if (!currentResult) return;
  const scaleFactor = options?.pixelRatio ?? 2;
  const dataUrl = await currentResult.view.toImageURL("png", scaleFactor);
  download(dataUrl, "chart.png");
}

export async function exportChartAsSvg() {
  if (!currentResult) return;
  const svg = await currentResult.view.toSVG();
  const blob = new Blob([svg], { type: "image/svg+xml" });
  download(URL.createObjectURL(blob), "chart.svg");
}
