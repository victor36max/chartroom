import embed, { type Result } from "vega-embed";
import type { ThemeId } from "@firechart/core";
import { injectData, stripStyling, getThemeConfig } from "@firechart/core";

export async function renderVegaLite(
  container: HTMLElement,
  spec: Record<string, unknown>,
  datasets: Record<string, Record<string, unknown>[]>,
  themeId: ThemeId = "default"
): Promise<Result> {
  const cleaned = stripStyling(spec);
  const withData = injectData(cleaned, datasets);
  const withDefaults = {
    width: 500,
    height: 300,
    ...withData,
  };
  const config = getThemeConfig(themeId);

  const result = await embed(container, withDefaults as Parameters<typeof embed>[1], {
    config,
    actions: false,
    renderer: "svg",
  });

  return result;
}
