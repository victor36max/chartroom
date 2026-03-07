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
    subtitlePadding: 8,
    offset: 16,
  },
  legend: {
    labelFont: "system-ui, -apple-system, sans-serif",
    titleFont: "system-ui, -apple-system, sans-serif",
  },
  range: { category: { scheme: "tableau10" } },
  view: { stroke: null },
  padding: { top: 16, bottom: 16, left: 16, right: 16 },
};

export function getThemeConfig(themeId: ThemeId): Config {
  if (themeId === "default") return DEFAULT_CONFIG;
  const themeConfig = (themes as Record<string, Config | undefined>)[themeId];
  if (!themeConfig) return DEFAULT_CONFIG;

  const t = themeConfig as Record<string, unknown>;
  const config: Config = { ...DEFAULT_CONFIG };

  // Extract color palette
  if (t.range) config.range = t.range as Config["range"];

  // Extract background and text colors (needed for dark theme)
  if (t.background) config.background = t.background as string;
  if (t.style) config.style = t.style as Config["style"];
  if (t.axis) {
    const themeAxis = t.axis as Record<string, unknown>;
    config.axis = {
      ...config.axis,
      ...(themeAxis.domainColor != null && { domainColor: themeAxis.domainColor as string }),
      ...(themeAxis.gridColor != null && { gridColor: themeAxis.gridColor as string }),
      ...(themeAxis.tickColor != null && { tickColor: themeAxis.tickColor as string }),
    };
  }
  if (t.title) {
    const themeTitle = t.title as Record<string, unknown>;
    config.title = {
      ...config.title as Record<string, unknown>,
      ...(themeTitle.color != null && { color: themeTitle.color as string }),
      ...(themeTitle.subtitleColor != null && { subtitleColor: themeTitle.subtitleColor as string }),
    };
  }

  return config;
}

export async function renderVegaLite(
  container: HTMLElement,
  spec: Record<string, unknown>,
  data: Record<string, unknown>[],
  themeId: ThemeId = "default"
): Promise<Result> {
  const cleaned = stripStyling(spec);
  const withData = injectData(cleaned, data);
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
