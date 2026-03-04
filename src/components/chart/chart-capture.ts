import { toPng } from "html-to-image";

export async function captureChart(): Promise<string> {
  const container = document.getElementById("chart-container");
  if (!container) throw new Error("Chart container not found");

  // Wait for any pending renders
  await new Promise((r) => setTimeout(r, 100));

  const dataUrl = await toPng(container, {
    backgroundColor: "#ffffff",
    pixelRatio: 1,
  });

  // Strip the data:image/png;base64, prefix
  return dataUrl.replace(/^data:image\/png;base64,/, "");
}
