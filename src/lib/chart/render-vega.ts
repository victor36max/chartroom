import embed, { type Result } from "vega-embed";
import * as themes from "vega-themes";
import type { Config } from "vega-lite";
import type { ThemeId } from "@/types";
import { injectData } from "./inject-data";
import { stripStyling } from "./strip-config";

// Datawrapper-like defaults matching the current Firechart aesthetic
const DEFAULT_CONFIG: Config = {
  font: "system-ui, -apple-system, sans-serif",
  axis: {
    labelFont: "system-ui, -apple-system, sans-serif",
    titleFont: "system-ui, -apple-system, sans-serif",
    gridColor: "#e5e5e5",
    gridOpacity: 0.8,
    domainColor: "#888",
    tickColor: "#888",
  },
  title: {
    font: "system-ui, -apple-system, sans-serif",
    fontSize: 16,
    fontWeight: 600,
    anchor: "start",
    subtitleFont: "system-ui, -apple-system, sans-serif",
    subtitleFontSize: 13,
    subtitleColor: "#666",
  },
  legend: {
    labelFont: "system-ui, -apple-system, sans-serif",
    titleFont: "system-ui, -apple-system, sans-serif",
  },
  range: { category: { scheme: "tableau10" } },
  view: { stroke: null },
};

export function getThemeConfig(themeId: ThemeId): Config {
  if (themeId === "default") return DEFAULT_CONFIG;
  const themeConfig = (themes as Record<string, Config | undefined>)[themeId];
  return themeConfig ?? DEFAULT_CONFIG;
}

export async function renderVegaLite(
  container: HTMLElement,
  spec: Record<string, unknown>,
  data: Record<string, unknown>[],
  themeId: ThemeId = "default"
): Promise<Result> {
  const cleaned = stripStyling(spec);
  const withData = injectData(cleaned, data);
  const config = getThemeConfig(themeId);

  const result = await embed(container, withData as Parameters<typeof embed>[1], {
    config,
    actions: false,
    renderer: "svg",
  });

  return result;
}
