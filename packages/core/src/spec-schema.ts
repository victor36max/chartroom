import { z } from "zod";

export const encodingChannelSchema = z.record(z.string(), z.unknown())
  .describe("Vega-Lite encoding channel: { field, type (quantitative/nominal/ordinal/temporal), aggregate, bin, timeUnit, scale, axis, legend, sort, stack, title, tooltip, ... }");

export const vlMarkSchema = z.union([
  z.string().describe("Mark type: bar, line, area, point, rect, rule, text, tick, arc, boxplot, errorbar, errorband, trail, square, circle"),
  z.object({ type: z.string() }).loose().describe("Mark with properties: { type, tooltip, opacity, ... }"),
]);

export const vlUnitSchema: z.ZodType = z.lazy(() => z.object({
  data: z.object({ url: z.string() }).optional(),
  mark: vlMarkSchema.optional(),
  encoding: z.record(z.string(), encodingChannelSchema).optional(),
  transform: z.array(z.record(z.string(), z.unknown())).optional(),
  layer: z.array(vlUnitSchema).optional(),
  title: z.union([z.string(), z.object({ text: z.string(), subtitle: z.string().optional() }).loose()]).optional(),
  width: z.union([z.number(), z.literal("container")]).optional(),
  height: z.union([z.number(), z.literal("container")]).optional(),
}));

/**
 * Create a top-level Vega-Lite spec schema.
 * Accepts optional dataset names for the data description.
 */
export function createVlSpecSchema(datasetNames?: string[]) {
  const dataDesc = datasetNames && datasetNames.length > 0
    ? `Use { url: "<filename>" } to reference a dataset. Available: ${datasetNames.join(", ")}`
    : 'Use { url: "<filename>" } to reference the uploaded dataset';

  return z.object({
    data: z.object({ url: z.string() }).optional().describe(dataDesc),
    mark: vlMarkSchema.optional(),
    encoding: z.record(z.string(), encodingChannelSchema).optional().describe("Encoding channels: x, y, color, size, shape, opacity, theta, radius, text, tooltip, row, column, facet, detail, order"),
    transform: z.array(z.record(z.string(), z.unknown())).optional().describe("Array of transforms: filter, calculate, fold, aggregate, bin, window, lookup, flatten, pivot, regression, loess, density"),
    layer: z.array(vlUnitSchema).optional().describe("Array of layered specs (each with mark + encoding)"),
    hconcat: z.array(vlUnitSchema).optional().describe("Array of specs displayed horizontally side-by-side"),
    vconcat: z.array(vlUnitSchema).optional().describe("Array of specs stacked vertically"),
    facet: z.record(z.string(), z.unknown()).optional().describe("Facet field for small multiples"),
    repeat: z.unknown().optional().describe("Repeat spec for repeated views"),
    spec: vlUnitSchema.optional().describe("Inner spec for facet/repeat"),
    resolve: z.record(z.string(), z.unknown()).optional().describe("Resolve shared/independent scales across layers/facets"),
    title: z.union([z.string(), z.object({ text: z.string(), subtitle: z.string().optional() }).loose()]).optional(),
    width: z.union([z.number(), z.literal("container")]).optional(),
    height: z.union([z.number(), z.literal("container")]).optional(),
  });
}

/** Default schema (no dataset names) */
export const vlSpecSchema = createVlSpecSchema();
