import { tool } from "ai";
import { z } from "zod";
import { analyzeData } from "./data-analyzer";
import { TOPIC_IDS, lookupDocs, type TopicId } from "@/lib/docs/plot-docs";

const markSpecSchema = z.object({
  type: z.string().describe("The mark type: arc, barY, barX, dot, line, lineY, lineX, areaY, areaX, cell, rect, rectX, rectY, text, tickX, tickY, ruleX, ruleY, frame, tip, axisX, axisY, axisFx, axisFy"),
  data: z.string().optional().describe('Use "csv" to reference the uploaded dataset'),
  options: z.record(z.string(), z.unknown()).optional().describe("Mark options: x, y, fill, stroke, tip, filter, transforms (groupX, binX, stackY, melt), etc."),
});

const chartSpecSchema = z.object({
  marks: z.array(markSpecSchema).describe("Array of mark specifications"),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  color: z.record(z.string(), z.unknown()).optional(),
  x: z.record(z.string(), z.unknown()).optional(),
  y: z.record(z.string(), z.unknown()).optional(),
  fx: z.record(z.string(), z.unknown()).optional(),
  fy: z.record(z.string(), z.unknown()).optional(),
  marginTop: z.number().optional(),
  marginRight: z.number().optional(),
  marginBottom: z.number().optional(),
  marginLeft: z.number().optional(),
  style: z.record(z.string(), z.unknown()).optional().describe("Global CSS styles for the SVG, e.g. { fontFamily: 'sans-serif', background: '#f5f5f5' }. For font size use axisX/axisY marks instead."),
  titleStyle: z.record(z.string(), z.unknown()).optional().describe("Inline CSS styles applied only to the title element, e.g. { fontWeight: 'bold', fontSize: '20px', color: '#333' }"),
  subtitleStyle: z.record(z.string(), z.unknown()).optional().describe("Inline CSS styles applied only to the subtitle element, e.g. { fontSize: '14px', color: '#666' }"),
});

export function createTools(csvData: Record<string, unknown>[] | undefined) {
  return {
    render_chart: tool({
      description:
        "Render a chart using Observable Plot. The chart will be displayed to the user and a screenshot will be returned for you to evaluate. Always use this tool to create or update charts.",
      inputSchema: z.object({
        spec: chartSpecSchema.describe("The Observable Plot chart specification"),
        title: z.string().optional().describe("Chart title"),
        description: z.string().optional().describe("Brief description of the chart for the user"),
      }),
      // No execute — this is a client-side tool
    }),

    analyze_data: tool({
      description:
        "Analyze the CSV data to answer questions about it. Use this before creating charts when you need to understand the data structure, distributions, or compute aggregations. Returns computed results.",
      inputSchema: z.object({
        query: z.string().describe("Natural language query about the data, e.g. 'top 5 values in revenue column' or 'statistics for all columns'"),
      }),
      execute: async ({ query }) => {
        if (!csvData || csvData.length === 0) {
          return { error: "No CSV data available" };
        }
        return analyzeData(csvData, query);
      },
    }),

    lookup_docs: tool({
      description:
        "Look up Observable Plot documentation for specific topics. " +
        "Use when you need details about a mark type, transform, scale, or styling option. " +
        "Available topics: " +
        "arc (pie/donut), bar (barX/barY), dot (scatter/bubble), line, area, " +
        "cell (heatmap), rect (histogram), text (labels), tick (strip plot), rule (reference lines), " +
        "frame, tip (tooltips), axis (custom axes), group (groupX/groupY aggregation), " +
        "bin (histogram binning), stack (stackY/stackX), color-scale, position-scales (x/y), " +
        "faceting (fx/fy small multiples), styling, melt (wide-to-long reshape), " +
        "filter (row selection), layout-patterns (stacked vs grouped vs horizontal), " +
        "composite-patterns (lollipop, value labels, Pareto, strip plot, rotated labels), " +
        "editing-charts (multi-turn modifications: flipping, sorting, labels, reference lines)",
      inputSchema: z.object({
        topics: z
          .array(z.enum(TOPIC_IDS))
          .min(1)
          .max(3)
          .describe("Topic(s) to look up, max 3"),
      }),
      execute: async ({ topics }) => {
        return { documentation: lookupDocs(topics as TopicId[]) };
      },
    }),
  };
}
