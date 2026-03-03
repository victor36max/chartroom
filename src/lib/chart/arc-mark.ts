import * as d3 from "d3";
import type { ChartSpec, MarkSpec } from "@/types";

const COLORS = d3.schemeTableau10;

export function renderPieChart(
  arcSpec: MarkSpec,
  csvData: Record<string, unknown>[],
  spec: ChartSpec
): SVGSVGElement {
  const opts = arcSpec.options ?? {};
  const valueField = opts.value as string;
  const labelField = opts.label as string;

  if (!valueField || !labelField) {
    throw new Error('Arc mark requires options.value (numeric field) and options.label (category field)');
  }

  const innerRadius = Math.max(0, (opts.innerRadius as number) ?? 0);

  // Aggregate: group by labelField, sum valueField
  const aggregated = Array.from(
    d3.rollup(csvData, (rows) => d3.sum(rows, (r) => Number(r[valueField]) || 0), (r) => String(r[labelField] ?? ""))
  ).map(([label, value]) => ({ [labelField]: label, [valueField]: value }));

  const width = (spec.width as number) ?? 500;
  const height = (spec.height as number) ?? 400;
  const titleHeight = spec.title ? 28 : 0;
  const subtitleHeight = spec.subtitle ? 20 : 0;
  const headerHeight = titleHeight + subtitleHeight;

  // Chart area dimensions
  const chartHeight = height - headerHeight;
  const radius = Math.max(0, Math.min(width, chartHeight) / 2 - 30);
  const cx = width / 2;
  const cy = headerHeight + chartHeight / 2;

  // SVG root
  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .style("font-family", "system-ui, sans-serif")
    .style("overflow", "visible");

  // Apply spec styles
  if (spec.style) {
    for (const [k, v] of Object.entries(spec.style)) {
      svg.style(k, v as string);
    }
  }

  // Title
  if (spec.title) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", "#1a1a1a")
      .text(spec.title);
  }

  // Subtitle
  if (spec.subtitle) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", titleHeight + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text(spec.subtitle);
  }

  // Compute pie layout
  const pie = d3
    .pie<Record<string, unknown>>()
    .value((d) => Number(d[valueField]) || 0)
    .sort(null);

  const arcGen = d3
    .arc<d3.PieArcDatum<Record<string, unknown>>>()
    .innerRadius(innerRadius)
    .outerRadius(radius);

  const labelArc = d3
    .arc<d3.PieArcDatum<Record<string, unknown>>>()
    .innerRadius(radius * 0.65)
    .outerRadius(radius * 0.65);

  const total = d3.sum(aggregated, (d) => Number(d[valueField]) || 0);
  const arcs = pie(aggregated);

  const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

  // Slices
  g.selectAll<SVGPathElement, d3.PieArcDatum<Record<string, unknown>>>("path")
    .data(arcs)
    .join("path")
    .attr("d", arcGen)
    .attr("fill", (_, i) => COLORS[i % COLORS.length])
    .attr("stroke", "white")
    .attr("stroke-width", 1.5)
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
    .attr("font-size", "11px")
    .attr("fill", "white")
    .attr("pointer-events", "none")
    .text((d) => {
      const pct = total > 0 ? (((Number(d.data[valueField]) || 0) / total) * 100) : 0;
      return pct >= 5 ? String(d.data[labelField] ?? "") : "";
    });

  return svg.node() as SVGSVGElement;
}
