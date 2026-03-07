import { tool } from "ai";
import { z } from "zod";
import { TOPIC_IDS, lookupDocs, type TopicId } from "@/lib/docs/vl-docs";

// Encoding channel schema — field, type, aggregate, bin, etc.
const encodingChannelSchema = z.record(z.string(), z.unknown())
  .describe("Vega-Lite encoding channel: { field, type (quantitative/nominal/ordinal/temporal), aggregate, bin, timeUnit, scale, axis, legend, sort, stack, title, tooltip, ... }");

const vlMarkSchema = z.union([
  z.string().describe("Mark type: bar, line, area, point, rect, rule, text, tick, arc, boxplot, errorbar, errorband, trail, square, circle"),
  z.object({ type: z.string() }).passthrough().describe("Mark with properties: { type, tooltip, opacity, ... }"),
]);

const vlUnitSchema: z.ZodType = z.lazy(() => z.object({
  data: z.object({ name: z.literal("csv") }).optional(),
  mark: vlMarkSchema.optional(),
  encoding: z.record(z.string(), encodingChannelSchema).optional(),
  transform: z.array(z.record(z.string(), z.unknown())).optional(),
  layer: z.array(vlUnitSchema).optional(),
  title: z.union([z.string(), z.object({ text: z.string() }).passthrough()]).optional(),
  width: z.union([z.number(), z.literal("container")]).optional(),
  height: z.union([z.number(), z.literal("container")]).optional(),
}));

const vlSpecSchema = z.object({
  data: z.object({ name: z.literal("csv") }).optional().describe('Use { name: "csv" } to reference the uploaded dataset'),
  mark: vlMarkSchema.optional(),
  encoding: z.record(z.string(), encodingChannelSchema).optional().describe("Encoding channels: x, y, color, size, shape, opacity, theta, radius, text, tooltip, row, column, facet, detail, order"),
  transform: z.array(z.record(z.string(), z.unknown())).optional().describe("Array of transforms: filter, calculate, fold, aggregate, bin, window, lookup, flatten, pivot, regression, loess, density"),
  layer: z.array(vlUnitSchema).optional().describe("Array of layered specs (each with mark + encoding)"),
  facet: z.record(z.string(), z.unknown()).optional().describe("Facet field for small multiples"),
  repeat: z.unknown().optional().describe("Repeat spec for repeated views"),
  spec: vlUnitSchema.optional().describe("Inner spec for facet/repeat"),
  resolve: z.record(z.string(), z.unknown()).optional().describe("Resolve shared/independent scales across layers/facets"),
  title: z.union([z.string(), z.object({ text: z.string() }).passthrough()]).optional(),
  width: z.union([z.number(), z.literal("container")]).optional(),
  height: z.union([z.number(), z.literal("container")]).optional(),
  // NO config, NO $schema, NO background, NO padding, NO autosize
});

export function createTools() {
  return {
    render_chart: tool({
      description:
        "Render a chart using Vega-Lite. The chart will be displayed to the user and a screenshot will be returned for you to evaluate. Always use this tool to create or update charts.",
      inputSchema: z.object({
        spec: vlSpecSchema.describe("The Vega-Lite chart specification"),
        title: z.string().optional().describe("Chart title"),
        description: z.string().optional().describe("Brief description of the chart for the user"),
      }),
      // No execute — this is a client-side tool
    }),

    lookup_docs: tool({
      description:
        "Look up Vega-Lite documentation for specific topics. " +
        "Use when you need details about a mark type, encoding, transform, or composition. " +
        "Available topics: " +
        "bar, line, area, point, rect, rule, text, tick, arc, boxplot, " +
        "encoding (channels and types), aggregate (aggregate/bin/timeUnit), " +
        "stack, fold (wide-to-long reshape), filter (includes top/bottom N with window), calculate, " +
        "layer (multi-mark), facet (small multiples), repeat, " +
        "color-scale, position-scales, styling, " +
        "layout-patterns (stacked/grouped/horizontal), composite-patterns (lollipop/pareto/dual-axis/trend-line), editing-charts",
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
