import * as Plot from "@observablehq/plot";
import type { ChartSpec, MarkSpec } from "@/types";
import { renderPieChart, type ArcLegendInfo } from "./arc-mark";

// Datawrapper-style defaults — clean, editorial, minimal chart junk.
// AI specs merge on top: anything the AI specifies overrides these.
const CHART_DEFAULTS = {
  style: {
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "13px",
    color: "#333",
    overflow: "visible",
  },
  marginBottom: 45, // extra space so axis labels don't overlap tick labels
  y: { grid: true }, // horizontal grid lines only
  color: { scheme: "tableau10" },
};

const TITLE_STYLE_DEFAULTS: Record<string, string> = {
  fontWeight: "700",
  fontSize: "17px",
  color: "#1a1a1a",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  margin: "0 0 2px 0",
};

const SUBTITLE_STYLE_DEFAULTS: Record<string, string> = {
  fontSize: "14px",
  color: "#666",
  fontWeight: "400",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  margin: "0 0 8px 0",
};

const MARK_CONSTRUCTORS: Record<string, (data: unknown, options: Record<string, unknown>) => Plot.Mark> = {
  barX: (data, opts) => Plot.barX(data as Plot.Data, opts),
  barY: (data, opts) => Plot.barY(data as Plot.Data, opts),
  dot: (data, opts) => Plot.dot(data as Plot.Data, opts),
  line: (data, opts) => Plot.line(data as Plot.Data, opts),
  lineY: (data, opts) => Plot.lineY(data as Plot.Data, opts),
  lineX: (data, opts) => Plot.lineX(data as Plot.Data, opts),
  areaY: (data, opts) => Plot.areaY(data as Plot.Data, opts),
  areaX: (data, opts) => Plot.areaX(data as Plot.Data, opts),
  cell: (data, opts) => Plot.cell(data as Plot.Data, opts),
  rect: (data, opts) => Plot.rect(data as Plot.Data, opts),
  rectX: (data, opts) => Plot.rectX(data as Plot.Data, opts),
  rectY: (data, opts) => Plot.rectY(data as Plot.Data, opts),
  text: (data, opts) => Plot.text(data as Plot.Data, opts),
  tickX: (data, opts) => Plot.tickX(data as Plot.Data, opts),
  tickY: (data, opts) => Plot.tickY(data as Plot.Data, opts),
  ruleX: (data, opts) => Plot.ruleX(data as Plot.Data, opts),
  ruleY: (data, opts) => Plot.ruleY(data as Plot.Data, opts),
  frame: (_data, opts) => Plot.frame(opts),
  tip: (data, opts) => Plot.tip(data as Plot.Data, opts),
  axisX: (_data, opts) => Plot.axisX(opts),
  axisY: (_data, opts) => Plot.axisY(opts),
  axisFx: (_data, opts) => Plot.axisFx(opts),
  axisFy: (_data, opts) => Plot.axisFy(opts),
};

function resolveFormatOption(value: unknown): unknown {
  // Observable Plot handles d3-format strings (e.g. "$,.2f") natively.
  // We intentionally do not support function strings to avoid code execution.
  return value;
}

function resolveScaleOptions(options: Record<string, unknown>): Record<string, unknown> {
  if (!options || typeof options !== "object") return options;
  const resolved = { ...options };
  if ("tickFormat" in resolved) resolved.tickFormat = resolveFormatOption(resolved.tickFormat);
  if ("format" in resolved) resolved.format = resolveFormatOption(resolved.format);
  return resolved;
}

function applyMelt(
  data: Record<string, unknown>[],
  melt: { columns: string[]; key?: string; value?: string },
): Record<string, unknown>[] {
  const { columns, key = "variable", value = "value" } = melt;
  const colSet = new Set(columns);
  return data.flatMap((row) => {
    const kept: Record<string, unknown> = {};
    for (const k of Object.keys(row)) {
      if (!colSet.has(k)) kept[k] = row[k];
    }
    return columns.map((col) => ({ ...kept, [key]: col, [value]: row[col] }));
  });
}

function resolveTransform(options: Record<string, unknown>): Record<string, unknown> {
  const resolved = { ...options };

  // Handle transforms like groupX, binX, etc.
  const transforms: Record<string, (outputs: Record<string, unknown>, options?: Record<string, unknown>) => Record<string, unknown>> = {
    groupX: Plot.groupX as never,
    groupY: Plot.groupY as never,
    groupZ: Plot.groupZ as never,
    binX: Plot.binX as never,
    binY: Plot.binY as never,
    stackY: Plot.stackY as never,
    stackX: Plot.stackX as never,
  };

  for (const [name, fn] of Object.entries(transforms)) {
    if (resolved[name] && typeof resolved[name] === "object") {
      const transformSpec = resolved[name] as Record<string, unknown>;
      const outputs = (transformSpec.outputs ?? transformSpec) as Record<string, unknown>;
      const rest = { ...resolved };
      delete rest[name];
      return fn(outputs, rest);
    }
  }

  return resolved;
}

function buildMark(markSpec: MarkSpec, csvData: Record<string, unknown>[]): Plot.Mark {
  const { type, data, options = {} } = markSpec;

  const constructor = MARK_CONSTRUCTORS[type];
  if (!constructor) {
    throw new Error(`Unknown mark type: "${type}". Available: ${Object.keys(MARK_CONSTRUCTORS).join(", ")}`);
  }

  // Resolve data source
  const NO_DATA_MARKS = new Set(["frame", "axisX", "axisY", "axisFx", "axisFy"]);
  let markData: unknown;
  if (NO_DATA_MARKS.has(type)) {
    markData = undefined;
  } else if (type === "ruleX" || type === "ruleY") {
    // Rules with options.values should always use the values array,
    // even if the model mistakenly set data: "csv"
    if (options.values && Array.isArray(options.values)) {
      const resolved = { ...options };
      delete resolved.values;
      return constructor(options.values, resolveTransform(resolved));
    }
    markData = data === "csv" ? csvData : (options.values ?? [0]);
  } else {
    if (data && data !== "csv") throw new Error(`Unknown data source "${data}": only "csv" is supported`);
    // Default to csvData even if data field is missing (defensive: models sometimes omit it)
    markData = csvData;
  }

  // Apply melt (wide-to-long) transform before passing data to Plot
  const resolvedOptions = { ...options };
  if (resolvedOptions.melt && typeof resolvedOptions.melt === "object" && Array.isArray(markData)) {
    markData = applyMelt(markData as Record<string, unknown>[], resolvedOptions.melt as { columns: string[]; key?: string; value?: string });
    delete resolvedOptions.melt;
  }

  // Apply filter — keep only rows matching all key-value pairs
  if (resolvedOptions.filter && typeof resolvedOptions.filter === "object" && Array.isArray(markData)) {
    const filters = resolvedOptions.filter as Record<string, unknown>;
    markData = (markData as Record<string, unknown>[]).filter((row) =>
      Object.entries(filters).every(([k, v]) => row[k] === v),
    );
    delete resolvedOptions.filter;
  }

  // Auto-parse date strings in position channels so Plot creates temporal scales
  if (Array.isArray(markData) && markData.length > 0) {
    const first = markData[0] as Record<string, unknown>;
    for (const ch of ["x", "y", "x1", "x2"]) {
      const col = resolvedOptions[ch];
      if (typeof col === "string" && col in first) {
        const sample = first[col];
        if (typeof sample === "string" && /^\d{4}-\d{2}-\d{2}/.test(sample)) {
          markData = (markData as Record<string, unknown>[]).map((row) => ({
            ...row,
            [col]: new Date(row[col] as string),
          }));
        }
      }
    }
  }

  return constructor(markData, resolveTransform(resolvedOptions));
}

// The class prefix must match Plot's built-in prefix so legends share the same styling.
const PLOT_CLASS = "plot-d6a7b5";

function buildSwatchLegend(legend: ArcLegendInfo): HTMLDivElement {
  const div = document.createElement("div");
  div.className = `${PLOT_CLASS}-swatches ${PLOT_CLASS}-swatches-wrap`;

  const style = document.createElement("style");
  style.textContent = `:where(.${PLOT_CLASS}-swatches) {
  font-family: system-ui, sans-serif;
  font-size: 10px;
  margin-bottom: 0.5em;
}
:where(.${PLOT_CLASS}-swatch > svg) {
  margin-right: 0.5em;
  overflow: visible;
}
:where(.${PLOT_CLASS}-swatches-wrap) {
  display: flex;
  align-items: center;
  min-height: 33px;
  flex-wrap: wrap;
}
:where(.${PLOT_CLASS}-swatches-wrap .${PLOT_CLASS}-swatch) {
  display: inline-flex;
  align-items: center;
  margin-right: 1em;
}`;
  div.appendChild(style);

  for (let i = 0; i < legend.labels.length; i++) {
    const span = document.createElement("span");
    span.className = `${PLOT_CLASS}-swatch`;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "15");
    svg.setAttribute("height", "15");
    svg.setAttribute("fill", legend.colors[i]);
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    svg.appendChild(rect);

    span.appendChild(svg);
    span.appendChild(document.createTextNode(legend.labels[i]));
    div.appendChild(span);
  }

  return div;
}

/**
 * Estimate marginLeft needed so the y-axis label doesn't overlap tick labels.
 * Plot auto-sizes for ticks but doesn't account for the rotated axis title.
 */
function estimateMarginLeft(spec: ChartSpec, csvData: Record<string, unknown>[]): number | undefined {
  if (spec.marginLeft) return undefined; // explicit override takes priority

  let maxLen = 0;
  for (const mark of spec.marks) {
    const yCol = mark.options?.y;
    if (typeof yCol !== "string") continue;

    for (const row of csvData) {
      const val = String(row[yCol] ?? "");
      // Only count non-numeric labels (categorical text)
      if (val.length > maxLen && isNaN(Number(val))) maxLen = val.length;
    }
  }

  if (maxLen <= 3) return undefined; // short labels — Plot's default is fine
  // ~6.5px per char at 13px font + 20px for the rotated axis title
  return Math.ceil(maxLen * 6.5) + 20;
}

export function specToPlot(spec: ChartSpec, csvData: Record<string, unknown>[]): HTMLElement | SVGSVGElement {
  let arcLegend: ArcLegendInfo | null = null;

  const marks = spec.marks.map((m) => {
    if (m.type === "arc") {
      // Render pie/donut as a custom mark via Plot.frame + render override.
      // This lets Plot handle the figure wrapper, title, subtitle, and styles.
      return Plot.frame({
        stroke: "none",
        fill: "none",
        render: (_index: number[], _scales: unknown, _values: unknown, dimensions: { width: number; height: number }) => {
          const { node, legend } = renderPieChart(m, csvData, spec, dimensions.width, dimensions.height);
          arcLegend = legend;
          return node;
        },
      });
    }
    return buildMark(m, csvData);
  });

  const plotOptions: Record<string, unknown> = { marks };

  if (spec.title) plotOptions.title = spec.title;
  if (spec.subtitle) plotOptions.subtitle = spec.subtitle;
  if (spec.width) plotOptions.width = spec.width;
  if (spec.height) plotOptions.height = spec.height;

  // Arc marks render inside Plot.frame() which gets tiny dimensions when no
  // x/y scales exist. Ensure reasonable defaults so the pie chart is readable.
  const hasArc = spec.marks.some((m) => m.type === "arc");
  if (hasArc) {
    if (!plotOptions.width) plotOptions.width = 640;
    if (!plotOptions.height) plotOptions.height = 400;
  }

  // Merge defaults with spec — spec values override defaults
  plotOptions.style = { ...CHART_DEFAULTS.style, ...(spec.style ?? {}) };
  plotOptions.color = resolveScaleOptions({ ...CHART_DEFAULTS.color, ...(spec.color ?? {}) });
  plotOptions.y = resolveScaleOptions({ ...CHART_DEFAULTS.y, ...(spec.y ?? {}) });

  if (spec.x) plotOptions.x = resolveScaleOptions(spec.x as Record<string, unknown>);
  if (spec.fx) plotOptions.fx = resolveScaleOptions(spec.fx as Record<string, unknown>);
  if (spec.fy) plotOptions.fy = resolveScaleOptions(spec.fy as Record<string, unknown>);
  plotOptions.marginBottom = spec.marginBottom ?? CHART_DEFAULTS.marginBottom;
  if (spec.marginTop) plotOptions.marginTop = spec.marginTop;
  if (spec.marginRight) plotOptions.marginRight = spec.marginRight;
  plotOptions.marginLeft = spec.marginLeft ?? estimateMarginLeft(spec, csvData);

  const result = Plot.plot(plotOptions);

  // Style title (h2) and subtitle (h3) with defaults, then overlay spec overrides
  if (result instanceof HTMLElement) {
    const h2 = result.querySelector("h2");
    if (h2) Object.assign(h2.style, TITLE_STYLE_DEFAULTS, spec.titleStyle ?? {});

    const h3 = result.querySelector("h3");
    if (h3) Object.assign(h3.style, SUBTITLE_STYLE_DEFAULTS, spec.subtitleStyle ?? {});

    // Insert Plot-style swatch legend for arc marks (above the SVG, like Plot does natively)
    if (arcLegend) {
      const svg = result.querySelector("svg");
      if (svg) {
        result.insertBefore(buildSwatchLegend(arcLegend), svg);
      }
    }
  }

  return result;
}
