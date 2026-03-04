import { toPng } from "html-to-image";

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportChartAsPng() {
  const container = document.getElementById("chart-container");
  if (!container) return;

  const dataUrl = await toPng(container, {
    backgroundColor: "#ffffff",
    pixelRatio: 2,
  });

  download(dataUrl, "chart.png");
}

export function exportChartAsSvg() {
  const container = document.getElementById("chart-container");
  if (!container) return;

  const svg = container.querySelector("svg");
  if (!svg) return;

  if (!svg.getAttribute("xmlns")) {
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  download(url, "chart.svg");
  URL.revokeObjectURL(url);
}
