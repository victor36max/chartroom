import { toPng } from "html-to-image";

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
  backgroundColor?: string | null;
}) {
  const container = document.getElementById("chart-container");
  if (!container) return;

  const pixelRatio = options?.pixelRatio ?? 2;
  const bg = options?.backgroundColor;

  // Temporarily remove max-width so html-to-image captures full chart content
  const prevMaxWidth = container.style.maxWidth;
  const prevWidth = container.style.width;
  container.style.maxWidth = "none";
  container.style.width = "max-content";

  try {
    const dataUrl = await toPng(container, {
      pixelRatio,
      ...(bg != null ? { backgroundColor: bg } : {}),
    });
    download(dataUrl, "chart.png");
  } finally {
    container.style.maxWidth = prevMaxWidth;
    container.style.width = prevWidth;
  }
}
