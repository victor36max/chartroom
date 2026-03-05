import * as Plot from "@observablehq/plot";
import type { ChartSpec, MarkSpec } from "@/types";
import { renderPieChart, type ArcLegendInfo } from "./arc-mark";

// Datawrapper-style defaults — clean, editorial, minimal chart junk.
// AI specs merge on top: anything the AI specifies overrides these.
// First color of tableau10 — used as default fill when no fill channel is specified,
// so single-series bar/area charts aren't rendered in plain black.
const DEFAULT_FILL = "#4e79a7";

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

// Marks that take no data argument (options-only constructors)
const NO_DATA_MARKS = new Set(["frame", "axisX", "axisY", "axisFx", "axisFy"]);

// Marks that should default to the first tableau10 color when no fill is specified
const FILL_MARKS = new Set(["barX", "barY", "areaY", "areaX", "rect", "rectX", "rectY", "cell"]);

// Marks that auto-enable tooltips when the model omits tip: true
const TIP_MARKS = new Set(["barX", "barY", "dot", "line", "lineY", "lineX", "areaY", "areaX", "cell", "rect", "rectX", "rectY", "tickX", "tickY"]);

// Marks that require x/y position channels
const NEEDS_XY = new Set([
  "barX", "barY", "dot", "line", "lineY", "lineX",
  "areaY", "areaX", "cell", "rect", "rectX", "rectY", "text",
  "tickX", "tickY",
]);
const X_OPTIONAL = new Set(["lineY", "tickY", "areaY"]);
const Y_OPTIONAL = new Set(["lineX", "tickX", "areaX"]);

// Build MARK_CONSTRUCTORS programmatically — most marks share the same (data, opts) signature
const DATA_MARK_NAMES = [
  "barX", "barY", "dot", "line", "lineY", "lineX",
  "areaY", "areaX", "cell", "rect", "rectX", "rectY",
  "text", "tickX", "tickY", "ruleX", "ruleY", "tip",
] as const;

const MARK_CONSTRUCTORS: Record<string, (data: unknown, options: Record<string, unknown>) => Plot.Mark> = {
  // Data marks — all follow the same pattern
  ...Object.fromEntries(
    DATA_MARK_NAMES.map((name) => [
      name,
      (data: unknown, opts: Record<string, unknown>) =>
        (Plot[name] as (data: Plot.Data, options: Record<string, unknown>) => Plot.Mark)(data as Plot.Data, opts),
    ]),
  ),
  // Options-only marks (no data argument)
  frame: (_data, opts) => Plot.frame(opts),
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
  let resolved = { ...options };

  // Transform functions — applied in order: group/bin first, then stack.
  // This matches Observable Plot's composition: stackY(stackOpts, groupX(groupOpts, markOpts))
  const transforms: Record<string, (outputs: Record<string, unknown>, options?: Record<string, unknown>) => Record<string, unknown>> = {
    group: Plot.group as never,
    groupX: Plot.groupX as never,
    groupY: Plot.groupY as never,
    groupZ: Plot.groupZ as never,
    binX: Plot.binX as never,
    binY: Plot.binY as never,
  };

  const stackTransforms: Record<string, (stackOptions: Record<string, unknown>, options?: Record<string, unknown>) => Record<string, unknown>> = {
    stackY: Plot.stackY as never,
    stackX: Plot.stackX as never,
  };

  // Phase 1: Apply group/bin transforms
  for (const [name, fn] of Object.entries(transforms)) {
    if (resolved[name] && typeof resolved[name] === "object") {
      const transformSpec = resolved[name] as Record<string, unknown>;
      const outputs = (transformSpec.outputs ?? transformSpec) as Record<string, unknown>;
      const rest = { ...resolved };
      delete rest[name];
      resolved = fn(outputs, rest);
      break; // only one group/bin transform per mark
    }
  }

  // Phase 2: Apply stack transforms on top of the result
  for (const [name, fn] of Object.entries(stackTransforms)) {
    if (resolved[name] && typeof resolved[name] === "object") {
      const stackSpec = resolved[name] as Record<string, unknown>;
      const stackOpts = (stackSpec.outputs ?? stackSpec) as Record<string, unknown>;
      const rest = { ...resolved };
      delete rest[name];
      resolved = fn(stackOpts, rest);
      break; // only one stack transform per mark
    }
  }

  return resolved;
}

/** Match a row value against a filter condition: exact equality, string prefix, array inclusion, or range operators. */
function matchesFilter(rowValue: unknown, filterValue: unknown): boolean {
  // Array: row value must match any element
  if (Array.isArray(filterValue)) {
    return filterValue.some((v) => matchesFilter(rowValue, v));
  }
  // Range operators: { $gte, $lte, $gt, $lt }
  if (filterValue !== null && typeof filterValue === "object" && !Array.isArray(filterValue)) {
    const ops = filterValue as Record<string, unknown>;
    const rv = rowValue as string | number;
    for (const [op, target] of Object.entries(ops)) {
      switch (op) {
        case "$gte": if (!(rv >= (target as string | number))) return false; break;
        case "$gt":  if (!(rv > (target as string | number))) return false; break;
        case "$lte": if (!(rv <= (target as string | number))) return false; break;
        case "$lt":  if (!(rv < (target as string | number))) return false; break;
        default: return false; // unknown operator
      }
    }
    return true;
  }
  // String prefix matching: filter "2024" matches "2024-01", "2024-06", etc.
  if (typeof filterValue === "string" && typeof rowValue === "string" && rowValue.length > filterValue.length) {
    return rowValue.startsWith(filterValue);
  }
  // Exact equality
  return rowValue === filterValue;
}

/** barY ALWAYS needs groupX; barX ALWAYS needs groupY. Auto-swap if the model got it backwards. */
function fixGroupDirection(markType: string, options: Record<string, unknown>): Record<string, unknown> {
  if (markType === "barY" && options.groupY && !options.groupX) {
    const groupY = options.groupY as Record<string, unknown>;
    const outputs = (groupY.outputs ?? groupY) as Record<string, unknown>;
    const fixed = { ...options };
    fixed.groupX = { outputs };
    delete fixed.groupY;
    return fixed;
  }
  if (markType === "barX" && options.groupX && !options.groupY) {
    const groupX = options.groupX as Record<string, unknown>;
    const outputs = (groupX.outputs ?? groupX) as Record<string, unknown>;
    const fixed = { ...options };
    fixed.groupY = { outputs };
    delete fixed.groupX;
    return fixed;
  }
  return options;
}

function buildMark(markSpec: MarkSpec, csvData: Record<string, unknown>[]): Plot.Mark {
  const { type, data, options = {} } = markSpec;

  const constructor = MARK_CONSTRUCTORS[type];
  if (!constructor) {
    throw new Error(`Unknown mark type: "${type}". Available: ${Object.keys(MARK_CONSTRUCTORS).join(", ")}`);
  }

  // Resolve data source
  let markData: unknown;
  if (NO_DATA_MARKS.has(type)) {
    markData = undefined;
  } else if (type === "ruleX" || type === "ruleY") {
    // Rules with options.values should always use the values array,
    // even if the model mistakenly set data: "csv"
    if (options.values && Array.isArray(options.values)) {
      const resolved = { ...options };
      delete resolved.values;
      delete resolved.filter; // Strip project-specific filter (not an Observable Plot option)
      delete resolved.melt;
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

  // Apply filter — keep only rows matching all filter conditions
  if (resolvedOptions.filter && typeof resolvedOptions.filter === "object" && Array.isArray(markData)) {
    const filters = resolvedOptions.filter as Record<string, unknown>;
    markData = (markData as Record<string, unknown>[]).filter((row) =>
      Object.entries(filters).every(([k, v]) => matchesFilter(row[k], v)),
    );
    delete resolvedOptions.filter;
  }

  // Auto-parse date strings in position channels so Plot creates temporal scales.
  // Collect all date columns first, then do a single pass to avoid multiple .map() copies.
  if (Array.isArray(markData) && markData.length > 0) {
    const first = markData[0] as Record<string, unknown>;
    const dateCols: string[] = [];
    for (const ch of ["x", "y", "x1", "x2"]) {
      const col = resolvedOptions[ch];
      if (typeof col === "string" && col in first) {
        const sample = first[col];
        if (typeof sample === "string" && /^\d{4}-\d{2}(-\d{2})?/.test(sample)) {
          dateCols.push(col);
        }
      }
    }
    if (dateCols.length > 0) {
      markData = (markData as Record<string, unknown>[]).map((row) => {
        const updated = { ...row };
        for (const col of dateCols) {
          const raw = updated[col] as string;
          // YYYY-MM → YYYY-MM-01 so Date constructor works correctly
          const dateStr = /^\d{4}-\d{2}$/.test(raw) ? raw + "-01" : raw;
          updated[col] = new Date(dateStr);
        }
        return updated;
      });
    }
  }

  // Apply default fill for marks that would otherwise render as plain black
  if (FILL_MARKS.has(type) && !resolvedOptions.fill) {
    resolvedOptions.fill = DEFAULT_FILL;
  }

  // Auto-enable tooltips on data marks when the model omits tip: true
  if (TIP_MARKS.has(type) && resolvedOptions.tip === undefined) {
    resolvedOptions.tip = true;
  }

  // Fix group direction: barY ALWAYS uses groupX, barX ALWAYS uses groupY.
  // Using the wrong direction (e.g. groupY on barY) renders stacked bars.
  const directionFixed = fixGroupDirection(type, resolvedOptions);

  return constructor(markData, resolveTransform(directionFixed));
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
  // ~6.5px per char at 13px font + extra space for the rotated y-axis label
  const hasYLabel = !!(spec.y as Record<string, unknown> | undefined)?.label;
  const labelPadding = hasYLabel ? 35 : 20;
  return Math.ceil(maxLen * 6.5) + labelPadding;
}

const ORDINAL_SEQUENCES: { order: string[]; minMatches: number }[] = [
  { order: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], minMatches: 6 },
  { order: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], minMatches: 6 },
  { order: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], minMatches: 5 },
  { order: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], minMatches: 5 },
];

/**
 * If x or y columns contain month/weekday names and no explicit domain is set,
 * auto-inject the correct chronological domain to prevent alphabetical sorting.
 */
function autoDetectOrdinalDomain(
  spec: ChartSpec,
  csvData: Record<string, unknown>[],
  plotOptions: Record<string, unknown>,
): void {
  if (csvData.length === 0) return;

  for (const ch of ["x", "y"] as const) {
    const scaleOpts = plotOptions[ch] as Record<string, unknown> | undefined;
    if (scaleOpts?.domain) continue; // explicit domain already set

    const field = spec.marks.find((m) => m.options?.[ch] && (m.data === "csv" || !m.data))?.options?.[ch];
    if (typeof field !== "string") continue;

    const vals = new Set(csvData.map((r) => String(r[field] ?? "")));

    for (const { order, minMatches } of ORDINAL_SEQUENCES) {
      const matching = order.filter((v) => vals.has(v));
      if (matching.length >= minMatches) {
        plotOptions[ch] = { ...scaleOpts, domain: matching };
        break;
      }
    }
  }
}

/** Check that data marks have the required x/y position channels. */
function validatePositionChannels(spec: ChartSpec, csvData: Record<string, unknown>[]): void {
  if (csvData.length === 0) return;
  const columns = Object.keys(csvData[0]);
  const numericCols = columns.filter((c) => typeof csvData[0][c] === "number");
  const categoricalCols = columns.filter((c) => typeof csvData[0][c] !== "number");

  const errors: string[] = [];

  for (const mark of spec.marks) {
    if (!NEEDS_XY.has(mark.type)) continue;
    const opts = mark.options ?? {};

    // Check if groupX/groupY/binX/binY computes a count (no source column needed)
    const groupX = opts.groupX as Record<string, unknown> | undefined;
    const groupY = opts.groupY as Record<string, unknown> | undefined;
    const yIsCount = groupX && ((groupX.outputs as Record<string, unknown>)?.y === "count" || (groupX as Record<string, unknown>).y === "count");
    const xIsCount = groupY && ((groupY.outputs as Record<string, unknown>)?.x === "count" || (groupY as Record<string, unknown>).x === "count");
    const hasBinX = !!opts.binX;
    const hasBinY = !!opts.binY;

    if (!opts.x && !X_OPTIONAL.has(mark.type) && !xIsCount && !hasBinY) {
      errors.push(`Mark "${mark.type}" is missing "x". Set it to a column name.`);
    }
    if (!opts.y && !Y_OPTIONAL.has(mark.type) && !yIsCount && !hasBinX) {
      errors.push(`Mark "${mark.type}" is missing "y". Set it to a column name.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `${errors.join("\n")}\nAvailable columns — categorical: ${categoricalCols.join(", ")}; numeric: ${numericCols.join(", ")}`,
    );
  }
}

/** Check that column names referenced in the spec actually exist in the CSV (or will be created by melt). */
function validateColumns(spec: ChartSpec, csvData: Record<string, unknown>[]): void {
  if (csvData.length === 0) return;
  const available = new Set(Object.keys(csvData[0]));
  const errors: string[] = [];

  for (const mark of spec.marks) {
    if (!mark.options) continue;
    const opts = mark.options;
    const melt = opts.melt as { columns?: string[]; key?: string; value?: string } | undefined;
    const meltCreated = new Set<string>();
    if (melt?.columns) {
      meltCreated.add(melt.key ?? "variable");
      meltCreated.add(melt.value ?? "value");
    }

    for (const ch of ["x", "y", "fx", "fy"]) {
      const val = opts[ch];
      if (typeof val === "string" && !available.has(val) && !meltCreated.has(val)) {
        errors.push(`Mark "${mark.type}" references column "${val}" for ${ch}`);
      }
    }
    // fill/stroke can be color strings — only flag if it looks like a column name (no # or css color)
    for (const ch of ["fill", "stroke"]) {
      const val = opts[ch];
      if (typeof val === "string" && !available.has(val) && !meltCreated.has(val)) {
        if (!/^(#|rgb|hsl|transparent|none|currentColor)/i.test(val) && !/^[a-z]{3,20}$/i.test(val)) {
          errors.push(`Mark "${mark.type}" references column "${val}" for ${ch}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Chart spec references columns not in the CSV:\n${errors.join("\n")}\nAvailable columns: ${Array.from(available).join(", ")}\nIf the data is wide-format, use the melt transform to reshape it first.`,
    );
  }
}

/** Check that fx/fy faceting is in mark options, not only at top level. */
function validateFaceting(spec: ChartSpec): void {
  for (const ch of ["fx", "fy"] as const) {
    const topLevel = spec[ch] as Record<string, unknown> | undefined;
    if (!topLevel) continue;
    const anyMarkHasFacet = spec.marks.some((m) => !NO_DATA_MARKS.has(m.type) && m.options?.[ch]);
    if (!anyMarkHasFacet) {
      throw new Error(
        `${ch} scale is configured at top level but no mark has "${ch}" in its options. Add "${ch}": "fieldName" inside the mark's options object to enable faceting.`,
      );
    }
  }
}

export function specToPlot(spec: ChartSpec, csvData: Record<string, unknown>[]): HTMLElement | SVGSVGElement {
  // Validate spec before building marks — gives model actionable errors on retry
  validatePositionChannels(spec, csvData);
  validateColumns(spec, csvData);
  validateFaceting(spec);

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

  // Auto-enable color legend when fill references a data column (not a CSS color)
  if (!spec.color?.legend && csvData.length > 0) {
    const hasFillColumn = spec.marks.some((m) => {
      const fill = m.options?.fill;
      return typeof fill === "string" && fill in csvData[0];
    });
    if (hasFillColumn) {
      (plotOptions.color as Record<string, unknown>).legend = true;
    }
  }

  plotOptions.y = resolveScaleOptions({ ...CHART_DEFAULTS.y, ...(spec.y ?? {}) });

  if (spec.x) plotOptions.x = resolveScaleOptions(spec.x as Record<string, unknown>);
  if (spec.fx) plotOptions.fx = resolveScaleOptions(spec.fx as Record<string, unknown>);
  if (spec.fy) plotOptions.fy = resolveScaleOptions(spec.fy as Record<string, unknown>);
  plotOptions.marginBottom = spec.marginBottom ?? CHART_DEFAULTS.marginBottom;
  if (spec.marginTop) plotOptions.marginTop = spec.marginTop;
  if (spec.marginRight) plotOptions.marginRight = spec.marginRight;
  plotOptions.marginLeft = spec.marginLeft ?? estimateMarginLeft(spec, csvData);

  // Auto-detect month/weekday names and set ordinal domain if not explicitly provided
  autoDetectOrdinalDomain(spec, csvData, plotOptions);

  // Auto-force band scale for cell marks with numeric position channels
  // Cell marks draw rectangles on band scales; numeric values default to quantitative (zero-width cells).
  const hasCell = spec.marks.some((m) => m.type === "cell");
  if (hasCell && csvData.length > 0) {
    for (const ch of ["x", "y"] as const) {
      const col = spec.marks.find((m) => m.type === "cell")?.options?.[ch];
      if (typeof col === "string" && typeof csvData[0][col] === "number") {
        const scale = ((plotOptions[ch] as Record<string, unknown>) ?? {});
        if (!scale.type) {
          scale.type = "band";
          plotOptions[ch] = scale;
        }
      }
    }
  }

  // Auto-suppress default axis when an explicit axis mark replaces it
  const hasAxisX = spec.marks.some((m) => m.type === "axisX");
  const hasAxisY = spec.marks.some((m) => m.type === "axisY");
  const hasFx = spec.marks.some((m) => m.options?.fx) || !!spec.fx;
  const hasFy = spec.marks.some((m) => m.options?.fy) || !!spec.fy;

  if (hasAxisX) {
    if (!plotOptions.x) plotOptions.x = {};
    if ((plotOptions.x as Record<string, unknown>).axis === undefined) {
      (plotOptions.x as Record<string, unknown>).axis = null;
    }
  }
  if (hasAxisY) {
    if (!plotOptions.y) plotOptions.y = {};
    if ((plotOptions.y as Record<string, unknown>).axis === undefined) {
      (plotOptions.y as Record<string, unknown>).axis = null;
    }
  }

  // Safety: don't suppress axes unless explicit axis marks or fx faceting replace them
  if (plotOptions.x && (plotOptions.x as Record<string, unknown>).axis === null && !hasAxisX && !hasFx) {
    delete (plotOptions.x as Record<string, unknown>).axis;
  }
  if (plotOptions.y && (plotOptions.y as Record<string, unknown>).axis === null && !hasAxisY && !hasFy) {
    delete (plotOptions.y as Record<string, unknown>).axis;
  }

  // Auto-increase marginBottom when axisX has rotated ticks
  if (hasAxisX && !spec.marginBottom) {
    const axisXMark = spec.marks.find((m) => m.type === "axisX");
    const tickRotate = axisXMark?.options?.tickRotate;
    if (typeof tickRotate === "number" && Math.abs(tickRotate) >= 20) {
      plotOptions.marginBottom = Math.max(
        (plotOptions.marginBottom as number) ?? 45,
        80,
      );
    }
  }

  // Auto-limit ticks for temporal axes to prevent date label overlap
  if (!hasAxisX) {
    const xCol = spec.marks.find((m) => m.options?.x)?.options?.x;
    if (typeof xCol === "string" && csvData.length > 0) {
      const sample = csvData[0][xCol];
      const isDate = sample instanceof Date || (typeof sample === "string" && /^\d{4}-\d{2}(-\d{2})?/.test(sample));
      if (isDate) {
        const xScale = ((plotOptions.x as Record<string, unknown>) ?? {});
        if (!xScale.ticks) {
          const uniqueDates = new Set(csvData.map((r) => String(r[xCol]))).size;
          if (uniqueDates > 15) {
            xScale.ticks = Math.min(10, Math.ceil(uniqueDates / 3));
            plotOptions.x = xScale;
          }
        }
      }
    }
  }

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
