import * as d3 from "d3";
import type { ChartSpec, MarkSpec } from "@/types";

const SCHEME_MAP: Record<string, readonly string[]> = {
  tableau10: d3.schemeTableau10,
  category10: d3.schemeCategory10,
  accent: d3.schemeAccent,
  dark2: d3.schemeDark2,
  paired: d3.schemePaired,
  pastel1: d3.schemePastel1,
  pastel2: d3.schemePastel2,
  set1: d3.schemeSet1,
  set2: d3.schemeSet2,
  set3: d3.schemeSet3,
  observable10: d3.schemeObservable10,
};

function resolveColors(opts: Record<string, unknown>, spec: ChartSpec): readonly string[] {
  // Explicit fill array takes priority
  if (Array.isArray(opts.fill)) return opts.fill as string[];
  // Then spec.color.scheme
  const schemeName = ((spec.color as Record<string, unknown>)?.scheme as string) ?? "tableau10";
  return SCHEME_MAP[schemeName.toLowerCase()] ?? d3.schemeTableau10;
}

const ARC_DEFAULTS = {
  stroke: "white",
  strokeWidth: 1.5,
  opacity: 1,
  padAngle: 0,
  cornerRadius: 0,
  startAngle: 0,
  endAngle: 2 * Math.PI,
  sort: null as string | null,
  padding: 30,
  aggregate: true,
  fontSize: "11px",
  labelFill: "white",
  labelThreshold: 5,
  labelRadius: 0.65,
  labelFormat: "name",
};

export interface ArcLegendInfo {
  labels: string[];
  colors: string[];
}

function opt<T>(opts: Record<string, unknown>, key: string, fallback: T): T {
  return (opts[key] as T) ?? fallback;
}

export function renderPieChart(
  arcSpec: MarkSpec,
  csvData: Record<string, unknown>[],
  spec: ChartSpec,
  width: number,
  height: number
): { node: SVGGElement; legend: ArcLegendInfo } {
  const opts = arcSpec.options ?? {};
  const valueField = opts.value as string;
  const labelField = opts.label as string;

  if (!valueField || !labelField) {
    throw new Error('Arc mark requires options.value (numeric field) and options.label (category field)');
  }

  // Destructure all options with defaults
  const innerRadius = Math.max(0, opt(opts, "innerRadius", 0));
  const stroke = opt(opts, "stroke", ARC_DEFAULTS.stroke);
  const strokeWidth = opt(opts, "strokeWidth", ARC_DEFAULTS.strokeWidth);
  const opacity = opt(opts, "opacity", ARC_DEFAULTS.opacity);
  const padAngle = opt(opts, "padAngle", ARC_DEFAULTS.padAngle);
  const cornerRadius = opt(opts, "cornerRadius", ARC_DEFAULTS.cornerRadius);
  const startAngle = opt(opts, "startAngle", ARC_DEFAULTS.startAngle);
  const endAngle = opt(opts, "endAngle", ARC_DEFAULTS.endAngle);
  const sortMode = opt(opts, "sort", ARC_DEFAULTS.sort);
  const padding = opt(opts, "padding", ARC_DEFAULTS.padding);
  const aggregate = opt(opts, "aggregate", ARC_DEFAULTS.aggregate);
  const fontSize = opt(opts, "fontSize", ARC_DEFAULTS.fontSize);
  const labelFill = opt(opts, "labelFill", ARC_DEFAULTS.labelFill);
  const labelThreshold = opt(opts, "labelThreshold", ARC_DEFAULTS.labelThreshold);
  const labelRadius = opt(opts, "labelRadius", ARC_DEFAULTS.labelRadius);
  const labelFormat = opt(opts, "labelFormat", ARC_DEFAULTS.labelFormat);
  const colors = resolveColors(opts, spec);

  // Data: aggregate or use raw
  const data = aggregate
    ? Array.from(
        d3.rollup(csvData, (rows) => d3.sum(rows, (r) => Number(r[valueField]) || 0), (r) => String(r[labelField] ?? ""))
      ).map(([label, value]) => ({ [labelField]: label, [valueField]: value }))
    : csvData;

  const radius = Math.max(0, Math.min(width, height) / 2 - padding);
  const cx = width / 2;
  const cy = height / 2;

  const root = d3.create("svg:g");

  // Compute pie layout
  const pie = d3
    .pie<Record<string, unknown>>()
    .value((d) => Number(d[valueField]) || 0)
    .startAngle(startAngle)
    .endAngle(endAngle)
    .padAngle(padAngle);

  // Sort control
  if (sortMode === "value-asc") {
    pie.sort((a, b) => (Number(a[valueField]) || 0) - (Number(b[valueField]) || 0));
  } else if (sortMode === "value-desc") {
    pie.sort((a, b) => (Number(b[valueField]) || 0) - (Number(a[valueField]) || 0));
  } else if (sortMode === "label-asc") {
    pie.sort((a, b) => String(a[labelField] ?? "").localeCompare(String(b[labelField] ?? "")));
  } else if (sortMode === "label-desc") {
    pie.sort((a, b) => String(b[labelField] ?? "").localeCompare(String(a[labelField] ?? "")));
  } else {
    pie.sort(null);
  }

  const arcGen = d3
    .arc<d3.PieArcDatum<Record<string, unknown>>>()
    .innerRadius(innerRadius)
    .outerRadius(radius)
    .cornerRadius(cornerRadius);

  const labelArc = d3
    .arc<d3.PieArcDatum<Record<string, unknown>>>()
    .innerRadius(radius * labelRadius)
    .outerRadius(radius * labelRadius);

  const total = d3.sum(data, (d) => Number(d[valueField]) || 0);
  const arcs = pie(data);

  const g = root.append("g").attr("transform", `translate(${cx},${cy})`);

  // Slices
  g.selectAll<SVGPathElement, d3.PieArcDatum<Record<string, unknown>>>("path")
    .data(arcs)
    .join("path")
    .attr("d", arcGen)
    .attr("fill", (_, i) => colors[i % colors.length])
    .attr("stroke", stroke)
    .attr("stroke-width", strokeWidth)
    .attr("opacity", opacity)
    .each(function (d) {
      // Native SVG tooltip
      const value = Number(d.data[valueField]) || 0;
      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
      const label = d.data[labelField] ?? "";
      d3.select(this)
        .append("title")
        .text(`${label}: ${value.toLocaleString()} (${pct}%)`);
    });

  // Slice labels (only show if slice is big enough)
  g.selectAll<SVGTextElement, d3.PieArcDatum<Record<string, unknown>>>("text.label")
    .data(arcs)
    .join("text")
    .attr("class", "label")
    .attr("transform", (d) => `translate(${labelArc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .attr("font-size", fontSize)
    .attr("fill", labelFill)
    .attr("pointer-events", "none")
    .text((d) => {
      const value = Number(d.data[valueField]) || 0;
      const pct = total > 0 ? (value / total) * 100 : 0;
      if (pct < labelThreshold) return "";
      const name = String(d.data[labelField] ?? "");
      const pctStr = `${pct.toFixed(0)}%`;
      switch (labelFormat) {
        case "percent": return pctStr;
        case "value": return value.toLocaleString();
        case "name-percent": return `${name} (${pctStr})`;
        default: return name;
      }
    });

  const legendLabels = data.map((d) => String(d[labelField]));
  const legendColors = legendLabels.map((_, i) => colors[i % colors.length]);

  return {
    node: root.node() as SVGGElement,
    legend: { labels: legendLabels, colors: legendColors },
  };
}
