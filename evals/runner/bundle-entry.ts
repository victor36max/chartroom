import embed from "vega-embed";
import { stripStyling } from "../../src/lib/chart/strip-config";
import { getThemeConfig } from "../../src/lib/chart/render-vega";
import { injectData } from "../../src/lib/chart/inject-data";

// Expose renderVegaLite to the Playwright page context
(window as unknown as Record<string, unknown>).renderVegaLite = async (
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>
) => {
  const container = document.getElementById("chart-container")!;
  container.innerHTML = "";

  const cleaned = stripStyling(spec);
  const withData = injectData(cleaned, datasets);
  const config = getThemeConfig("default");

  await embed(container, withData as Parameters<typeof embed>[1], {
    config,
    actions: false,
    renderer: "svg",
  });
};
