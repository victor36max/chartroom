import embed from "vega-embed";
import { injectData, getThemeConfig } from "@chartroom/core";

(window as unknown as Record<string, unknown>).renderVegaLite = async (
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>,
  themeId: string = "default"
) => {
  const container = document.getElementById("chart-container")!;
  container.innerHTML = "";

  const withData = injectData(spec, datasets);
  const config = getThemeConfig(themeId as Parameters<typeof getThemeConfig>[0]);

  await embed(container, withData as Parameters<typeof embed>[1], {
    config,
    actions: false,
    renderer: "svg",
  });
};
