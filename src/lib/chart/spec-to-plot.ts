import * as Plot from "@observablehq/plot";
import type { ChartSpec, MarkSpec } from "@/types";
import { renderPieChart } from "./arc-mark";

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
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  // Detect arrow functions or regular function expressions emitted by the AI
  if (trimmed.includes("=>") || trimmed.startsWith("function")) {
    try {
      // eslint-disable-next-line no-new-func
      return new Function(`return ${trimmed}`)();
    } catch {
      return undefined; // fall back to Plot's default formatting
    }
  }
  return value;
}

function resolveScaleOptions(options: Record<string, unknown>): Record<string, unknown> {
  if (!options || typeof options !== "object") return options;
  const resolved = { ...options };
  if ("tickFormat" in resolved) resolved.tickFormat = resolveFormatOption(resolved.tickFormat);
  if ("format" in resolved) resolved.format = resolveFormatOption(resolved.format);
  return resolved;
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
  let markData: unknown;
  if (type === "frame") {
    markData = undefined;
  } else if (type === "ruleX" || type === "ruleY") {
    // Rules can take array of values directly
    markData = data === "csv" ? csvData : (options.values ?? [0]);
    if (markData === options.values) {
      const resolved = { ...options };
      delete resolved.values;
      return constructor(markData, resolveTransform(resolved));
    }
  } else {
    markData = data === "csv" ? csvData : csvData;
  }

  return constructor(markData, resolveTransform(options));
}

export function specToPlot(spec: ChartSpec, csvData: Record<string, unknown>[]): HTMLElement | SVGSVGElement {
  // Pie/donut charts use a standalone D3 renderer — Observable Plot has no arc mark
  const arcMark = spec.marks.find((m) => m.type === "arc");
  if (arcMark) {
    return renderPieChart(arcMark, csvData, spec);
  }

  const marks = spec.marks.map((m) => buildMark(m, csvData));

  const plotOptions: Record<string, unknown> = { marks };

  if (spec.title) plotOptions.title = spec.title;
  if (spec.subtitle) plotOptions.subtitle = spec.subtitle;
  if (spec.width) plotOptions.width = spec.width;
  if (spec.height) plotOptions.height = spec.height;
  if (spec.color) plotOptions.color = resolveScaleOptions(spec.color as Record<string, unknown>);
  if (spec.x) plotOptions.x = resolveScaleOptions(spec.x as Record<string, unknown>);
  if (spec.y) plotOptions.y = resolveScaleOptions(spec.y as Record<string, unknown>);
  if (spec.fx) plotOptions.fx = resolveScaleOptions(spec.fx as Record<string, unknown>);
  if (spec.fy) plotOptions.fy = resolveScaleOptions(spec.fy as Record<string, unknown>);
  if (spec.marginTop) plotOptions.marginTop = spec.marginTop;
  if (spec.marginRight) plotOptions.marginRight = spec.marginRight;
  if (spec.marginBottom) plotOptions.marginBottom = spec.marginBottom;
  if (spec.marginLeft) plotOptions.marginLeft = spec.marginLeft;
  if (spec.style) plotOptions.style = spec.style;

  const result = Plot.plot(plotOptions);

  if (spec.titleStyle) {
    const h2 = result instanceof HTMLElement ? result.querySelector("h2") : null;
    if (h2) Object.assign(h2.style, spec.titleStyle);
  }

  return result;
}
