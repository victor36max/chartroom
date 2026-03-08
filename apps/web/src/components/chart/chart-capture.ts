import type { Result } from "vega-embed";

let currentResult: Result | null = null;

export function setCurrentVegaResult(result: Result | null) {
  currentResult = result;
}

export async function captureChart(): Promise<string> {
  if (!currentResult) {
    throw new Error("No chart view available for capture");
  }

  const dataUrl = await currentResult.view.toImageURL("png", 1);
  // Strip the data:image/png;base64, prefix
  return dataUrl.replace(/^data:image\/png;base64,/, "");
}
