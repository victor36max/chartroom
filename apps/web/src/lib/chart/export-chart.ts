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
  transparent?: boolean;
}) {
  if (!currentResult) return;
  const scaleFactor = options?.pixelRatio ?? 2;
  const view = currentResult.view;
  const prevBg = view.background();
  if (options?.transparent) view.background("transparent");
  const dataUrl = await view.toImageURL("png", scaleFactor);
  view.background(prevBg);
  download(dataUrl, "chart.png");
}

export async function exportChartAsSvg(options?: { transparent?: boolean }) {
  if (!currentResult) return;
  const view = currentResult.view;
  const prevBg = view.background();
  if (options?.transparent) view.background("transparent");
  const svg = await view.toSVG();
  view.background(prevBg);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  download(URL.createObjectURL(blob), "chart.svg");
}
