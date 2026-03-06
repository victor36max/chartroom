import { toPng } from "html-to-image";

export async function captureChart(): Promise<string> {
  const container = document.getElementById("chart-container");
  if (!container) throw new Error("Chart container not found");

  // Wait for any pending renders
  await new Promise((r) => setTimeout(r, 100));

  // Temporarily remove max-width so html-to-image captures full chart content
  const prevMaxWidth = container.style.maxWidth;
  const prevWidth = container.style.width;
  container.style.maxWidth = "none";
  container.style.width = "max-content";

  try {
    const dataUrl = await toPng(container, {
      backgroundColor: "#ffffff",
      pixelRatio: 1,
    });

    // Strip the data:image/png;base64, prefix
    return dataUrl.replace(/^data:image\/png;base64,/, "");
  } finally {
    container.style.maxWidth = prevMaxWidth;
    container.style.width = prevWidth;
  }
}
